import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { ensureDatabaseInitialized } from '../services/dbSeedSync';
import { getCurrentUserIdentity } from '../utils/userSession';
import {
  getMealPassFromNeon,
  upsertMealPassInNeon,
  getActiveBookingFromNeon,
  createBookingInNeon,
  updateBookingStatusInNeon,
  attemptAtomicRefundInNeon,
  getMealHistoryFromNeon,
  insertMealHistoryItemInNeon,
} from '../services/neon';
import {
  getISTDate,
  getISTDateString,
  getISTCurrentDecimalHours,
  formatToIST,
} from '../utils/timeUtils';

export interface BookingDetails {
  bookingId: string;
  messId: string;
  messName: string;
  messAddress: string;
  mealType: 'Lunch' | 'Dinner';
  menuHighlights: string[];
  otp: string;
  otpExpiresAt: string;
  status: 'booked' | 'verified' | 'completed' | 'skipped' | 'cancelled';
  bookedAt: string;
  cutoffTime: string;
}

export interface MealHistoryItem {
  id: string;
  messName: string;
  mealType: 'Lunch' | 'Dinner';
  status: 'completed' | 'skipped' | 'no-show' | 'cancelled' | 'refunded';
  tokensUsed: number;
  date: string;
  messAddress?: string;
  menuHighlights?: string[];
  cutoffTime?: string;
  otp?: string;
}

export type PlanType = 'single' | 'double' | 'none';

interface TokenContextType {
  totalTokens: number;
  remainingTokens: number;
  totalSkips: number;
  remainingSkips: number;
  streakDays: number;
  highestStreakDays: number;
  subscriptionPlan: string;
  planType: PlanType;
  planExpiresAt: string | null;
  isGracePeriod: boolean;
  activeBooking: BookingDetails | null;
  shortlistedMessIds: string[];
  mealHistory: MealHistoryItem[];
  loading: boolean;
  bookMeal: (
    messId: string,
    messName: string,
    messAddress: string,
    mealType: 'Lunch' | 'Dinner',
    menuHighlights: string[]
  ) => Promise<{ success: boolean; message?: string }>;
  cancelBooking: () => Promise<{ success: boolean; message: string; reason?: string }>;
  expireBooking: () => Promise<void>;
  completeBooking: () => Promise<void>;
  skipMeal: () => Promise<{ success: boolean; message?: string }>;
  toggleShortlistMess: (messId: string) => void;
  addToShortlist: (messId: string) => void;
  removeFromShortlist: (messId: string) => void;
  isShortlisted: (messId: string) => boolean;
  buyExtraSkips: (count: number, amountPaid: number) => Promise<void>;
  buyPassPlan: (
    planName: string,
    tokens: number,
    skips: number,
    validityDays?: number,
    planType?: PlanType
  ) => Promise<void>;
  invalidatedOTPs: string[];
  isOTPValid: (otp: string) => boolean;
  refreshState: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN_STATE: 'mealhop_token_state',
  ACTIVE_BOOKING: 'mealhop_active_booking',
  SHORTLIST: 'mealhop_shortlist',
  HISTORY: 'mealhop_meal_history',
  INVALIDATED_OTPS: 'mealhop_invalidated_otps',
};

const INITIAL_TOKEN_STATE = {
  totalTokens: 0,
  remainingTokens: 0,
  totalSkips: 0,
  remainingSkips: 0,
  streakDays: 0,
  highestStreakDays: 0,
  subscriptionPlan: 'No Active Subscription',
  planType: 'none' as PlanType,
  planExpiresAt: null as string | null,
  lastLunchCutoffDate: '',
  lastDinnerCutoffDate: '',
  lastDailyCutoffDate: '',
};

const getCurrentUserId = async (): Promise<string> => {
  const user = await getCurrentUserIdentity();
  return user.userId;
};

const getScopedKey = (baseKey: string, userId: string) => {
  return `${baseKey}_${userId}`;
};

export function expandHistoryWithRefundPairs(items: MealHistoryItem[]): MealHistoryItem[] {
  const result: MealHistoryItem[] = [];
  const seenAutoSkips = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Clean up duplicate auto-skip or expiration items on the same day & meal slot
    if (
      item.status === 'skipped' ||
      item.messName.includes('Skip Pass Auto-Used') ||
      item.messName.includes('Token Expired')
    ) {
      const dateDay = (item.date || '').split(',')[0].trim();
      const skipKey = `${dateDay}_${item.mealType || 'Daily'}_${item.status}`;
      if (seenAutoSkips.has(skipKey)) {
        continue; // skip duplicate record
      }
      seenAutoSkips.add(skipKey);
    }

    if (item.status === 'cancelled' || item.status === 'refunded' || item.tokensUsed < 0) {
      result.push({
        ...item,
        status: 'cancelled',
        tokensUsed: -1,
      });

      const hasDebitPair = items.some(
        (other, idx) =>
          idx !== i &&
          other.messName === item.messName &&
          other.mealType === item.mealType &&
          (other.tokensUsed > 0 || other.status === 'completed')
      );

      if (!hasDebitPair) {
        result.push({
          id: `${item.id}_debit`,
          messName: item.messName,
          mealType: item.mealType,
          status: 'completed',
          tokensUsed: 1,
          date: item.date,
          menuHighlights: item.menuHighlights,
          cutoffTime: item.cutoffTime,
        });
      }
    } else {
      result.push(item);
    }
  }

  return result;
}

export const TokenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [totalTokens, setTotalTokens] = useState<number>(INITIAL_TOKEN_STATE.totalTokens);
  const [remainingTokens, setRemainingTokens] = useState<number>(INITIAL_TOKEN_STATE.remainingTokens);
  const [totalSkips, setTotalSkips] = useState<number>(INITIAL_TOKEN_STATE.totalSkips);
  const [remainingSkips, setRemainingSkips] = useState<number>(INITIAL_TOKEN_STATE.remainingSkips);
  const [streakDays, setStreakDays] = useState<number>(INITIAL_TOKEN_STATE.streakDays);
  const [highestStreakDays, setHighestStreakDays] = useState<number>(INITIAL_TOKEN_STATE.highestStreakDays);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>(INITIAL_TOKEN_STATE.subscriptionPlan);
  const [planType, setPlanType] = useState<PlanType>(INITIAL_TOKEN_STATE.planType);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(INITIAL_TOKEN_STATE.planExpiresAt);

  const [activeBooking, setActiveBooking] = useState<BookingDetails | null>(null);
  const [shortlistedMessIds, setShortlistedMessIds] = useState<string[]>([]);
  const [mealHistory, setMealHistory] = useState<MealHistoryItem[]>([]);
  const [invalidatedOTPs, setInvalidatedOTPs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Compute if currently in Grace / Extension period (expiry date passed, but protected by skips)
  const isGracePeriod = Boolean(
    planExpiresAt &&
      new Date().getTime() > new Date(planExpiresAt).getTime() &&
      remainingSkips > 0 &&
      remainingTokens > 0
  );

  // Helper to check if an OTP is valid or invalidated
  const isOTPValid = (otpToCheck: string): boolean => {
    if (!otpToCheck) return false;
    const cleanOtp = otpToCheck.replace(/[\s-]/g, '');
    if (invalidatedOTPs.some((inv) => inv.replace(/[\s-]/g, '') === cleanOtp)) {
      return false;
    }
    if (
      activeBooking &&
      activeBooking.otp.replace(/[\s-]/g, '') === cleanOtp &&
      activeBooking.status === 'booked'
    ) {
      return true;
    }
    return false;
  };

  // Helper to generate an 8-digit verification OTP
  const generateOTP = (): string => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  // Save Token State to AsyncStorage & Neon DB
  const saveStateToStorage = async (
    remTokens: number,
    remSkips: number,
    streak: number,
    customPlan?: string,
    customHighest?: number,
    customExpiresAt?: string | null,
    customPlanType?: PlanType,
    customLastLunch?: string,
    customLastDinner?: string,
    customLastDaily?: string
  ) => {
    const userId = await getCurrentUserId();
    const activePlan = customPlan !== undefined ? customPlan : subscriptionPlan;
    const currentHighest =
      customHighest !== undefined ? customHighest : Math.max(highestStreakDays, streak);
    const expDate = customExpiresAt !== undefined ? customExpiresAt : planExpiresAt;
    const pType = customPlanType !== undefined ? customPlanType : planType;

    const stateObj = {
      totalTokens,
      remainingTokens: remTokens,
      totalSkips,
      remainingSkips: remSkips,
      streakDays: streak,
      highestStreakDays: currentHighest,
      subscriptionPlan: activePlan,
      planType: pType,
      planExpiresAt: expDate,
      lastLunchCutoffDate: customLastLunch,
      lastDinnerCutoffDate: customLastDinner,
      lastDailyCutoffDate: customLastDaily,
    };
    await AsyncStorage.setItem(
      getScopedKey(STORAGE_KEYS.TOKEN_STATE, userId),
      JSON.stringify(stateObj)
    );

    try {
      await upsertMealPassInNeon(
        userId,
        activePlan,
        totalTokens,
        remTokens,
        totalSkips,
        remSkips,
        streak
      );
    } catch (e) {}
  };

  // ================= AUTOMATED DAILY CUTOFFS & EXPIRY EVALUATOR =================
  const evaluateDailyCutoffsAndExpiry = useCallback(
    async (
      currState: {
        totalTokens: number;
        remainingTokens: number;
        totalSkips: number;
        remainingSkips: number;
        streakDays: number;
        highestStreakDays: number;
        subscriptionPlan: string;
        planType: PlanType;
        planExpiresAt: string | null;
        lastLunchCutoffDate?: string;
        lastDinnerCutoffDate?: string;
        lastDailyCutoffDate?: string;
      },
      currHistory: MealHistoryItem[],
      currActiveBooking: BookingDetails | null,
      userId: string
    ) => {
      let updatedRemTokens = currState.remainingTokens;
      let updatedRemSkips = currState.remainingSkips;
      let updatedPlan = currState.subscriptionPlan;
      let historyToAdd: MealHistoryItem[] = [];

      const istNow = getISTDate();
      const todayStr = getISTDateString();
      const currentHour = getISTCurrentDecimalHours();
      const isAfter1100AM = currentHour >= 11.0;
      const isAfter700PM = currentHour >= 19.0;

      let lastLunch = currState.lastLunchCutoffDate || '';
      let lastDinner = currState.lastDinnerCutoffDate || '';
      let lastDaily = currState.lastDailyCutoffDate || '';

      // 1. Check Subscription Expiry
      if (currState.planExpiresAt) {
        const expTime = new Date(currState.planExpiresAt).getTime();
        if (istNow.getTime() > expTime) {
          if (updatedRemSkips <= 0 && updatedRemTokens > 0) {
            // Expired with 0 skips left -> Reset all remaining tokens to 0
            updatedRemTokens = 0;
            updatedPlan = 'Expired Subscription';
            historyToAdd.push({
              id: `hist_exp_${Date.now()}`,
              messName: 'Pass Validity Expired (0 Skips Left)',
              mealType: 'Lunch',
              status: 'no-show',
              tokensUsed: 0,
              date: formatToIST(istNow),
            });
          }
        }
      }

      // If no tokens or expired, return early
      if (updatedRemTokens <= 0 || updatedPlan === 'No Active Subscription') {
        return;
      }

      // Check if user had a booking today in IST
      const todayBookings = currHistory.filter((h) => {
        const hDate = new Date(h.date);
        return (
          hDate.getDate() === istNow.getDate() &&
          hDate.getMonth() === istNow.getMonth() &&
          hDate.getFullYear() === istNow.getFullYear()
        );
      });

      const hasActiveLunch =
        currActiveBooking &&
        currActiveBooking.status === 'booked' &&
        currActiveBooking.mealType === 'Lunch';
      const hasActiveDinner =
        currActiveBooking &&
        currActiveBooking.status === 'booked' &&
        currActiveBooking.mealType === 'Dinner';

      const bookedLunchToday =
        hasActiveLunch || todayBookings.some((h) => h.mealType === 'Lunch');
      const bookedDinnerToday =
        hasActiveDinner || todayBookings.some((h) => h.mealType === 'Dinner');
      const bookedAnyMealToday =
        bookedLunchToday || bookedDinnerToday || todayBookings.length > 0;

      // Check if auto-skip/expiration for today was already recorded in history
      const alreadyProcessedLunch =
        lastLunch === todayStr ||
        currHistory.some(
          (h) =>
            h.id.includes(`lunch_${todayStr}`) ||
            (h.date.includes(todayStr) && h.status === 'skipped' && h.mealType === 'Lunch')
        );

      const alreadyProcessedDinner =
        lastDinner === todayStr ||
        currHistory.some(
          (h) =>
            h.id.includes(`dinner_${todayStr}`) ||
            (h.date.includes(todayStr) && h.status === 'skipped' && h.mealType === 'Dinner')
        );

      const alreadyProcessedDaily =
        lastDaily === todayStr ||
        currHistory.some(
          (h) =>
            h.id.includes(`daily_${todayStr}`) ||
            h.id.includes(`auto_${todayStr}`) ||
            (h.date.includes(todayStr) && h.status === 'skipped')
        );

      // 2. Evaluation for 30-Meal Pass (1 Meal / Day - Single Slot)
      // Cutoff occurs after 7:00 PM (19:00 IST) ONLY IF NO LUNCH AND NO DINNER booked on that day!
      if (currState.planType === 'single') {
        if (isAfter700PM && !alreadyProcessedDaily && updatedRemTokens > 0) {
          lastDaily = todayStr;
          if (!bookedAnyMealToday) {
            if (updatedRemSkips > 0) {
              // Deduct 1 skip token (protects meal token)
              updatedRemSkips = Math.max(0, updatedRemSkips - 1);
              historyToAdd.push({
                id: `hist_skip_daily_${todayStr}`,
                messName: '1 Skip Pass Auto-Used (No Meal Booked by 7:00 PM Cutoff)',
                mealType: 'Dinner',
                status: 'skipped',
                tokensUsed: 0,
                date: formatToIST(new Date()),
              });
            } else {
              // Deduct 1 meal token (no-show)
              updatedRemTokens = Math.max(0, updatedRemTokens - 1);
              historyToAdd.push({
                id: `hist_meal_exp_daily_${todayStr}`,
                messName: '1 Meal Token Expired (No Meal Booked by 7:00 PM Cutoff)',
                mealType: 'Dinner',
                status: 'no-show',
                tokensUsed: 1,
                date: formatToIST(new Date()),
              });
            }
          }
        }
      }

      // 3. Evaluation for 60-Meal Pass (2 Meals / Day - Double Slot: Lunch + Dinner)
      if (currState.planType === 'double') {
        // A) Lunch Cutoff (11:00 AM) - Deduct 1 skip token if no lunch booked today
        if (isAfter1100AM && !alreadyProcessedLunch && updatedRemTokens > 0) {
          lastLunch = todayStr;
          if (!bookedLunchToday) {
            if (updatedRemSkips > 0) {
              updatedRemSkips = Math.max(0, updatedRemSkips - 1);
              historyToAdd.push({
                id: `hist_skip_lunch_${todayStr}`,
                messName: '1 Skip Pass Auto-Used (Lunch Cutoff Missed at 11:00 AM)',
                mealType: 'Lunch',
                status: 'skipped',
                tokensUsed: 0,
                date: formatToIST(new Date()),
              });
            } else {
              updatedRemTokens = Math.max(0, updatedRemTokens - 1);
              historyToAdd.push({
                id: `hist_meal_lunch_${todayStr}`,
                messName: '1 Meal Token Expired (Lunch Cutoff Missed at 11:00 AM)',
                mealType: 'Lunch',
                status: 'no-show',
                tokensUsed: 1,
                date: formatToIST(new Date()),
              });
            }
          }
        }

        // B) Dinner Cutoff (7:00 PM) - Deduct 1 skip token if no dinner booked today
        if (isAfter700PM && !alreadyProcessedDinner && updatedRemTokens > 0) {
          lastDinner = todayStr;
          if (!bookedDinnerToday) {
            if (updatedRemSkips > 0) {
              updatedRemSkips = Math.max(0, updatedRemSkips - 1);
              historyToAdd.push({
                id: `hist_skip_dinner_${todayStr}`,
                messName: '1 Skip Pass Auto-Used (Dinner Cutoff Missed at 7:00 PM)',
                mealType: 'Dinner',
                status: 'skipped',
                tokensUsed: 0,
                date: formatToIST(new Date()),
              });
            } else {
              updatedRemTokens = Math.max(0, updatedRemTokens - 1);
              historyToAdd.push({
                id: `hist_meal_dinner_${todayStr}`,
                messName: '1 Meal Token Expired (Dinner Cutoff Missed at 7:00 PM)',
                mealType: 'Dinner',
                status: 'no-show',
                tokensUsed: 1,
                date: formatToIST(new Date()),
              });
            }
          }
        }
      }

      // If changes occurred, commit state & history
      if (
        updatedRemTokens !== currState.remainingTokens ||
        updatedRemSkips !== currState.remainingSkips ||
        historyToAdd.length > 0 ||
        lastLunch !== currState.lastLunchCutoffDate ||
        lastDinner !== currState.lastDinnerCutoffDate ||
        lastDaily !== currState.lastDailyCutoffDate
      ) {
        setRemainingTokens(updatedRemTokens);
        setRemainingSkips(updatedRemSkips);
        setSubscriptionPlan(updatedPlan);

        if (historyToAdd.length > 0) {
          const newHistory = expandHistoryWithRefundPairs([...historyToAdd, ...currHistory]);
          setMealHistory(newHistory);
          await AsyncStorage.setItem(
            getScopedKey(STORAGE_KEYS.HISTORY, userId),
            JSON.stringify(newHistory)
          );
        }

        const stateObj = {
          totalTokens: currState.totalTokens,
          remainingTokens: updatedRemTokens,
          totalSkips: currState.totalSkips,
          remainingSkips: updatedRemSkips,
          streakDays: currState.streakDays,
          highestStreakDays: currState.highestStreakDays,
          subscriptionPlan: updatedPlan,
          planType: currState.planType,
          planExpiresAt: currState.planExpiresAt,
          lastLunchCutoffDate: lastLunch,
          lastDinnerCutoffDate: lastDinner,
          lastDailyCutoffDate: lastDaily,
        };
        await AsyncStorage.setItem(
          getScopedKey(STORAGE_KEYS.TOKEN_STATE, userId),
          JSON.stringify(stateObj)
        );

        // Sync real-time skip and token deductions to Neon PostgreSQL
        try {
          await upsertMealPassInNeon(
            userId,
            updatedPlan,
            currState.totalTokens,
            updatedRemTokens,
            currState.totalSkips,
            updatedRemSkips,
            currState.streakDays
          );

          if (historyToAdd.length > 0) {
            for (const hItem of historyToAdd) {
              await insertMealHistoryItemInNeon(
                userId,
                hItem.messName,
                hItem.mealType,
                hItem.status,
                hItem.tokensUsed
              );
            }
          }
        } catch (e) {}
      }
    },
    []
  );

  // Load persistent token state from AsyncStorage & Neon DB
  const loadTokenState = async () => {
    try {
      setLoading(true);

      const userId = await getCurrentUserId();
      const isVipUser = userId === 'vip_test_user';

      // 5. Load Invalidated OTPs for THIS user first
      const invKey = getScopedKey(STORAGE_KEYS.INVALIDATED_OTPS, userId);
      const savedInvStr = await AsyncStorage.getItem(invKey);
      let currentInvOTPs: string[] = [];
      if (savedInvStr) {
        try {
          currentInvOTPs = JSON.parse(savedInvStr);
          setInvalidatedOTPs(currentInvOTPs);
        } catch {
          setInvalidatedOTPs([]);
        }
      } else {
        setInvalidatedOTPs([]);
      }

      let loadedTotalTokens = 0;
      let loadedRemTokens = 0;
      let loadedTotalSkips = 0;
      let loadedRemSkips = 0;
      let loadedStreak = 0;
      let loadedHighest = 0;
      let loadedPlan = 'No Active Subscription';
      let loadedPlanType: PlanType = 'none';
      let loadedExpiresAt: string | null = null;
      let lastLunch = '';
      let lastDinner = '';
      let lastDaily = '';

      // 1. Fetch Real Pass Stats from Neon DB or Local Storage
      try {
        const pass = await getMealPassFromNeon(userId);

        if (pass) {
          loadedTotalTokens = pass.total_tokens ?? 0;
          loadedRemTokens = pass.remaining_tokens ?? 0;
          loadedTotalSkips = pass.total_skips ?? 0;
          loadedRemSkips = pass.remaining_skips ?? 0;
          loadedStreak = pass.streak_days ?? 0;
          loadedHighest = pass.streak_days ?? 0;
          loadedPlan = pass.plan_name || 'No Active Subscription';
          loadedPlanType = (pass.plan_name || '').toLowerCase().includes('60')
            ? 'double'
            : (pass.plan_name || '').toLowerCase().includes('30')
            ? 'single'
            : 'none';

          // Preserve cutoff check dates & expiry from local storage
          const savedStateStr = await AsyncStorage.getItem(
            getScopedKey(STORAGE_KEYS.TOKEN_STATE, userId)
          );
          if (savedStateStr) {
            try {
              const parsed = JSON.parse(savedStateStr);
              lastLunch = parsed.lastLunchCutoffDate || '';
              lastDinner = parsed.lastDinnerCutoffDate || '';
              lastDaily = parsed.lastDailyCutoffDate || '';
              loadedExpiresAt = parsed.planExpiresAt || null;
            } catch (e) {}
          }
        } else {
          const savedStateStr = await AsyncStorage.getItem(
            getScopedKey(STORAGE_KEYS.TOKEN_STATE, userId)
          );
          if (savedStateStr) {
            const parsed = JSON.parse(savedStateStr);
            loadedTotalTokens = parsed.totalTokens ?? 0;
            loadedRemTokens = parsed.remainingTokens ?? 0;
            loadedTotalSkips = parsed.totalSkips ?? 0;
            loadedRemSkips = parsed.remainingSkips ?? 0;
            loadedStreak = parsed.streakDays ?? 0;
            loadedHighest = parsed.highestStreakDays ?? parsed.streakDays ?? 0;
            loadedPlan = parsed.subscriptionPlan || 'No Active Subscription';
            loadedPlanType = parsed.planType || 'none';
            loadedExpiresAt = parsed.planExpiresAt || null;
            lastLunch = parsed.lastLunchCutoffDate || '';
            lastDinner = parsed.lastDinnerCutoffDate || '';
            lastDaily = parsed.lastDailyCutoffDate || '';
          } else if (isVipUser) {
            loadedTotalTokens = 60;
            loadedRemTokens = 42;
            loadedTotalSkips = 10;
            loadedRemSkips = 8;
            loadedStreak = 7;
            loadedHighest = 14;
            loadedPlan = 'Full Board Pass (60 Meals)';
            loadedPlanType = 'double';
            loadedExpiresAt = new Date(Date.now() + 25 * 86400000).toISOString();
          }
        }
      } catch (e) {}

      setTotalTokens(loadedTotalTokens);
      setRemainingTokens(loadedRemTokens);
      setTotalSkips(loadedTotalSkips);
      setRemainingSkips(loadedRemSkips);
      setStreakDays(loadedStreak);
      setHighestStreakDays(loadedHighest);
      setSubscriptionPlan(loadedPlan);
      setPlanType(loadedPlanType);
      setPlanExpiresAt(loadedExpiresAt);

      // 2. Load Active Booking for THIS user only from Neon DB and AsyncStorage
      const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
      const savedActiveStr = await AsyncStorage.getItem(activeKey);
      const legacyActiveStr = await AsyncStorage.getItem('mealhop_active_booking');

      let currentActive: BookingDetails | null = null;

      try {
        // Priority 1: Check Neon Database
        const dbBooking = await getActiveBookingFromNeon(userId);
        if (dbBooking && dbBooking.status === 'booked') {
          const cleanOtp = (dbBooking.otp || '').replace(/[\s-]/g, '');
          const isInv = cleanOtp && currentInvOTPs.some((i) => i.replace(/[\s-]/g, '') === cleanOtp);
          if (!isInv) {
            currentActive = {
              bookingId: dbBooking.id,
              messId: dbBooking.mess_id,
              messName: dbBooking.mess_name || 'Partner Mess',
              messAddress: dbBooking.mess_address || 'Campus Hub',
              mealType: (dbBooking.meal_type as 'Lunch' | 'Dinner') || 'Lunch',
              menuHighlights: ['Daily Special'],
              otp: dbBooking.otp || '84920156',
              otpExpiresAt:
                dbBooking.otp_expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              status: 'booked',
              bookedAt: dbBooking.created_at,
              cutoffTime: dbBooking.cutoff_time || '2:30 PM',
            };
            await AsyncStorage.setItem(activeKey, JSON.stringify(currentActive));
          } else {
            currentActive = null;
            await AsyncStorage.setItem(activeKey, 'CANCELLED');
          }
        } else {
          // If Neon says completed or no active booking, clear local storage
          currentActive = null;
          if (savedActiveStr && savedActiveStr !== 'COMPLETED' && savedActiveStr !== 'CANCELLED') {
            await AsyncStorage.setItem(activeKey, 'COMPLETED');
            await AsyncStorage.setItem('mealhop_active_booking', 'COMPLETED');
          }
        }
      } catch (e) {
        // Fallback to local storage
        if (
          savedActiveStr === 'CANCELLED' ||
          savedActiveStr === 'NONE' ||
          savedActiveStr === 'EXPIRED' ||
          savedActiveStr === 'COMPLETED' ||
          legacyActiveStr === 'CANCELLED' ||
          legacyActiveStr === 'COMPLETED'
        ) {
          currentActive = null;
        } else if (savedActiveStr && savedActiveStr.startsWith('{')) {
          try {
            const parsed = JSON.parse(savedActiveStr);
            const cleanOtp = (parsed?.otp || '').replace(/[\s-]/g, '');
            const isInv = cleanOtp && currentInvOTPs.some((i) => i.replace(/[\s-]/g, '') === cleanOtp);
            if (parsed && parsed.status === 'booked' && !isInv) {
              currentActive = parsed;
            } else {
              currentActive = null;
            }
          } catch {
            currentActive = null;
          }
        }
      }

      setActiveBooking(currentActive);

      // 3. Load Meal History
      const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);
      const savedHistoryStr = await AsyncStorage.getItem(historyKey);
      let currentHistory: MealHistoryItem[] = [];

      if (savedHistoryStr) {
        try {
          const parsedHist = JSON.parse(savedHistoryStr);
          if (Array.isArray(parsedHist)) {
            currentHistory = expandHistoryWithRefundPairs(parsedHist);
            // Clean up storage from any duplicate records
            await AsyncStorage.setItem(historyKey, JSON.stringify(currentHistory));
          }
        } catch (e) {}
      }
      setMealHistory(currentHistory);

      // 4. Load Shortlisted Messes
      const shortlistKey = getScopedKey(STORAGE_KEYS.SHORTLIST, userId);
      const savedShortlistStr = await AsyncStorage.getItem(shortlistKey);
      if (savedShortlistStr) {
        try {
          setShortlistedMessIds(JSON.parse(savedShortlistStr));
        } catch {
          setShortlistedMessIds([]);
        }
      }

      // 5. Trigger Daily Cutoffs and Expiry Evaluation
      await evaluateDailyCutoffsAndExpiry(
        {
          totalTokens: loadedTotalTokens,
          remainingTokens: loadedRemTokens,
          totalSkips: loadedTotalSkips,
          remainingSkips: loadedRemSkips,
          streakDays: loadedStreak,
          highestStreakDays: loadedHighest,
          subscriptionPlan: loadedPlan,
          planType: loadedPlanType,
          planExpiresAt: loadedExpiresAt,
          lastLunchCutoffDate: lastLunch,
          lastDinnerCutoffDate: lastDinner,
          lastDailyCutoffDate: lastDaily,
        },
        currentHistory,
        currentActive,
        userId
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokenState();

    // Periodic evaluation timer (every 10 seconds) for real-time cutoffs and verifications
    const interval = setInterval(() => {
      loadTokenState();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // REAL-TIME LISTENER: When Owner Verifies OTP, instantly complete & remove active booking on student screen
  useEffect(() => {
    const handleBookingVerified = (detail: any) => {
      if (!detail) return;
      const cleanVerified = (detail.otp || '').replace(/\D/g, '');

      setActiveBooking((prev) => {
        if (!prev) return null;
        const currentClean = (prev.otp || '').replace(/\D/g, '');
        if (
          !cleanVerified ||
          currentClean === cleanVerified ||
          cleanVerified.includes(currentClean) ||
          currentClean.includes(cleanVerified)
        ) {
          return null;
        }
        return prev;
      });

      // Also trigger fresh reload from Neon
      loadTokenState();
    };

    const sub = DeviceEventEmitter.addListener('ELITEMESS_BOOKING_VERIFIED', handleBookingVerified);

    const handleWebEvent = (e: any) => {
      if (e && e.detail) handleBookingVerified(e.detail);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'ELITEMESS_LAST_BOOKING_VERIFIED' && e.newValue) {
        try {
          handleBookingVerified(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('ELITEMESS_BOOKING_VERIFIED', handleWebEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('ELITEMESS_BOOKING_VERIFIED', handleWebEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  }, []);

  // Book a Meal from a Mess
  const bookMeal = async (
    messId: string,
    messName: string,
    messAddress: string,
    mealType: 'Lunch' | 'Dinner',
    menuHighlights: string[]
  ): Promise<{ success: boolean; message?: string }> => {
    if (remainingTokens <= 0) {
      return {
        success: false,
        message: 'You have run out of meal tokens! Please top up your subscription.',
      };
    }

    if (activeBooking && activeBooking.status === 'booked') {
      return {
        success: false,
        message: 'You already have an active meal booking! Complete or cancel it first.',
      };
    }

    const userId = await getCurrentUserId();
    const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);

    const otpCode = generateOTP();
    const expiryTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const newBooking: BookingDetails = {
      bookingId: `bk_${Date.now()}`,
      messId,
      messName,
      messAddress,
      mealType,
      menuHighlights,
      otp: otpCode,
      otpExpiresAt: expiryTime,
      status: 'booked',
      bookedAt: new Date().toISOString(),
      cutoffTime: mealType === 'Lunch' ? '2:30 PM' : '9:30 PM',
    };

    const newRemTokens = remainingTokens - 1;
    const newStreak = streakDays + 1;
    const newHighest = Math.max(highestStreakDays, newStreak);

    setRemainingTokens(newRemTokens);
    setStreakDays(newStreak);
    setHighestStreakDays(newHighest);
    setActiveBooking(newBooking);

    await saveStateToStorage(newRemTokens, remainingSkips, newStreak, undefined, newHighest);
    await AsyncStorage.setItem(activeKey, JSON.stringify(newBooking));
    await AsyncStorage.setItem('mealhop_active_booking', JSON.stringify(newBooking));

    const bookedItem: MealHistoryItem = {
      id: `hist_book_${Date.now()}`,
      messName,
      mealType,
      status: 'completed',
      tokensUsed: 1,
      date: new Date().toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedHistory = [bookedItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      await createBookingInNeon(
        userId,
        messId,
        mealType,
        otpCode,
        expiryTime,
        newBooking.cutoffTime
      );
    } catch (e) {}

    return { success: true };
  };

  // Cancel Active Booking with Atomic Ledger Verification
  const cancelBooking = async (): Promise<{ success: boolean; message: string; reason?: string }> => {
    if (!activeBooking) {
      return { success: false, message: 'No active booking to cancel.' };
    }

    const userId = await getCurrentUserId();
    const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);
    const invKey = getScopedKey(STORAGE_KEYS.INVALIDATED_OTPS, userId);

    const currentBooking = activeBooking;
    const cleanOtp = currentBooking.otp.replace(/[\s-]/g, '');

    // 1. Atomically verify & mark cancelled on Neon DB
    const neonRes = await attemptAtomicRefundInNeon(currentBooking.bookingId, cleanOtp, userId);

    if (!neonRes.success && neonRes.reason === 'already_completed') {
      // OTP was already redeemed by the Mess Owner!
      // Do NOT refund token. Clear active booking locally since it's already consumed.
      setActiveBooking(null);
      await AsyncStorage.setItem(activeKey, 'COMPLETED');
      await AsyncStorage.setItem('mealhop_active_booking', 'COMPLETED');

      return {
        success: false,
        reason: 'already_completed',
        message: 'This OTP has already been redeemed and verified by the Mess Owner.',
      };
    }

    // 2. Verified active -> proceed with local token refund
    const newInvOTPs = [...invalidatedOTPs, cleanOtp];
    setInvalidatedOTPs(newInvOTPs);
    await AsyncStorage.setItem(invKey, JSON.stringify(newInvOTPs));

    const newRemTokens = remainingTokens + 1;
    const newStreak = Math.max(0, streakDays - 1);

    setRemainingTokens(newRemTokens);
    setStreakDays(newStreak);
    setActiveBooking(null);

    await saveStateToStorage(newRemTokens, remainingSkips, newStreak);
    await AsyncStorage.setItem(activeKey, 'CANCELLED');
    await AsyncStorage.setItem('mealhop_active_booking', 'CANCELLED');

    const refundItem: MealHistoryItem = {
      id: `hist_cancel_${Date.now()}`,
      messName: currentBooking.messName,
      mealType: currentBooking.mealType,
      status: 'cancelled',
      tokensUsed: -1,
      date: formatToIST(new Date()),
    };

    const rawHistory = [refundItem, ...mealHistory];
    const expanded = expandHistoryWithRefundPairs(rawHistory);
    setMealHistory(expanded);
    await AsyncStorage.setItem(historyKey, JSON.stringify(expanded));

    return {
      success: true,
      message: '1 Meal Token has been credited back to your balance.',
    };
  };

  // Expire Booking (No-show)
  const expireBooking = async () => {
    if (!activeBooking) return;

    const userId = await getCurrentUserId();
    const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);

    const currentBooking = activeBooking;
    setActiveBooking(null);
    setStreakDays(0);

    await saveStateToStorage(remainingTokens, remainingSkips, 0, undefined, highestStreakDays);
    await AsyncStorage.setItem(activeKey, 'EXPIRED');
    await AsyncStorage.setItem('mealhop_active_booking', 'EXPIRED');

    const expiredItem: MealHistoryItem = {
      id: `hist_exp_${Date.now()}`,
      messName: currentBooking.messName,
      mealType: currentBooking.mealType,
      status: 'no-show',
      tokensUsed: 1,
      date: new Date().toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedHistory = [expiredItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      await updateBookingStatusInNeon(currentBooking.otp, 'expired');
    } catch (e) {}
  };

  // Complete Active Booking
  const completeBooking = async () => {
    if (!activeBooking) return;

    const userId = await getCurrentUserId();
    const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);

    const currentBooking = activeBooking;
    setActiveBooking(null);
    await AsyncStorage.setItem(activeKey, 'COMPLETED');
    await AsyncStorage.setItem('mealhop_active_booking', 'COMPLETED');

    const completedItem: MealHistoryItem = {
      id: `hist_comp_${Date.now()}`,
      messName: currentBooking.messName,
      mealType: currentBooking.mealType,
      status: 'completed',
      tokensUsed: 1,
      date: new Date().toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedHistory = [completedItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      await updateBookingStatusInNeon(currentBooking.otp, 'completed');
    } catch (e) {}
  };

  // Manual Skip Meal
  const skipMeal = async (): Promise<{ success: boolean; message?: string }> => {
    if (remainingSkips <= 0) {
      return {
        success: false,
        message: 'No remaining skip passes! Buy extra skips to pause meals.',
      };
    }

    const userId = await getCurrentUserId();
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);

    const newRemSkips = remainingSkips - 1;
    setRemainingSkips(newRemSkips);
    await saveStateToStorage(remainingTokens, newRemSkips, streakDays);

    const skippedItem: MealHistoryItem = {
      id: `hist_skip_${Date.now()}`,
      messName: 'Meal Skip Pass Used',
      mealType: 'Lunch',
      status: 'skipped',
      tokensUsed: 0,
      date: new Date().toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedHistory = [skippedItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    return { success: true };
  };

  const LEGACY_EQUIVALENTS: Record<string, string> = {
    mess_1: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d': 'mess_1',
    mess_2: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e': 'mess_2',
    mess_3: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f': 'mess_3',
    mess_4: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
    'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a': 'mess_4',
    mess_5: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
    'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b': 'mess_5',
  };

  const toggleShortlistMess = async (messId: string) => {
    const userId = await getCurrentUserId();
    const shortlistKey = getScopedKey(STORAGE_KEYS.SHORTLIST, userId);
    const equiv = LEGACY_EQUIVALENTS[messId];

    setShortlistedMessIds((prev) => {
      const exists = prev.includes(messId) || (!!equiv && prev.includes(equiv));
      let updated: string[];
      if (exists) {
        updated = prev.filter((id) => id !== messId && id !== equiv);
      } else {
        updated = [...prev, messId];
      }
      AsyncStorage.setItem(shortlistKey, JSON.stringify(updated));
      return updated;
    });
  };

  const addToShortlist = async (messId: string) => {
    const userId = await getCurrentUserId();
    const shortlistKey = getScopedKey(STORAGE_KEYS.SHORTLIST, userId);
    const equiv = LEGACY_EQUIVALENTS[messId];

    setShortlistedMessIds((prev) => {
      const exists = prev.includes(messId) || (!!equiv && prev.includes(equiv));
      if (exists) return prev;
      const updated = [...prev, messId];
      AsyncStorage.setItem(shortlistKey, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromShortlist = async (messId: string) => {
    const userId = await getCurrentUserId();
    const shortlistKey = getScopedKey(STORAGE_KEYS.SHORTLIST, userId);
    const equiv = LEGACY_EQUIVALENTS[messId];

    setShortlistedMessIds((prev) => {
      const updated = prev.filter((id) => id !== messId && id !== equiv);
      AsyncStorage.setItem(shortlistKey, JSON.stringify(updated));
      return updated;
    });
  };

  const isShortlisted = (messId: string): boolean => {
    const equiv = LEGACY_EQUIVALENTS[messId];
    return (
      shortlistedMessIds.includes(messId) ||
      (!!equiv && shortlistedMessIds.includes(equiv))
    );
  };

  // Buy Extra Skips
  const buyExtraSkips = async (count: number, amountPaid: number) => {
    const newTotalSkips = totalSkips + count;
    const newRemSkips = remainingSkips + count;

    setTotalSkips(newTotalSkips);
    setRemainingSkips(newRemSkips);

    await saveStateToStorage(remainingTokens, newRemSkips, streakDays);
  };

  // Buy Pass Plan with Validity & Type
  const buyPassPlan = async (
    planName: string,
    tokens: number,
    skips: number,
    validityDays: number = 30,
    newPlanType?: PlanType
  ) => {
    const newTotalTokens = totalTokens + tokens;
    const newRemTokens = remainingTokens + tokens;
    const newTotalSkips = totalSkips + skips;
    const newRemSkips = remainingSkips + skips;
    const pType =
      newPlanType ||
      (tokens >= 60 ? 'double' : 'single');
    const expDate = new Date(Date.now() + validityDays * 86400000).toISOString();

    setTotalTokens(newTotalTokens);
    setRemainingTokens(newRemTokens);
    setTotalSkips(newTotalSkips);
    setRemainingSkips(newRemSkips);
    setSubscriptionPlan(planName);
    setPlanType(pType);
    setPlanExpiresAt(expDate);

    await saveStateToStorage(
      newRemTokens,
      newRemSkips,
      streakDays,
      planName,
      undefined,
      expDate,
      pType
    );
  };

  return (
    <TokenContext.Provider
      value={{
        totalTokens,
        remainingTokens,
        totalSkips,
        remainingSkips,
        streakDays,
        highestStreakDays,
        subscriptionPlan,
        planType,
        planExpiresAt,
        isGracePeriod,
        activeBooking,
        shortlistedMessIds,
        mealHistory,
        loading,
        bookMeal,
        cancelBooking,
        expireBooking,
        completeBooking,
        skipMeal,
        toggleShortlistMess,
        addToShortlist,
        removeFromShortlist,
        isShortlisted,
        buyExtraSkips,
        buyPassPlan,
        invalidatedOTPs,
        isOTPValid,
        refreshState: loadTokenState,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};
