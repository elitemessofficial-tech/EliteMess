import { supabase } from './supabase';

export interface MessRestaurantDB {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  distance: string;
  star_dish: string;
  image_url: string;
  highlights: string[];
  cutoff_time: string;
  type: string;
  is_active: boolean;
}

export const SEED_RESTAURANT_MESSES: MessRestaurantDB[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Annapurna Campus Mess',
    address: 'Gate 2, North Campus',
    latitude: 18.5204,
    longitude: 73.8567,
    rating: 4.9,
    distance: '250m (3 min walk)',
    star_dish: 'Special Shahi Paneer & Butter Naan',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    highlights: ['Shahi Paneer', 'Dal Makhani', 'Garlic Naan', 'Jeera Rice', 'Gulab Jamun'],
    cutoff_time: '2:15 PM',
    type: 'Pure Veg',
    is_active: true,
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    name: 'Royal Spice Dining Hall',
    address: 'Hostel Block B Road',
    latitude: 18.5314,
    longitude: 73.8447,
    rating: 4.8,
    distance: '450m (5 min walk)',
    star_dish: 'Hyderabadi Chicken Biryani',
    image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    highlights: ['Chicken Dum Biryani', 'Mirchi Ka Salan', 'Raita', 'Double Ka Meetha'],
    cutoff_time: '2:30 PM',
    type: 'Non-Veg & Veg',
    is_active: true,
  },
  {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Green Leaf Premium Mess',
    address: 'University Circle, West Campus',
    latitude: 18.5114,
    longitude: 73.8347,
    rating: 4.7,
    distance: '600m (7 min walk)',
    star_dish: 'Kathiyawadi Thali Special',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    highlights: ['Sev Tamatar', 'Baingan Bharta', 'Phulka Roti', 'Chaas', 'Jalebi'],
    cutoff_time: '2:00 PM',
    type: 'Kathiyawadi Veg',
    is_active: true,
  },
  {
    id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
    name: 'Campus Cloud Kitchen',
    address: 'East Tech Hub, Block D',
    latitude: 18.5414,
    longitude: 73.8247,
    rating: 4.8,
    distance: '350m (4 min walk)',
    star_dish: 'Paneer Butter Masala Box',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    highlights: ['Paneer Butter Masala', 'Jeera Rice', 'Butter Roti', 'Sweet Kheer'],
    cutoff_time: '2:45 PM',
    type: 'Express Veg',
    is_active: true,
  },
  {
    id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
    name: 'Spice Route Punjabi Mess',
    address: 'South Gate Hostel Square',
    latitude: 18.5014,
    longitude: 73.8647,
    rating: 4.9,
    distance: '500m (6 min walk)',
    star_dish: 'Amritsari Kulcha & Chole',
    image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
    highlights: ['Amritsari Stuffed Kulcha', 'Pindi Chole', 'Lassi', 'Sweet Boondi'],
    cutoff_time: '2:20 PM',
    type: 'Punjabi Special',
    is_active: true,
  },
];

/**
 * Ensures all Supabase tables (messes, meal_passes, meal_history) have initial real records
 * so the application reads and writes 100% real database rows.
 */
export async function ensureDatabaseInitialized(userId: string = 'customer_token_user') {
  try {
    // 1. Ensure Partner Mess Restaurants Exist in Supabase
    const { data: existingMesses, error: messErr } = await supabase
      .from('messes')
      .select('id');

    if (!messErr && (!existingMesses || existingMesses.length === 0)) {
      console.log('Seeding initial real restaurant messes into Supabase database...');
      await supabase.from('messes').insert(SEED_RESTAURANT_MESSES);
    }

    // 2. Ensure User Active Pass Exists in Supabase
    const { data: existingPass, error: passErr } = await supabase
      .from('meal_passes')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!passErr && !existingPass) {
      console.log('Seeding initial real user pass into Supabase database...');
      await supabase.from('meal_passes').insert({
        user_id: userId,
        plan_name: 'College Gold Meal Pass',
        total_tokens: 60,
        remaining_tokens: 42,
        total_skips: 15,
        remaining_skips: 12,
        streak_days: 7,
        status: 'active',
      });
    }

    // 3. Ensure Initial Meal History Exists in Supabase
    const { data: existingHistory, error: histErr } = await supabase
      .from('meal_history')
      .select('id')
      .eq('user_id', userId);

    if (!histErr && (!existingHistory || existingHistory.length === 0)) {
      console.log('Seeding initial real meal history logs into Supabase database...');
      await supabase.from('meal_history').insert([
        {
          user_id: userId,
          mess_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          mess_name: 'Annapurna Campus Mess',
          meal_type: 'Lunch',
          status: 'completed',
          tokens_used: 1,
        },
        {
          user_id: userId,
          mess_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
          mess_name: 'Royal Spice Dining Hall',
          meal_type: 'Dinner',
          status: 'completed',
          tokens_used: 1,
        },
        {
          user_id: userId,
          mess_id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
          mess_name: 'Green Leaf Premium Mess',
          meal_type: 'Lunch',
          status: 'skipped',
          tokens_used: 0,
        },
      ]);
    }
  } catch (e) {
    console.warn('Database initialization check warning:', e);
  }
}
