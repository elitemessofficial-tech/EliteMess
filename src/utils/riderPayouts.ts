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
 * Fetch all rider payouts from Supabase profiles and local AsyncStorage backup
 */
export async function getRiderPayouts(): Promise<RiderPayoutRecord[]> {
  try {
    let remotePayouts: RiderPayoutRecord[] = [];
    
    // Fetch all rider profiles to collect payouts saved in Supabase profiles.fcm_token
    try {
      const { data: riderProfiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, fcm_token')
        .eq('role', 'rider');

      if (!error && riderProfiles) {
        riderProfiles.forEach(prof => {
          if (prof.fcm_token) {
            try {
              const parsed = JSON.parse(prof.fcm_token);
              if (Array.isArray(parsed)) {
                remotePayouts.push(...parsed);
              }
            } catch (err) {
              // Ignore non-JSON fcm_tokens
            }
          }
        });
      }
    } catch (e) {
      console.warn('Supabase profiles payouts fetch notice:', e);
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

  // 2. Sync payout record to Supabase profile row
  try {
    const cleanPhone = (riderPhone || '').replace(/\D/g, '');

    // Find rider profile in Supabase
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, fcm_token')
      .or(`id.eq.${riderId},phone_number.eq.${riderPhone},phone_number.eq.+91${cleanPhone}`)
      .maybeSingle();

    if (prof) {
      let existingRemote: RiderPayoutRecord[] = [];
      if (prof.fcm_token) {
        try {
          const parsed = JSON.parse(prof.fcm_token);
          if (Array.isArray(parsed)) existingRemote = parsed;
        } catch (e) {}
      }
      
      // Avoid duplicate insert
      if (!existingRemote.some(p => p.id === newRecord.id)) {
        existingRemote.unshift(newRecord);
      }

      await supabase
        .from('profiles')
        .update({ fcm_token: JSON.stringify(existingRemote) })
        .eq('id', prof.id);
    }
  } catch (e) {
    console.warn('Could not sync payout to Supabase profiles (saved locally):', e);
  }

  // 3. Broadcast Realtime event for instant cross-device updates
  try {
    const channel = supabase.channel('rider_payouts_sync');
    channel.send({
      type: 'broadcast',
      event: 'PAYOUT_RECORDED',
      payload: newRecord
    });
  } catch (e) {
    console.warn('Broadcast sync error:', e);
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

  // 1. Filter deliveries matching rider if specific ID/phone is provided, else fallback to all passed deliveries
  let matchingDeliveries = riderDeliveries;
  if (cleanId || cleanPhone) {
    const filtered = riderDeliveries.filter(d => {
      const dRiderId = (d.rider_id || d.deliveries?.rider_id || '').toLowerCase();
      const dRiderPhone = (d.rider_phone || d.profiles?.phone_number || '').replace(/\D/g, '');
      if (!dRiderId && !dRiderPhone) return true; // Default match if legacy delivery row
      return (
        (cleanId && dRiderId === cleanId) ||
        (cleanPhone && cleanPhone.length >= 8 && dRiderPhone.endsWith(cleanPhone.slice(-10)))
      );
    });
    if (filtered.length > 0) {
      matchingDeliveries = filtered;
    }
  }

  const deliveryCount = matchingDeliveries.length;
  const baseEarnings = deliveryCount * 40;
  const tipEarnings = matchingDeliveries.reduce((sum, d) => {
    const tip = d.orders?.tip_amount || d.tip_amount || 0;
    return sum + (typeof tip === 'number' ? tip : parseFloat(tip) || 0);
  }, 0);

  const totalEarned = baseEarnings + tipEarnings;

  // 2. Filter payouts matching rider if specific ID/phone is provided
  let matchingPayouts = allPayouts;
  if (cleanId || cleanPhone) {
    const filteredP = allPayouts.filter(p => {
      const pRiderId = (p.rider_id || '').toLowerCase();
      const pRiderPhone = (p.rider_phone || '').replace(/\D/g, '');
      return (
        (cleanId && pRiderId === cleanId) ||
        (cleanPhone && cleanPhone.length >= 8 && pRiderPhone.endsWith(cleanPhone.slice(-10)))
      );
    });
    matchingPayouts = filteredP;
  }

  const totalValueGiven = matchingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 3. Pending Balance to Give
  const pendingToGive = Math.max(0, totalEarned - totalValueGiven);

  return {
    deliveryCount,
    baseEarnings,
    tipEarnings,
    totalEarned,
    totalValueGiven,
    pendingToGive,
    riderPayouts: matchingPayouts
  };
}
