import { Platform, DeviceEventEmitter } from 'react-native';
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

// ----------------------------------------------------------------------
// 5. MESS OWNER OPERATIONS
// ----------------------------------------------------------------------
export interface OwnerVerifiedLogItem {
  id: string;
  studentName: string;
  collegeId: string;
  otp: string;
  mealType: string;
  verifiedAt: string;
  status?: string;
}

export async function updateMessMenuInNeon(
  messId: string,
  starDish: string,
  cutoffTime: string,
  highlights?: string[]
): Promise<boolean> {
  try {
    if (highlights && highlights.length > 0) {
      await sql`
        UPDATE public.messes
        SET star_dish = ${starDish}, cutoff_time = ${cutoffTime}, highlights = ${highlights}
        WHERE id = ${messId};
      `;
    } else {
      await sql`
        UPDATE public.messes
        SET star_dish = ${starDish}, cutoff_time = ${cutoffTime}
        WHERE id = ${messId};
      `;
    }

    // Broadcast live event to all customer screens & tabs
    const payload = { messId, starDish, cutoffTime, highlights, timestamp: Date.now() };
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ELITEMESS_MENU_UPDATED', { detail: payload }));
        try {
          localStorage.setItem('ELITEMESS_LAST_MENU_UPDATE', JSON.stringify(payload));
        } catch (e) {}
      }
      DeviceEventEmitter.emit('ELITEMESS_MENU_UPDATED', payload);
    } catch (e) {}

    return true;
  } catch (error) {
    console.warn('[Neon DB] Update mess menu error:', error);
    return false;
  }
}

export async function getMessOwnerDataFromNeon(messId: string): Promise<{
  mess: MessDBRecord | null;
  liveHeadcount: number;
  verifiedCount: number;
  verifiedLog: OwnerVerifiedLogItem[];
}> {
  try {
    // 1. Get Mess Record
    const messRows = await sql`
      SELECT id, name, address, latitude, longitude, rating, distance, star_dish, image_url, highlights, cutoff_time, type, is_active
      FROM public.messes
      WHERE id = ${messId}
      LIMIT 1
    `;
    const mess = messRows.length > 0 ? (messRows[0] as MessDBRecord) : null;

    // 2. Get Live Booked Headcount (Active bookings today)
    const headcountRows = await sql`
      SELECT COUNT(*) as count
      FROM public.meal_bookings
      WHERE mess_id = ${messId} 
        AND status = 'booked'
        AND created_at >= NOW() - INTERVAL '24 HOURS'
    `;
    const liveHeadcount = headcountRows.length > 0 ? Number(headcountRows[0].count) : 0;

    // 3. Get Verified Headcount & Log
    const verifiedRows = await sql`
      SELECT b.id, b.user_id, b.otp, b.meal_type, b.status, b.created_at, p.full_name, p.phone_number
      FROM public.meal_bookings b
      LEFT JOIN public.profiles p ON b.user_id = p.id
      WHERE b.mess_id = ${messId} 
        AND (b.status = 'verified' OR b.status = 'completed')
        AND b.created_at >= NOW() - INTERVAL '24 HOURS'
      ORDER BY b.created_at DESC
      LIMIT 25
    `;

    const verifiedCount = verifiedRows.length;
    const verifiedLog: OwnerVerifiedLogItem[] = verifiedRows.map((r: any) => {
      const studentNum = (r.user_id || '').slice(-4) || '409';
      return {
        id: r.id,
        studentName: r.full_name || `Student #${studentNum}`,
        collegeId: r.phone_number ? `+91 ${r.phone_number.slice(-10)}` : `2026-CAMPUS-${studentNum}`,
        otp: r.otp || '****',
        mealType: r.meal_type || 'Lunch',
        verifiedAt: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: r.status,
      };
    });

    return {
      mess,
      liveHeadcount,
      verifiedCount,
      verifiedLog,
    };
  } catch (error) {
    console.warn('[Neon DB] getMessOwnerData error:', error);
    return {
      mess: null,
      liveHeadcount: 0,
      verifiedCount: 0,
      verifiedLog: [],
    };
  }
}

export async function verifyOwnerOtpInNeon(
  messId: string,
  enteredOtp: string
): Promise<{
  success: boolean;
  message: string;
  entry?: OwnerVerifiedLogItem;
}> {
  try {
    const cleanOtp = enteredOtp.trim().replace(/\D/g, '');
    if (!cleanOtp) {
      return { success: false, message: 'Please enter a valid numeric OTP.' };
    }

    // Match OTP (full 8 digits, 4 digits, or suffix/prefix match)
    const bookingRows = await sql`
      SELECT b.id, b.user_id, b.mess_id, b.meal_type, b.otp, b.status, b.created_at, p.full_name, p.phone_number, m.name as mess_name
      FROM public.meal_bookings b
      LEFT JOIN public.profiles p ON b.user_id = p.id
      LEFT JOIN public.messes m ON b.mess_id = m.id
      WHERE (b.mess_id = ${messId} OR ${messId} = '') 
        AND b.status = 'booked'
        AND (b.otp = ${cleanOtp} OR b.otp LIKE ${'%' + cleanOtp} OR ${cleanOtp} LIKE b.otp || '%')
      ORDER BY b.created_at DESC
      LIMIT 1
    `;

    if (bookingRows.length === 0) {
      return {
        success: false,
        message: `No active booking found for OTP "${enteredOtp}". Please ensure the student has booked and the OTP is active.`,
      };
    }

    const booking = bookingRows[0] as any;

    // Mark as completed in Neon
    await sql`
      UPDATE public.meal_bookings
      SET status = 'completed'
      WHERE id = ${booking.id};
    `;

    // Insert into meal history
    await sql`
      INSERT INTO public.meal_history (user_id, mess_name, meal_type, status, tokens_used)
      VALUES (${booking.user_id}, ${booking.mess_name || 'Campus Mess'}, ${booking.meal_type}, 'completed', 1);
    `;

    const studentNum = (booking.user_id || '').slice(-4) || '849';
    const entry: OwnerVerifiedLogItem = {
      id: booking.id,
      studentName: booking.full_name || `Student #${studentNum}`,
      collegeId: booking.phone_number ? `+91 ${booking.phone_number.slice(-10)}` : `2026-CAMPUS-${studentNum}`,
      otp: booking.otp,
      mealType: booking.meal_type || 'Lunch',
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'completed',
    };

    // Broadcast live verification event so customer screen immediately clears active booking & cancel button
    const payload = {
      otp: booking.otp,
      userId: booking.user_id,
      messName: booking.mess_name || 'Campus Mess',
      mealType: booking.meal_type || 'Lunch',
      status: 'completed',
      timestamp: Date.now(),
    };

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ELITEMESS_BOOKING_VERIFIED', { detail: payload }));
        try {
          localStorage.setItem('ELITEMESS_LAST_BOOKING_VERIFIED', JSON.stringify(payload));
          localStorage.setItem('mealhop_active_booking', 'COMPLETED');
          if (booking.user_id) {
            localStorage.setItem(`mealhop_active_booking_${booking.user_id}`, 'COMPLETED');
          }
        } catch (e) {}
      }
      DeviceEventEmitter.emit('ELITEMESS_BOOKING_VERIFIED', payload);
    } catch (e) {}

    return {
      success: true,
      message: `Verified! 1 Token redeemed for ${entry.studentName} (${entry.mealType}).`,
      entry,
    };
  } catch (error) {
    console.warn('[Neon DB] verifyOwnerOtp error:', error);
    return {
      success: false,
      message: 'Database error while verifying OTP. Please try again.',
    };
  }
}

