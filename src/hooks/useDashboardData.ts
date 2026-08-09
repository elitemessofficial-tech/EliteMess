import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useToken, BookingDetails } from '../context/TokenContext';

export interface PassData {
  totalTokens: number;
  remainingTokens: number;
  totalSkips: number;
  remainingSkips: number;
  streakDays: number;
  subscriptionPlan: string;
}

export interface FavoriteMess {
  id: string;
  name: string;
  address: string;
  rating: number;
  image: string;
  starDish: string;
  distance: string;
  cutoffTime: string;
  visitCount: number;
}

const FALLBACK_PASS_DATA: PassData = {
  totalTokens: 60,
  remainingTokens: 42,
  totalSkips: 15,
  remainingSkips: 12,
  streakDays: 7,
  subscriptionPlan: 'College Gold Meal Pass',
};

const FALLBACK_FAVORITE_MESSES: FavoriteMess[] = [
  {
    id: 'mess_1',
    name: 'Annapurna Campus Mess',
    address: 'Gate 2, North Campus',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    starDish: 'Shahi Paneer & Butter Naan',
    distance: '250m (3 min walk)',
    cutoffTime: '2:15 PM',
    visitCount: 18,
  },
  {
    id: 'mess_2',
    name: 'Royal Spice Dining Hall',
    address: 'Hostel Block B Road',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    starDish: 'Hyderabadi Chicken Biryani',
    distance: '450m (5 min walk)',
    cutoffTime: '2:30 PM',
    visitCount: 14,
  },
  {
    id: 'mess_3',
    name: 'Green Leaf Premium Mess',
    address: 'University Circle, West Campus',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    starDish: 'Kathiyawadi Thali Special',
    distance: '600m (7 min walk)',
    cutoffTime: '2:00 PM',
    visitCount: 9,
  },
];

export function useDashboardData() {
  const tokenContext = useToken();
  const [passData, setPassData] = useState<PassData>(FALLBACK_PASS_DATA);
  const [activeBooking, setActiveBooking] = useState<BookingDetails | null>(tokenContext.activeBooking);
  const [favoriteMesses, setFavoriteMesses] = useState<FavoriteMess[]>(FALLBACK_FAVORITE_MESSES);
  const [userName, setUserName] = useState<string>('Alex');
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Sync tokenContext active booking
  useEffect(() => {
    setActiveBooking(tokenContext.activeBooking);
  }, [tokenContext.activeBooking]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);

      // 1. Fetch User Profile
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .single();

        if (profile?.full_name) {
          const firstName = profile.full_name.split(' ')[0];
          setUserName(firstName);
        }
      } catch (e) {
        // Fallback silently if profiles table doesn't exist
      }

      // 2. Fetch Active Subscription Pass
      try {
        const { data: pass } = await supabase
          .from('meal_passes')
          .select('*')
          .eq('status', 'active')
          .single();

        if (pass) {
          setPassData({
            totalTokens: pass.total_tokens || 60,
            remainingTokens: pass.remaining_tokens || tokenContext.remainingTokens,
            totalSkips: pass.total_skips || 15,
            remainingSkips: pass.remaining_skips || tokenContext.remainingSkips,
            streakDays: pass.streak_days || tokenContext.streakDays,
            subscriptionPlan: pass.plan_name || 'College Gold Meal Pass',
          });
        }
      } catch (e) {
        // Fallback silently to Context/Local state
      }

      // 3. Fetch Active Booking from Supabase if any
      try {
        const { data: booking } = await supabase
          .from('meal_bookings')
          .select('*, messes(*)')
          .eq('status', 'booked')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (booking) {
          const mappedBooking: BookingDetails = {
            bookingId: booking.id,
            messId: booking.mess_id,
            messName: booking.messes?.name || 'Partner Mess',
            messAddress: booking.messes?.address || 'Campus Hub',
            mealType: booking.meal_type || 'Lunch',
            menuHighlights: booking.messes?.highlights || ['Daily Special'],
            otp: booking.otp || '8492',
            otpExpiresAt: booking.expires_at || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: 'booked',
            bookedAt: booking.created_at,
            cutoffTime: booking.cutoff_time || '2:30 PM',
          };
          setActiveBooking(mappedBooking);
        }
      } catch (e) {
        // Fallback silently to TokenContext booking
      }

      // 4. Fetch Favorite Messes
      try {
        const { data: messes } = await supabase
          .from('messes')
          .select('*')
          .order('rating', { ascending: false })
          .limit(3);

        if (messes && messes.length > 0) {
          const mappedMesses: FavoriteMess[] = messes.map((m: any) => ({
            id: m.id,
            name: m.name,
            address: m.address,
            rating: parseFloat(m.rating || '4.8'),
            image: m.image_url || FALLBACK_FAVORITE_MESSES[0].image,
            starDish: m.star_dish || 'Daily Special Thali',
            distance: m.distance || '300m (4 min walk)',
            cutoffTime: m.cutoff_time || '2:15 PM',
            visitCount: m.visit_count || 12,
          }));
          setFavoriteMesses(mappedMesses);
        }
      } catch (e) {
        // Fallback silently to FALLBACK_FAVORITE_MESSES
      }
    } catch (e) {
      console.warn('Dashboard data fetch error (falling back to local state):', e);
    } finally {
      setLoadingData(false);
    }
  }, [tokenContext.remainingTokens, tokenContext.remainingSkips, tokenContext.streakDays]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    passData,
    activeBooking: activeBooking || tokenContext.activeBooking,
    favoriteMesses,
    userName,
    loadingData,
    refetch: fetchDashboardData,
  };
}
