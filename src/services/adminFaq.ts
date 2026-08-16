import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Platform } from 'react-native';
import { sql } from './neon';

export interface CommunityFAQItem {
  id: string;
  userId?: string;
  askedByName: string;
  question: string;
  answer?: string;
  status: 'PENDING' | 'PUBLISHED';
  createdAt: string;
  answeredAt?: string;
  isCommunity?: boolean;
}

export const BASE_FAQS: { id: string; question: string; answer: string; isCommunity?: boolean; askedByName?: string }[] = [
  {
    id: 'base_faq_1',
    question: 'How does the Flexi Meal Pass subscription work?',
    answer:
      'You choose a flexible monthly meal plan (e.g. 60 meals/month for lunch & dinner, or 30 meals/month for 1 meal/day). You receive digital meal tokens in your wallet, allowing you to dine at ANY verified partner mess on campus without being locked into a single food vendor.',
  },
  {
    id: 'base_faq_2',
    question: 'How do Skip Tokens work if I skip or miss a meal?',
    answer:
      'On a 60 meals/month plan (2 meals/day), 1 skip token is deducted at 11:00 AM if no lunch is booked, and 1 token if no dinner is booked by cutoff. On a 30 meals/month plan (1 meal/day), a skip token is only deducted if you booked neither lunch nor dinner on that day. Unused skip tokens protect your balance and can be rolled over or refunded.',
  },
  {
    id: 'base_faq_3',
    question: 'Where do I find my Meal Verification OTP?',
    answer:
      'Whenever you book a meal at any partner mess, a secure 8-digit OTP is instantly generated. View it in the "Bookings" tab or on the booking confirmation screen, then present it at the mess counter (or have the mess manager scan your QR code) to redeem your meal.',
  },
  {
    id: 'base_faq_4',
    question: 'Can I cancel a meal booking if my schedule changes?',
    answer:
      'Yes! You can cancel any booked meal before the partner mess pre-book cutoff time (e.g. 2:15 PM for Lunch or 7:00 PM for Dinner). Your meal token is immediately refunded back to your wallet balance with zero penalty.',
  },
  {
    id: 'base_faq_5',
    question: 'How do I explore partner messes and view daily menus?',
    answer:
      'Navigate to the "Messes" tab or open the interactive Google Map view. You can see real-time walking distances calculated from your current GPS location, student ratings, today\'s star dish, and the complete daily menu for every partner mess.',
  },
  {
    id: 'base_faq_6',
    question: 'Can a diner switch messes and cuisines every day?',
    answer:
      'Yes, 100%! Flexi Meal gives you total dining freedom. You can choose a North Indian thali for lunch, and a Gujarati or Punjabi special for dinner. You are never tied down to a single kitchen.',
  },
  {
    id: 'base_faq_7',
    question: 'How do refunds and subscription renewals work?',
    answer:
      'Go to the "Wallet" tab to view your active plan, top up tokens, request a refund for remaining eligible tokens, or renew your pass seamlessly via UPI, NetBanking, or Cards.',
  },
];

const COMMUNITY_FAQS_KEY = '@elitemess_community_faqs_storage';

// Cross-tab broadcast channel for web
let faqWebChannel: any = null;
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    faqWebChannel = new BroadcastChannel('elitemess_faqs_channel');
    faqWebChannel.onmessage = (event: any) => {
      if (event?.data?.type === 'FAQS_UPDATED') {
        DeviceEventEmitter.emit('ELITEMESS_FAQS_UPDATED', event.data.payload);
      }
    };
  } catch (e) {}
}

const broadcastFaqEvent = (type: string, data: any) => {
  try {
    if (faqWebChannel) {
      faqWebChannel.postMessage({ type, ...data });
    }
  } catch (e) {}
};

let faqTableInitialized = false;
async function ensureFaqTable() {
  if (faqTableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS community_faqs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        asked_by_name TEXT,
        question TEXT,
        answer TEXT,
        status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        answered_at TIMESTAMP WITH TIME ZONE
      );
    `;
    faqTableInitialized = true;
  } catch (e) {}
}

/**
 * Fetch all community-submitted FAQs (for Super Admin management)
 */
export async function getAllCommunityFAQs(): Promise<CommunityFAQItem[]> {
  try {
    await ensureFaqTable();
    const rows = await sql`
      SELECT 
        id, user_id as "userId", asked_by_name as "askedByName", question,
        answer, status, created_at as "createdAt", answered_at as "answeredAt"
      FROM community_faqs
      ORDER BY created_at DESC;
    `;

    if (Array.isArray(rows)) {
      const formatted: CommunityFAQItem[] = rows.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        askedByName: r.askedByName || 'Student Diner',
        question: r.question || '',
        answer: r.answer || '',
        status: (r.status as any) || 'PENDING',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        answeredAt: r.answeredAt ? new Date(r.answeredAt).toISOString() : undefined,
        isCommunity: true,
      }));

      await AsyncStorage.setItem(COMMUNITY_FAQS_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (e) {
    // Fallback to local storage only if network/DB is offline
    try {
      const raw = await AsyncStorage.getItem(COMMUNITY_FAQS_KEY);
      if (!raw) return [];
      const parsed: CommunityFAQItem[] = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];
    } catch (err) {
      return [];
    }
  }

  return [];
}

/**
 * Fetch all publicly visible FAQs (Base Curated + Approved Community FAQs)
 */
export async function getPublicFAQs(): Promise<{
  id: string;
  question: string;
  answer: string;
  isCommunity?: boolean;
  askedByName?: string;
}[]> {
  try {
    const community = await getAllCommunityFAQs();
    const publishedCommunity = community
      .filter((c) => c.status === 'PUBLISHED' && c.answer && c.answer.trim().length > 0)
      .map((c) => ({
        id: c.id,
        question: c.question,
        answer: c.answer || '',
        isCommunity: true,
        askedByName: c.askedByName,
      }));

    return [...BASE_FAQS, ...publishedCommunity];
  } catch (e) {
    return BASE_FAQS;
  }
}

/**
 * Customer submits a new question to the Super Admin FAQ Desk
 */
export async function submitCustomerFAQ(
  userId: string,
  askedByName: string,
  question: string
): Promise<CommunityFAQItem> {
  const newItemId = `faq_user_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newItem: CommunityFAQItem = {
    id: newItemId,
    userId,
    askedByName: askedByName || 'Student Diner',
    question: question.trim(),
    status: 'PENDING',
    createdAt: nowIso,
    isCommunity: true,
  };

  try {
    await ensureFaqTable();
    await sql`
      INSERT INTO community_faqs (
        id, user_id, asked_by_name, question, status, created_at
      ) VALUES (
        ${newItemId}, ${userId}, ${askedByName || 'Student Diner'}, ${question.trim()}, 'PENDING', NOW()
      );
    `;
  } catch (e) {
    console.warn('Neon FAQ submit error:', e);
  }

  const current = await getAllCommunityFAQs();
  const updated = [newItem, ...current.filter((c) => c.id !== newItemId)];
  await AsyncStorage.setItem(COMMUNITY_FAQS_KEY, JSON.stringify(updated));

  DeviceEventEmitter.emit('ELITEMESS_FAQS_UPDATED', { type: 'SUBMITTED', faq: newItem });
  broadcastFaqEvent('FAQS_UPDATED', { payload: { type: 'SUBMITTED', faq: newItem } });
  return newItem;
}

/**
 * Super Admin answers & publishes FAQ to the public
 */
export async function answerAndPublishFAQ(
  faqId: string,
  answer: string
): Promise<boolean> {
  try {
    await ensureFaqTable();
    await sql`
      UPDATE community_faqs
      SET 
        answer = ${answer.trim()},
        status = 'PUBLISHED',
        answered_at = NOW()
      WHERE id = ${faqId};
    `;

    const current = await getAllCommunityFAQs();
    const updated = current.map((item) => {
      if (item.id === faqId) {
        return {
          ...item,
          answer: answer.trim(),
          status: 'PUBLISHED' as const,
          answeredAt: new Date().toISOString(),
        };
      }
      return item;
    });

    await AsyncStorage.setItem(COMMUNITY_FAQS_KEY, JSON.stringify(updated));
    DeviceEventEmitter.emit('ELITEMESS_FAQS_UPDATED', { type: 'PUBLISHED', faqId });
    broadcastFaqEvent('FAQS_UPDATED', { payload: { type: 'PUBLISHED', faqId } });
    return true;
  } catch (e) {
    console.warn('Neon FAQ publish error:', e);
    return false;
  }
}

/**
 * Super Admin deletes a community FAQ
 */
export async function deleteCommunityFAQ(faqId: string): Promise<boolean> {
  try {
    await ensureFaqTable();
    await sql`DELETE FROM community_faqs WHERE id = ${faqId};`;
    const current = await getAllCommunityFAQs();
    const updated = current.filter((item) => item.id !== faqId);
    await AsyncStorage.setItem(COMMUNITY_FAQS_KEY, JSON.stringify(updated));
    DeviceEventEmitter.emit('ELITEMESS_FAQS_UPDATED', { type: 'DELETED', faqId });
    broadcastFaqEvent('FAQS_UPDATED', { payload: { type: 'DELETED', faqId } });
    return true;
  } catch (e) {
    return false;
  }
}
