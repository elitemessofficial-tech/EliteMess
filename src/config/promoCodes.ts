import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export type PromoStatus = 'available' | 'given' | 'used' | 'invalid';

export interface PromoCode {
  code: string;
  discountAmount: number;
}

export interface PromoCodeItem {
  code: string;
  discountAmount: number;
  status: PromoStatus;
  usedBy?: string;
  usedAt?: string;
}

// 100 Random 8-digit Alphanumeric Promo Codes
export const INITIAL_PROMO_CODES: PromoCode[] = [
  { code: "1IBZEWSI", discountAmount: 50 },
  { code: "NSX1N59I", discountAmount: 50 },
  { code: "JJIW3GGY", discountAmount: 50 },
  { code: "1JI0IOXW", discountAmount: 50 },
  { code: "M3HNEU2A", discountAmount: 50 },
  { code: "QID4SO9V", discountAmount: 50 },
  { code: "5NHJJ2GF", discountAmount: 50 },
  { code: "35TTPDWK", discountAmount: 50 },
  { code: "X68HZSH6", discountAmount: 50 },
  { code: "4GHUZL4Q", discountAmount: 50 },
  { code: "O9E0MPUR", discountAmount: 50 },
  { code: "6S7D1MVP", discountAmount: 50 },
  { code: "7D9V0XKZ", discountAmount: 50 },
  { code: "K82LN51W", discountAmount: 50 },
  { code: "P49XMT2E", discountAmount: 50 },
  { code: "B91Q0AZM", discountAmount: 50 },
  { code: "W71K4V99", discountAmount: 50 },
  { code: "R62H8LP3", discountAmount: 50 },
  { code: "M90X1K7L", discountAmount: 50 },
  { code: "Y34B9C2D", discountAmount: 50 },
  { code: "L56T8P11", discountAmount: 50 },
  { code: "H78V2K3M", discountAmount: 50 },
  { code: "Z12X9C4V", discountAmount: 50 },
  { code: "N56M7K8L", discountAmount: 50 },
  { code: "F34G5H6J", discountAmount: 50 },
  { code: "D78S9A1Q", discountAmount: 50 },
  { code: "W23E4R5T", discountAmount: 50 },
  { code: "Y67U8I9O", discountAmount: 50 },
  { code: "P01L2K3J", discountAmount: 50 },
  { code: "H45G6F7D", discountAmount: 50 },
  { code: "S89A1Q2W", discountAmount: 50 },
  { code: "E34R5T6Y", discountAmount: 50 },
  { code: "U78I9O0P", discountAmount: 50 },
  { code: "L12K3J4H", discountAmount: 50 },
  { code: "G56F7D8S", discountAmount: 50 },
  { code: "A90Q1W2E", discountAmount: 50 },
  { code: "R34T5Y6U", discountAmount: 50 },
  { code: "I78O9P0L", discountAmount: 50 },
  { code: "K12J3H4G", discountAmount: 50 },
  { code: "F56D7S8A", discountAmount: 50 },
  { code: "Q90W1E2R", discountAmount: 50 },
  { code: "T34Y5U6I", discountAmount: 50 },
  { code: "O78P0L1K", discountAmount: 50 },
  { code: "J23H4G5F", discountAmount: 50 },
  { code: "D67S8A9Q", discountAmount: 50 },
  { code: "W01E2R3T", discountAmount: 50 },
  { code: "Y45U6I7O", discountAmount: 50 },
  { code: "P89L0K1J", discountAmount: 50 },
  { code: "H23G4F5D", discountAmount: 50 },
  { code: "S67A8Q9W", discountAmount: 50 },
  { code: "E01R2T3Y", discountAmount: 50 },
  { code: "U45I6O7P", discountAmount: 50 },
  { code: "L89K0J1H", discountAmount: 50 },
  { code: "G23F4D5S", discountAmount: 50 },
  { code: "A67Q8W9E", discountAmount: 50 },
  { code: "R01T2Y3U", discountAmount: 50 },
  { code: "I45O6P7L", discountAmount: 50 },
  { code: "K89J0H1G", discountAmount: 50 },
  { code: "F23D4S5A", discountAmount: 50 },
  { code: "Q67W8E9R", discountAmount: 50 },
  { code: "T01Y2U3I", discountAmount: 50 },
  { code: "O45P6L7K", discountAmount: 50 },
  { code: "J89H0G1F", discountAmount: 50 },
  { code: "D23S4A5Q", discountAmount: 50 },
  { code: "W67E8R9T", discountAmount: 50 },
  { code: "Y01U2I3O", discountAmount: 50 },
  { code: "P45L6K7J", discountAmount: 50 },
  { code: "H89G0F1D", discountAmount: 50 },
  { code: "S23A4Q5W", discountAmount: 50 },
  { code: "E67R8T9Y", discountAmount: 50 },
  { code: "U01I2O3P", discountAmount: 50 },
  { code: "L45K6J7H", discountAmount: 50 },
  { code: "G89F0D1S", discountAmount: 50 },
  { code: "A23Q4W5E", discountAmount: 50 },
  { code: "R67T8Y9U", discountAmount: 50 },
  { code: "I01O2P3L", discountAmount: 50 },
  { code: "K45J6H7G", discountAmount: 50 },
  { code: "F89D0S1A", discountAmount: 50 },
  { code: "Q23W4E5R", discountAmount: 50 },
  { code: "T67Y8U9I", discountAmount: 50 },
  { code: "O01P2L3K", discountAmount: 50 },
  { code: "J45H6G7F", discountAmount: 50 },
  { code: "D89S0A1Q", discountAmount: 50 },
  { code: "W23E4R51", discountAmount: 50 },
  { code: "Y67U8I92", discountAmount: 50 },
  { code: "P01L2K33", discountAmount: 50 },
  { code: "H45G6F74", discountAmount: 50 },
  { code: "S89A1Q25", discountAmount: 50 },
  { code: "E34R5T66", discountAmount: 50 },
  { code: "U78I9O07", discountAmount: 50 },
  { code: "L12K3J48", discountAmount: 50 },
  { code: "G56F7D89", discountAmount: 50 },
  { code: "A90Q1W20", discountAmount: 50 },
  { code: "R34T5Y61", discountAmount: 50 },
  { code: "I78O9P02", discountAmount: 50 },
  { code: "K12J3H43", discountAmount: 50 },
  { code: "F56D7S84", discountAmount: 50 },
  { code: "Q90W1E25", discountAmount: 50 },
  { code: "T34Y5U66", discountAmount: 50 }
];

const USED_PROMO_CODES_KEY = 'hotelbet_used_promocodes_v1';
const PROMO_STATUSES_KEY = 'hotelbet_owner_promocode_statuses_v1';

export async function getOwnerPromoCodesList(): Promise<PromoCodeItem[]> {
  try {
    const statusMapStr = await AsyncStorage.getItem(PROMO_STATUSES_KEY);
    const statusMap: Record<string, { status: PromoStatus; usedBy?: string; usedAt?: string }> = statusMapStr ? JSON.parse(statusMapStr) : {};

    const usedCodesStr = await AsyncStorage.getItem(USED_PROMO_CODES_KEY);
    const usedCodes: string[] = usedCodesStr ? JSON.parse(usedCodesStr) : [];

    return INITIAL_PROMO_CODES.map(p => {
      const stored = statusMap[p.code];
      let status: PromoStatus = stored?.status || 'available';
      if (usedCodes.includes(p.code)) {
        status = 'used';
      }
      return {
        code: p.code,
        discountAmount: p.discountAmount,
        status,
        usedBy: stored?.usedBy,
        usedAt: stored?.usedAt
      };
    });
  } catch (e) {
    console.error('Failed to get promo codes list:', e);
    return INITIAL_PROMO_CODES.map(p => ({ code: p.code, discountAmount: p.discountAmount, status: 'available' }));
  }
}

export async function updatePromoCodeStatus(
  code: string,
  newStatus: PromoStatus,
  usedBy?: string
): Promise<void> {
  const cleanCode = code.trim().toUpperCase();
  try {
    const statusMapStr = await AsyncStorage.getItem(PROMO_STATUSES_KEY);
    const statusMap = statusMapStr ? JSON.parse(statusMapStr) : {};
    statusMap[cleanCode] = {
      status: newStatus,
      usedBy,
      usedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(PROMO_STATUSES_KEY, JSON.stringify(statusMap));

    if (newStatus === 'used') {
      const usedCodesStr = await AsyncStorage.getItem(USED_PROMO_CODES_KEY);
      const usedCodes: string[] = usedCodesStr ? JSON.parse(usedCodesStr) : [];
      if (!usedCodes.includes(cleanCode)) {
        usedCodes.push(cleanCode);
        await AsyncStorage.setItem(USED_PROMO_CODES_KEY, JSON.stringify(usedCodes));
      }
    }
  } catch (e) {
    console.error('Failed to update promo code status:', e);
  }
}

export async function validateAndApplyPromoCode(
  inputCode: string,
  subtotal: number
): Promise<{ success: boolean; discountAmount: number; message: string }> {
  const cleanCode = inputCode.trim().toUpperCase();

  if (!cleanCode) {
    return { success: false, discountAmount: 0, message: 'Please enter a promo code.' };
  }

  if (subtotal < 500) {
    return {
      success: false,
      discountAmount: 0,
      message: 'Promo codes are valid only on orders above ₹500.'
    };
  }

  const foundInSeed = INITIAL_PROMO_CODES.find(p => p.code === cleanCode);
  if (!foundInSeed) {
    return {
      success: false,
      discountAmount: 0,
      message: 'Invalid promo code. Please check and try again.'
    };
  }

  // Check owner status map for revocation or previous claim
  const statusMapStr = await AsyncStorage.getItem(PROMO_STATUSES_KEY);
  const statusMap: Record<string, { status: PromoStatus }> = statusMapStr ? JSON.parse(statusMapStr) : {};
  const storedInfo = statusMap[cleanCode];

  if (storedInfo && storedInfo.status === 'invalid') {
    return {
      success: false,
      discountAmount: 0,
      message: 'This promo code has been invalidated by the restaurant.'
    };
  }

  // Check local used list
  const usedCodesStr = await AsyncStorage.getItem(USED_PROMO_CODES_KEY);
  const usedCodes: string[] = usedCodesStr ? JSON.parse(usedCodesStr) : [];

  if (usedCodes.includes(cleanCode) || (storedInfo && storedInfo.status === 'used')) {
    return {
      success: false,
      discountAmount: 0,
      message: 'This promo code has already been claimed and is no longer valid.'
    };
  }

  return {
    success: true,
    discountAmount: foundInSeed.discountAmount,
    message: `Promo code ${cleanCode} applied! Saved ₹${foundInSeed.discountAmount}`
  };
}

export async function markPromoCodeAsUsed(code: string, userId: string): Promise<void> {
  await updatePromoCodeStatus(code, 'used', userId);
}
