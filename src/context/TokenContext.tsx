import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  getMealHistoryFromNeon,
  insertMealHistoryItemInNeon,
} from '../services/neon';

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
}

interface TokenContextType {
  totalTokens: number;
  remainingTokens: number;
  totalSkips: number;
  remainingSkips: number;
  streakDays: number;
  highestStreakDays: number;
  subscriptionPlan: string;
  activeBooking: BookingDetails | null;
  shortlistedMessIds: string[];
  mealHistory: MealHistoryItem[];
  loading: boolean;
  bookMeal: (messId: string, messName: string, messAddress: string, mealType: 'Lunch' | 'Dinner', menuHighlights: string[]) => Promise<{ success: boolean; message?: string }>;
  cancelBooking: () => Promise<void>;
  expireBooking: () => Promise<void>;
  completeBooking: () => Promise<void>;
  skipMeal: () => Promise<{ success: boolean; message?: string }>;
  toggleShortlistMess: (messId: string) => void;
  addToShortlist: (messId: string) => void;
  removeFromShortlist: (messId: string) => void;
  isShortlisted: (messId: string) => boolean;
  buyExtraSkips: (count: number, amountPaid: number) => Promise<void>;
  buyPassPlan: (planName: string, tokens: number, skips: number) => Promise<void>;
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.status === 'cancelled' || item.status === 'refunded' || item.tokensUsed < 0) {
      result.push({
        ...item,
        status: 'cancelled',
        tokensUsed: -1,
      });

      const hasDebitPair = items.some(
        (other, idx) => idx !== i && other.messName === item.messName && other.mealType === item.mealType && (other.tokensUsed > 0 || other.status === 'completed')
      );

      if (!hasDebitPair) {
        result.push({
          id: `${item.id}_debit`,
          messName: item.messName,
          mealType: item.mealType,
          status: 'completed',
          tokensUsed: 1,
          date: item.date,
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

  const [activeBooking, setActiveBooking] = useState<BookingDetails | null>(null);
  const [shortlistedMessIds, setShortlistedMessIds] = useState<string[]>([]);
  const [mealHistory, setMealHistory] = useState<MealHistoryItem[]>([]);
  const [invalidatedOTPs, setInvalidatedOTPs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to check if an OTP is valid or invalidated
  const isOTPValid = (otpToCheck: string): boolean => {
    if (!otpToCheck) return false;
    const cleanOtp = otpToCheck.replace(/[\s-]/g, '');
    if (invalidatedOTPs.some(inv => inv.replace(/[\s-]/g, '') === cleanOtp)) {
      return false;
    }
    if (activeBooking && activeBooking.otp.replace(/[\s-]/g, '') === cleanOtp && activeBooking.status === 'booked') {
      return true;
    }
    return false;
  };

  // Helper to generate an 8-digit verification OTP
  const generateOTP = (): string => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  // Load persistent token state from AsyncStorage & Supabase
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

      // 1. Fetch Real Pass Stats from Neon DB or Local Storage
      try {
        const pass = await getMealPassFromNeon(userId);

        if (pass) {
          setTotalTokens(pass.total_tokens ?? 0);
          setRemainingTokens(pass.remaining_tokens ?? 0);
          setTotalSkips(pass.total_skips ?? 0);
          setRemainingSkips(pass.remaining_skips ?? 0);
          setStreakDays(pass.streak_days ?? 0);
          setHighestStreakDays(pass.streak_days ?? 0);
          setSubscriptionPlan(pass.plan_name || 'No Active Subscription');
        } else {
          const savedStateStr = await AsyncStorage.getItem(getScopedKey(STORAGE_KEYS.TOKEN_STATE, userId));
          if (savedStateStr) {
            const parsed = JSON.parse(savedStateStr);
            setTotalTokens(parsed.totalTokens ?? 0);
            setRemainingTokens(parsed.remainingTokens ?? 0);
            setTotalSkips(parsed.totalSkips ?? 0);
            setRemainingSkips(parsed.remainingSkips ?? 0);
            setStreakDays(parsed.streakDays ?? 0);
            setHighestStreakDays(parsed.highestStreakDays ?? parsed.streakDays ?? 0);
            setSubscriptionPlan(parsed.subscriptionPlan || 'No Active Subscription');
          } else if (isVipUser) {
            setTotalTokens(60);
            setRemainingTokens(42);
            setTotalSkips(15);
            setRemainingSkips(12);
            setStreakDays(7);
            setHighestStreakDays(14);
            setSubscriptionPlan('College Gold Meal Pass');
          } else {
            setTotalTokens(0);
            setRemainingTokens(0);
            setTotalSkips(0);
            setRemainingSkips(0);
            setStreakDays(0);
            setHighestStreakDays(0);
            setSubscriptionPlan('No Active Subscription');
          }
        }
      } catch (e) {}

      // 2. Load Active Booking for THIS user only
      const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
      const savedActiveStr = await AsyncStorage.getItem(activeKey);
      const legacyActiveStr = await AsyncStorage.getItem('mealhop_active_booking');

      if (
        savedActiveStr === 'CANCELLED' ||
        savedActiveStr === 'NONE' ||
        savedActiveStr === 'EXPIRED' ||
        savedActiveStr === 'COMPLETED' ||
        legacyActiveStr === 'CANCELLED'
      ) {
        setActiveBooking(null);
      } else if (savedActiveStr && savedActiveStr.startsWith('{')) {
        try {
          const parsed = JSON.parse(savedActiveStr);
          const cleanOtp = (parsed?.otp || '').replace(/[\s-]/g, '');
          const isInv = cleanOtp && currentInvOTPs.some(i => i.replace(/[\s-]/g, '') === cleanOtp);
          if (parsed && parsed.status === 'booked' && !isInv) {
            setActiveBooking(parsed);
          } else {
            setActiveBooking(null);
            await AsyncStorage.setItem(activeKey, 'CANCELLED');
          }
        } catch {
          setActiveBooking(null);
        }
      } else {
        try {
          const { data: booking } = await supabase
            .from('meal_bookings')
            .select('*, messes(*)')
            .eq('user_id', userId)
            .eq('status', 'booked')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (booking) {
            const cleanOtp = (booking.otp || '').replace(/[\s-]/g, '');
            const isInv = cleanOtp && currentInvOTPs.some(i => i.replace(/[\s-]/g, '') === cleanOtp);
            if (!isInv) {
              const fetchedBooking: BookingDetails = {
                bookingId: booking.id,
                messId: booking.mess_id,
                messName: booking.messes?.name || 'Partner Mess',
                messAddress: booking.messes?.address || 'Campus Hub',
                mealType: booking.meal_type || 'Lunch',
                menuHighlights: booking.messes?.highlights || ['Daily Special'],
                otp: booking.otp || '84920156',
                otpExpiresAt: booking.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
                status: 'booked',
                bookedAt: booking.created_at,
                cutoffTime: booking.cutoff_time || '2:30 PM',
              };
              setActiveBooking(fetchedBooking);
              await AsyncStorage.setItem(activeKey, JSON.stringify(fetchedBooking));
            } else {
              setActiveBooking(null);
              await AsyncStorage.setItem(activeKey, 'CANCELLED');
            }
          } else {
            setActiveBooking(null);
          }
        } catch (e) {
          setActiveBooking(null);
        }
      }

      // 3. Load Meal History for THIS user only
      const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);
      const savedHistoryStr = await AsyncStorage.getItem(historyKey);
      if (savedHistoryStr) {
        try {
          const parsedHist = JSON.parse(savedHistoryStr);
          if (Array.isArray(parsedHist)) {
            setMealHistory(expandHistoryWithRefundPairs(parsedHist));
          } else {
            setMealHistory([]);
          }
        } catch (e) {
          setMealHistory([]);
        }
      } else {
        try {
          const { data: history } = await supabase
            .from('meal_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

          if (history && history.length > 0) {
            const mappedHistory: MealHistoryItem[] = history.map((h: any) => ({
              id: h.id,
              messName: h.mess_name || 'Partner Mess',
              mealType: h.meal_type || 'Lunch',
              status: h.status || 'completed',
              tokensUsed: h.tokens_used ?? (h.status === 'cancelled' || h.status === 'refunded' ? -1 : h.status === 'skipped' ? 0 : 1),
              date: new Date(h.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            }));
            const expanded = expandHistoryWithRefundPairs(mappedHistory);
            setMealHistory(expanded);
            await AsyncStorage.setItem(historyKey, JSON.stringify(expanded));
          } else if (isVipUser) {
            await ensureDatabaseInitialized('vip_test_user');
          } else {
            setMealHistory([]);
          }
        } catch (e) {
          setMealHistory([]);
        }
      }

      // 4. Load Shortlisted Messes for THIS user only
      const shortlistKey = getScopedKey(STORAGE_KEYS.SHORTLIST, userId);
      const savedShortlistStr = await AsyncStorage.getItem(shortlistKey);
      if (savedShortlistStr) {
        try {
          setShortlistedMessIds(JSON.parse(savedShortlistStr));
        } catch {
          setShortlistedMessIds([]);
        }
      } else {
        setShortlistedMessIds([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokenState();
  }, []);

  // Save Token State to AsyncStorage & Neon DB
  const saveStateToStorage = async (remTokens: number, remSkips: number, streak: number, customPlan?: string, customHighest?: number) => {
    const userId = await getCurrentUserId();
    const activePlan = customPlan || subscriptionPlan;
    const currentHighest = customHighest !== undefined ? customHighest : Math.max(highestStreakDays, streak);
    const stateObj = {
      totalTokens,
      remainingTokens: remTokens,
      totalSkips,
      remainingSkips: remSkips,
      streakDays: streak,
      highestStreakDays: currentHighest,
      subscriptionPlan: activePlan,
    };
    await AsyncStorage.setItem(getScopedKey(STORAGE_KEYS.TOKEN_STATE, userId), JSON.stringify(stateObj));

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

  // Book a Meal from a Mess (Persists Real Row in Supabase)
  const bookMeal = async (
    messId: string,
    messName: string,
    messAddress: string,
    mealType: 'Lunch' | 'Dinner',
    menuHighlights: string[]
  ): Promise<{ success: boolean; message?: string }> => {
    if (remainingTokens <= 0) {
      return { success: false, message: 'You have run out of meal tokens! Please top up your subscription.' };
    }

    if (activeBooking && activeBooking.status === 'booked') {
      return { success: false, message: 'You already have an active meal booking! Complete or cancel it first.' };
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
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [bookedItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    // Real Neon DB Insertions
    try {
      const validMessId = messId.length > 20 ? messId : 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      await createBookingInNeon(userId, validMessId, mealType, otpCode, expiryTime, newBooking.cutoffTime);
      await insertMealHistoryItemInNeon(userId, messName, mealType, 'completed', 1);
    } catch (e) {
      console.warn('Real Supabase booking sync notice:', e);
    }

    return { success: true };
  };

  // Cancel Active Booking (Reduces streak back)
  const cancelBooking = async () => {
    if (!activeBooking) return;

    const userId = await getCurrentUserId();
    const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);
    const invKey = getScopedKey(STORAGE_KEYS.INVALIDATED_OTPS, userId);

    const currentBooking = activeBooking;
    const restoredTokens = remainingTokens + 1;
    const reducedStreak = Math.max(0, streakDays - 1);

    setRemainingTokens(restoredTokens);
    setStreakDays(reducedStreak);
    setActiveBooking(null);

    await saveStateToStorage(restoredTokens, remainingSkips, reducedStreak, undefined, highestStreakDays);
    await AsyncStorage.setItem(activeKey, 'CANCELLED');
    await AsyncStorage.setItem('mealhop_active_booking', 'CANCELLED');

    // Register OTP as invalidated immediately
    const cleanOtp = currentBooking.otp.replace(/[\s-]/g, '');
    const updatedInvOTPs = Array.from(new Set([...invalidatedOTPs, cleanOtp, currentBooking.otp]));
    setInvalidatedOTPs(updatedInvOTPs);
    await AsyncStorage.setItem(invKey, JSON.stringify(updatedInvOTPs));
    await AsyncStorage.setItem(STORAGE_KEYS.INVALIDATED_OTPS, JSON.stringify(updatedInvOTPs));

    // Create refund credit entry (+1 Token) and preserve original debit entry (-1 Token)
    const refundItem: MealHistoryItem = {
      id: `hist_refund_${Date.now()}`,
      messName: currentBooking.messName,
      mealType: currentBooking.mealType,
      status: 'cancelled',
      tokensUsed: -1,
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    let updatedHistory = [...mealHistory];

    const hasBookingItem = updatedHistory.some(item => item.messName === currentBooking.messName && item.tokensUsed > 0);
    if (!hasBookingItem) {
      const originalBookingItem: MealHistoryItem = {
        id: `hist_book_${Date.now() - 1000}`,
        messName: currentBooking.messName,
        mealType: currentBooking.mealType,
        status: 'completed',
        tokensUsed: 1,
        date: new Date(Date.now() - 60000).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
      updatedHistory.push(originalBookingItem);
    }

    updatedHistory = [refundItem, ...updatedHistory];

    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      if (currentBooking.bookingId && currentBooking.bookingId.length > 20) {
        await updateBookingStatusInNeon(currentBooking.bookingId, 'cancelled');
      }
      await insertMealHistoryItemInNeon(userId, currentBooking.messName, currentBooking.mealType, 'cancelled', -1);
    } catch (e) {}
  };

  // Expire Active Booking (when missed - resets current streak to 0)
  const expireBooking = async () => {
    if (!activeBooking) return;

    const userId = await getCurrentUserId();
    const activeKey = getScopedKey(STORAGE_KEYS.ACTIVE_BOOKING, userId);
    const historyKey = getScopedKey(STORAGE_KEYS.HISTORY, userId);

    const currentBooking = activeBooking;
    setActiveBooking(null);
    setStreakDays(0); // Missed day resets current streak to 0!
    await saveStateToStorage(remainingTokens, remainingSkips, 0, undefined, highestStreakDays);
    await AsyncStorage.setItem(activeKey, 'EXPIRED');
    await AsyncStorage.setItem('mealhop_active_booking', 'EXPIRED');

    const expiredItem: MealHistoryItem = {
      id: `hist_exp_${Date.now()}`,
      messName: currentBooking.messName,
      mealType: currentBooking.mealType,
      status: 'no-show',
      tokensUsed: 1,
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [expiredItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      await supabase
        .from('meal_bookings')
        .update({ status: 'expired' })
        .eq('otp', currentBooking.otp);
    } catch (e) {}
  };

  // Complete Active Booking (when used / verified by mess owner)
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
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [completedItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      await supabase
        .from('meal_bookings')
        .update({ status: 'completed' })
        .eq('otp', currentBooking.otp);
    } catch (e) {}
  };

  // Skip Meal (Deducts 1 skip pass from user balance)
  const skipMeal = async (): Promise<{ success: boolean; message?: string }> => {
    if (remainingSkips <= 0) {
      return { success: false, message: 'No remaining skip passes! Buy extra skips to pause meals.' };
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
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [skippedItem, ...mealHistory];
    setMealHistory(updatedHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(updatedHistory));

    try {
      await supabase.from('meal_history').insert({
        user_id: userId,
        mess_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        mess_name: 'Meal Skip Pass Used',
        meal_type: 'Lunch',
        status: 'skipped',
        tokens_used: 0,
      });
    } catch (e) {}

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

  // Toggle Mess Shortlist (Filters out both target ID & legacy equivalent)
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

  // Explicitly add mess to shortlist
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

  // Explicitly remove mess from shortlist
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
    return shortlistedMessIds.includes(messId) || (!!equiv && shortlistedMessIds.includes(equiv));
  };

  // Buy Extra Skips via Razorpay
  const buyExtraSkips = async (count: number, amountPaid: number) => {
    const newTotalSkips = totalSkips + count;
    const newRemSkips = remainingSkips + count;

    setTotalSkips(newTotalSkips);
    setRemainingSkips(newRemSkips);

    await saveStateToStorage(remainingTokens, newRemSkips, streakDays);
  };

  const buyPassPlan = async (planName: string, tokens: number, skips: number) => {
    const newTotalTokens = totalTokens + tokens;
    const newRemTokens = remainingTokens + tokens;
    const newTotalSkips = totalSkips + skips;
    const newRemSkips = remainingSkips + skips;

    setTotalTokens(newTotalTokens);
    setRemainingTokens(newRemTokens);
    setTotalSkips(newTotalSkips);
    setRemainingSkips(newRemSkips);
    setSubscriptionPlan(planName);

    await saveStateToStorage(newRemTokens, newRemSkips, streakDays);
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

export const useToken = (): TokenContextType => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};
