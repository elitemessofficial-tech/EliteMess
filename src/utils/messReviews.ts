import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export interface MessReview {
  id: string;
  messId: string;
  studentName: string;
  studentPhone: string;
  rating: number; // 1 to 5
  comment: string;
  photoUrl?: string;
  mealType: string;
  createdAt: string;
  isVerifiedDiner: boolean;
}

const REVIEWS_STORAGE_KEY = 'mealhop_mess_reviews_v1';

export const MESS_REVIEWS_BASE_COUNT: Record<string, number> = {
  m1: 142,
  m2: 98,
  m3: 176,
  m4: 84,
  m5: 110,
};

// Initial seed reviews with real photos for messes
const SEED_REVIEWS: MessReview[] = [
  {
    id: 'rev_101',
    messId: 'm1',
    studentName: 'Rohan Sharma',
    studentPhone: '9876543210',
    rating: 5,
    comment: 'The Paneer Butter Masala thali today was amazing! Hot tandoori rotis served fresh.',
    photoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
    mealType: 'Lunch',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    isVerifiedDiner: true,
  },
  {
    id: 'rev_102',
    messId: 'm1',
    studentName: 'Ananya Deshmukh',
    studentPhone: '9123456789',
    rating: 5,
    comment: 'Super clean hygiene and unlimited rice refills. Best mess pass value on campus!',
    photoUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&q=80',
    mealType: 'Dinner',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isVerifiedDiner: true,
  },
  {
    id: 'rev_103',
    messId: 'm2',
    studentName: 'Priya Patel',
    studentPhone: '8888877777',
    rating: 4.8,
    comment: 'Royal Spice Punjabi Thali is top tier. Gulab Jamun served hot!',
    photoUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
    mealType: 'Lunch',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    isVerifiedDiner: true,
  },
  {
    id: 'rev_104',
    messId: 'm3',
    studentName: 'Aditya Verma',
    studentPhone: '9988776655',
    rating: 4.9,
    comment: 'Authentic Kolhapuri Rassa and Chicken Thali. Highly recommended!',
    photoUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80',
    mealType: 'Dinner',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    isVerifiedDiner: true,
  },
];

export async function getReviewsForMess(messId: string): Promise<MessReview[]> {
  try {
    // 1. Query Supabase DB Database first for real-time reviews
    const { data: dbData, error } = await supabase
      .from('mess_reviews')
      .select('*')
      .eq('mess_id', messId)
      .order('created_at', { ascending: false });

    if (!error && dbData && dbData.length > 0) {
      const dbReviews: MessReview[] = dbData.map(row => ({
        id: row.id,
        messId: row.mess_id,
        studentName: row.student_name,
        studentPhone: row.student_phone || '',
        rating: row.rating,
        comment: row.comment,
        photoUrl: row.photo_url || undefined,
        mealType: row.meal_type || 'Lunch',
        createdAt: row.created_at || new Date().toISOString(),
        isVerifiedDiner: row.is_verified_diner ?? true,
      }));

      // Merge with seed reviews for comprehensive initial data
      const seedForMess = SEED_REVIEWS.filter(r => r.messId === messId);
      const mergedMap = new Map<string, MessReview>();
      seedForMess.forEach(r => mergedMap.set(r.id, r));
      dbReviews.forEach(r => mergedMap.set(r.id, r));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Cache locally
      await AsyncStorage.setItem(REVIEWS_STORAGE_KEY + '_' + messId, JSON.stringify(mergedList));
      return mergedList;
    }
  } catch (e) {
    // Fallback to local storage
  }

  // 2. Fallback to AsyncStorage cache
  try {
    const raw = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY + '_' + messId);
    if (raw) {
      return JSON.parse(raw);
    }

    const rawAll = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
    let allReviews: MessReview[] = rawAll ? JSON.parse(rawAll) : [];
    if (allReviews.length === 0) {
      allReviews = SEED_REVIEWS;
      await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(SEED_REVIEWS));
    }
    return allReviews.filter(r => r.messId === messId);
  } catch (e) {
    return SEED_REVIEWS.filter(r => r.messId === messId);
  }
}

export async function addMessReview(newReview: Omit<MessReview, 'id' | 'createdAt'>): Promise<MessReview> {
  const review: MessReview = {
    ...newReview,
    id: `rev_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // 1. Save to Supabase DB Database table 'mess_reviews'
  try {
    await supabase.from('mess_reviews').insert({
      id: review.id,
      mess_id: review.messId,
      student_name: review.studentName,
      student_phone: review.studentPhone,
      rating: review.rating,
      comment: review.comment,
      photo_url: review.photoUrl || '',
      meal_type: review.mealType,
      is_verified_diner: review.isVerifiedDiner,
      created_at: review.createdAt,
    });
  } catch (e) {
    console.warn('Supabase DB review insert fallback:', e);
  }

  // 2. Cache in local AsyncStorage
  try {
    const rawAll = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
    let allReviews: MessReview[] = rawAll ? JSON.parse(rawAll) : SEED_REVIEWS;
    allReviews.unshift(review);
    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(allReviews));

    const rawMess = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY + '_' + review.messId);
    let messReviews: MessReview[] = rawMess ? JSON.parse(rawMess) : [];
    messReviews.unshift(review);
    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY + '_' + review.messId, JSON.stringify(messReviews));
  } catch (e) {}

  return review;
}

export async function getMessReviewCount(messId: string): Promise<number> {
  const reviews = await getReviewsForMess(messId);
  const baseCount = MESS_REVIEWS_BASE_COUNT[messId] || 120;
  const userAdded = Math.max(0, reviews.length - SEED_REVIEWS.filter(r => r.messId === messId).length);
  return baseCount + userAdded;
}
