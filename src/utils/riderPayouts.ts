import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export interface RiderPayoutRecord {
  id: string;
  rider_id: string;
  rider_name: string;
  rider_phone: string;
  amount: number;
  payment_method: 'UPI' | 'Cash' | 'Bank Transfer';
  reference_note: string;
  created_at: string;
}

const STORAGE_KEY = 'hotelbet_rider_payouts';

/**
 * Fetch all rider payouts from Supabase and local AsyncStorage backup
 */
export async function getRiderPayouts(): Promise<RiderPayoutRecord[]> {
  try {
    let remotePayouts: RiderPayoutRecord[] = [];
    
    // Try fetching from Supabase table if it exists
    try {
      const { data, error } = await supabase
        .from('rider_payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        remotePayouts = data as RiderPayoutRecord[];
      }
    } catch (e) {
      console.warn('Supabase rider_payouts fetch notice:', e);
    }

    // Fetch local backup from AsyncStorage
    const localStr = await AsyncStorage.getItem(STORAGE_KEY);
    const localPayouts: RiderPayoutRecord[] = localStr ? JSON.parse(localStr) : [];

    // Deduplicate and merge by ID
    const mergedMap = new Map<string, RiderPayoutRecord>();
    localPayouts.forEach(p => mergedMap.set(p.id, p));
    remotePayouts.forEach(p => mergedMap.set(p.id, p));

    const all = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Keep AsyncStorage synced
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all;
  } catch (e) {
    console.error('Error in getRiderPayouts:', e);
    return [];
  }
}

/**
 * Record a new payout given to a rider
 */
export async function recordRiderPayout(
  riderId: string,
  riderName: string,
  riderPhone: string,
  amount: number,
  paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer',
  referenceNote: string
): Promise<RiderPayoutRecord> {
  const newRecord: RiderPayoutRecord = {
    id: `payout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    rider_id: riderId,
    rider_name: riderName || 'Rider Staff',
    rider_phone: riderPhone || '',
    amount: Math.round(amount),
    payment_method: paymentMethod,
    reference_note: referenceNote || 'Settlement payout from owner',
    created_at: new Date().toISOString()
  };

  // 1. Write to local AsyncStorage immediately
  const existingStr = await AsyncStorage.getItem(STORAGE_KEY);
  const existing: RiderPayoutRecord[] = existingStr ? JSON.parse(existingStr) : [];
  existing.unshift(newRecord);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  // 2. Try pushing to Supabase
  try {
    await supabase.from('rider_payouts').insert(newRecord);
  } catch (e) {
    console.warn('Could not insert payout to Supabase table (saved locally):', e);
  }

  return newRecord;
}

/**
 * Calculate financial totals for a specific rider
 */
export function calculateRiderFinancials(
  riderIdOrPhone: string,
  riderDeliveries: any[],
  allPayouts: RiderPayoutRecord[]
) {
  const cleanId = (riderIdOrPhone || '').toLowerCase().trim();
  const cleanPhone = (riderIdOrPhone || '').replace(/\D/g, '');

  // 1. Calculate Income Earned (Deliveries count * 40 + tips)
  const completedDeliveries = riderDeliveries.filter(d => {
    const dRiderId = (d.rider_id || d.deliveries?.rider_id || '').toLowerCase();
    const dRiderPhone = (d.rider_phone || d.profiles?.phone_number || '').replace(/\D/g, '');
    return (
      (cleanId && dRiderId === cleanId) ||
      (cleanPhone && dRiderPhone.endsWith(cleanPhone.slice(-10)))
    );
  });

  const deliveryCount = completedDeliveries.length;
  const baseEarnings = deliveryCount * 40;
  const tipEarnings = completedDeliveries.reduce((sum, d) => {
    const tip = d.orders?.tip_amount || d.tip_amount || 0;
    return sum + (typeof tip === 'number' ? tip : parseFloat(tip) || 0);
  }, 0);

  const totalEarned = baseEarnings + tipEarnings;

  // 2. Calculate Total Value Given / Paid
  const riderPayouts = allPayouts.filter(p => {
    const pRiderId = (p.rider_id || '').toLowerCase();
    const pRiderPhone = (p.rider_phone || '').replace(/\D/g, '');
    return (
      (cleanId && pRiderId === cleanId) ||
      (cleanPhone && cleanPhone.length >= 8 && pRiderPhone.endsWith(cleanPhone.slice(-10)))
    );
  });

  const totalValueGiven = riderPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 3. Pending Balance to Give
  const pendingToGive = Math.max(0, totalEarned - totalValueGiven);

  return {
    deliveryCount,
    baseEarnings,
    tipEarnings,
    totalEarned,
    totalValueGiven,
    pendingToGive,
    riderPayouts
  };
}
