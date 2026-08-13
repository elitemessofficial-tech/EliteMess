import { neon } from '@neondatabase/serverless';
import { getNeonDatabaseUrl } from '../config/neonConfig';

// Initialize the serverless SQL query function
const dbUrl = getNeonDatabaseUrl();
export const sql = neon(dbUrl, { disableWarningInBrowsers: true });

export interface MessDBRecord {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  distance: string;
  star_dish: string;
  image_url: string;
  highlights: string[];
  cutoff_time: string;
  type: string;
  is_active: boolean;
}

export interface MealPassDBRecord {
  id: string;
  user_id: string;
  plan_name: string;
  total_tokens: number;
  remaining_tokens: number;
  total_skips: number;
  remaining_skips: number;
  streak_days: number;
  status: string;
}

export interface MealBookingDBRecord {
  id: string;
  user_id: string;
  mess_id: string;
  meal_type: string;
  otp: string;
  otp_expires_at: string;
  cutoff_time: string;
  status: string;
  created_at: string;
  mess_name?: string;
  mess_address?: string;
}

export interface MealHistoryDBRecord {
  id: string;
  user_id: string;
  mess_name: string;
  meal_type: string;
  status: string;
  tokens_used: number;
  created_at: string;
}

// ----------------------------------------------------------------------
// 1. MESSES OPERATIONS
// ----------------------------------------------------------------------
export async function getMessesFromNeon(): Promise<MessDBRecord[]> {
  try {
    const rows = await sql`
      SELECT id, name, address, latitude, longitude, rating, distance, star_dish, image_url, highlights, cutoff_time, type, is_active
      FROM public.messes
      WHERE is_active = true
      ORDER BY rating DESC
    `;
    return rows as MessDBRecord[];
  } catch (error) {
    console.warn('[Neon DB] Fetch messes fallback:', error);
    return [];
  }
}

export async function getMessByIdFromNeon(messId: string): Promise<MessDBRecord | null> {
  try {
    const rows = await sql`
      SELECT id, name, address, latitude, longitude, rating, distance, star_dish, image_url, highlights, cutoff_time, type, is_active
      FROM public.messes
      WHERE id = ${messId}
      LIMIT 1
    `;
    return rows.length > 0 ? (rows[0] as MessDBRecord) : null;
  } catch (error) {
    return null;
  }
}

// ----------------------------------------------------------------------
// 2. MEAL PASSES OPERATIONS
// ----------------------------------------------------------------------
export async function getMealPassFromNeon(userId: string): Promise<MealPassDBRecord | null> {
  try {
    const rows = await sql`
      SELECT id, user_id, plan_name, total_tokens, remaining_tokens, total_skips, remaining_skips, streak_days, status
      FROM public.meal_passes
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return rows.length > 0 ? (rows[0] as MealPassDBRecord) : null;
  } catch (error) {
    return null;
  }
}

export async function upsertMealPassInNeon(
  userId: string,
  planName: string,
  totalTokens: number,
  remainingTokens: number,
  totalSkips: number,
  remainingSkips: number,
  streakDays: number
): Promise<void> {
  try {
    await sql`
      INSERT INTO public.meal_passes (user_id, plan_name, total_tokens, remaining_tokens, total_skips, remaining_skips, streak_days, status, updated_at)
      VALUES (${userId}, ${planName}, ${totalTokens}, ${remainingTokens}, ${totalSkips}, ${remainingSkips}, ${streakDays}, 'active', NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        plan_name = EXCLUDED.plan_name,
        total_tokens = EXCLUDED.total_tokens,
        remaining_tokens = EXCLUDED.remaining_tokens,
        total_skips = EXCLUDED.total_skips,
        remaining_skips = EXCLUDED.remaining_skips,
        streak_days = EXCLUDED.streak_days,
        updated_at = NOW();
    `;
  } catch (error) {
    console.warn('[Neon DB] Upsert meal pass error:', error);
  }
}

// ----------------------------------------------------------------------
// 3. MEAL BOOKINGS OPERATIONS
// ----------------------------------------------------------------------
export async function getActiveBookingFromNeon(userId: string): Promise<MealBookingDBRecord | null> {
  try {
    const rows = await sql`
      SELECT b.id, b.user_id, b.mess_id, b.meal_type, b.otp, b.otp_expires_at, b.cutoff_time, b.status, b.created_at, m.name as mess_name, m.address as mess_address
      FROM public.meal_bookings b
      LEFT JOIN public.messes m ON b.mess_id = m.id
      WHERE b.user_id = ${userId} AND b.status = 'booked'
      ORDER BY b.created_at DESC
      LIMIT 1
    `;
    return rows.length > 0 ? (rows[0] as MealBookingDBRecord) : null;
  } catch (error) {
    return null;
  }
}

export async function createBookingInNeon(
  userId: string,
  messId: string,
  mealType: string,
  otp: string,
  otpExpiresAt: string,
  cutoffTime: string
): Promise<string | null> {
  try {
    const rows = await sql`
      INSERT INTO public.meal_bookings (user_id, mess_id, meal_type, otp, otp_expires_at, cutoff_time, status)
      VALUES (${userId}, ${messId}, ${mealType}, ${otp}, ${otpExpiresAt}, ${cutoffTime}, 'booked')
      RETURNING id;
    `;
    return rows.length > 0 ? (rows[0].id as string) : null;
  } catch (error) {
    console.warn('[Neon DB] Create booking error:', error);
    return null;
  }
}

export async function updateBookingStatusInNeon(bookingId: string, status: string): Promise<void> {
  try {
    await sql`
      UPDATE public.meal_bookings
      SET status = ${status}
      WHERE id = ${bookingId};
    `;
  } catch (error) {
    console.warn('[Neon DB] Update booking status error:', error);
  }
}

// ----------------------------------------------------------------------
// 4. MEAL HISTORY OPERATIONS
// ----------------------------------------------------------------------
export async function getMealHistoryFromNeon(userId: string): Promise<MealHistoryDBRecord[]> {
  try {
    const rows = await sql`
      SELECT id, user_id, mess_name, meal_type, status, tokens_used, created_at
      FROM public.meal_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 30
    `;
    return rows as MealHistoryDBRecord[];
  } catch (error) {
    return [];
  }
}

export async function insertMealHistoryItemInNeon(
  userId: string,
  messName: string,
  mealType: string,
  status: string,
  tokensUsed: number
): Promise<void> {
  try {
    await sql`
      INSERT INTO public.meal_history (user_id, mess_name, meal_type, status, tokens_used)
      VALUES (${userId}, ${messName}, ${mealType}, ${status}, ${tokensUsed});
    `;
  } catch (error) {
    console.warn('[Neon DB] Insert meal history error:', error);
  }
}
