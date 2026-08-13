import { useState, useEffect, useCallback } from 'react';
import { useToken, BookingDetails } from '../context/TokenContext';
import { getCurrentUserIdentity } from '../utils/userSession';
import { getMealPassFromNeon, getMessesFromNeon } from '../services/neon';

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

const CLEAN_PASS_DATA: PassData = {
  totalTokens: 0,
  remainingTokens: 0,
  totalSkips: 0,
  remainingSkips: 0,
  streakDays: 0,
  subscriptionPlan: 'No Active Subscription',
};

const VIP_PASS_DATA: PassData = {
  totalTokens: 60,
  remainingTokens: 42,
  totalSkips: 15,
  remainingSkips: 12,
  streakDays: 7,
  subscriptionPlan: 'College Gold Meal Pass',
};

const FALLBACK_FAVORITE_MESSES: FavoriteMess[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
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
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
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
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
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
  const [passData, setPassData] = useState<PassData>(CLEAN_PASS_DATA);
  const [favoriteMesses, setFavoriteMesses] = useState<FavoriteMess[]>(FALLBACK_FAVORITE_MESSES);
  const [userName, setUserName] = useState<string>('Student');
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoadingData(true);
      const user = await getCurrentUserIdentity();

      if (user.fullName) {
        const firstName = user.fullName.split(' ')[0];
        setUserName(firstName);
      } else {
        setUserName(user.isVip ? 'VIP Student' : 'Student');
      }

      // 1. Fetch Active Subscription Pass from Neon DB
      try {
        const pass = await getMealPassFromNeon(user.userId);

        if (pass) {
          setPassData({
            totalTokens: pass.total_tokens || 60,
            remainingTokens: pass.remaining_tokens ?? tokenContext.remainingTokens,
            totalSkips: pass.total_skips || 15,
            remainingSkips: pass.remaining_skips ?? tokenContext.remainingSkips,
            streakDays: pass.streak_days ?? tokenContext.streakDays,
            subscriptionPlan: pass.plan_name || 'College Gold Meal Pass',
          });
        } else if (user.isVip) {
          setPassData(VIP_PASS_DATA);
        } else {
          setPassData({
            totalTokens: tokenContext.totalTokens,
            remainingTokens: tokenContext.remainingTokens,
            totalSkips: tokenContext.totalSkips,
            remainingSkips: tokenContext.remainingSkips,
            streakDays: tokenContext.streakDays,
            subscriptionPlan: tokenContext.subscriptionPlan,
          });
        }
      } catch (e) {
        setPassData({
          totalTokens: tokenContext.totalTokens,
          remainingTokens: tokenContext.remainingTokens,
          totalSkips: tokenContext.totalSkips,
          remainingSkips: tokenContext.remainingSkips,
          streakDays: tokenContext.streakDays,
          subscriptionPlan: tokenContext.subscriptionPlan,
        });
      }

      // 2. Fetch Favorite Messes from Neon DB
      try {
        const messes = await getMessesFromNeon();

        if (messes && messes.length > 0) {
          const mappedMesses: FavoriteMess[] = messes.slice(0, 3).map((m) => ({
            id: m.id,
            name: m.name,
            address: m.address,
            rating: Number(m.rating || 4.8),
            image: m.image_url || FALLBACK_FAVORITE_MESSES[0].image,
            starDish: m.star_dish || 'Daily Special Thali',
            distance: m.distance || '300m (4 min walk)',
            cutoffTime: m.cutoff_time || '2:15 PM',
            visitCount: 15,
          }));
          setFavoriteMesses(mappedMesses);
        }
      } catch (e) {}
    } catch (e) {
      console.warn('Dashboard data fetch error:', e);
    } finally {
      setLoadingData(false);
    }
  }, [tokenContext.remainingTokens, tokenContext.remainingSkips, tokenContext.streakDays, tokenContext.totalTokens, tokenContext.subscriptionPlan]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    passData,
    activeBooking: tokenContext.activeBooking,
    favoriteMesses,
    userName,
    loadingData,
    refetch: fetchDashboardData,
  };
}
