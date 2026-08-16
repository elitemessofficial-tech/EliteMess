import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Platform } from 'react-native';
import { sql } from './neon';

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'admin' | 'concierge' | 'owner' | 'user';
  text: string;
  imageUri?: string;
  receiptData?: {
    bookingId: string;
    orderId?: string;
    messName: string;
    mealType: string;
    otp?: string;
    date: string;
    exactTime?: string;
    status: string;
    tokenCount?: number;
  };
  isDivider?: boolean;
  dividerText?: string;
  time: string;
}

export interface SupportQueryItem {
  id: string;
  userId?: string;
  senderType: 'CUSTOMER' | 'MESS_OWNER';
  senderName: string;
  senderPhone: string;
  messName?: string;
  category: 'PAYOUT_INQUIRY' | 'TOKEN_REFUND' | 'MENU_UPDATE' | 'OTP_ISSUE' | 'GENERAL_QUERY';
  subject: string;
  message: string;
  messages: ChatMessage[];
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  adminReply?: string;
  resolvedAt?: string;
}

const STORAGE_KEY = '@elitemess_admin_support_queries';

// Cross-tab broadcast channel for web
let webChannel: any = null;
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    webChannel = new BroadcastChannel('elitemess_support_channel');
    webChannel.onmessage = (event: any) => {
      if (event?.data?.type === 'TICKET_UPDATED') {
        DeviceEventEmitter.emit('ELITEMESS_SUPPORT_TICKET_UPDATED', event.data.ticket);
      } else if (event?.data?.type === 'ADMIN_REPLY') {
        DeviceEventEmitter.emit('ELITEMESS_ADMIN_REPLY_SENT', event.data.payload);
      }
    };
  } catch (e) {}
}

const broadcastEvent = (type: string, data: any) => {
  try {
    if (webChannel) {
      webChannel.postMessage({ type, ...data });
    }
  } catch (e) {}
};

let tableInitialized = false;
async function ensureSupportTable() {
  if (tableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        sender_type TEXT DEFAULT 'CUSTOMER',
        sender_name TEXT,
        sender_phone TEXT,
        mess_name TEXT,
        category TEXT DEFAULT 'GENERAL_QUERY',
        subject TEXT,
        message TEXT,
        messages_json JSONB,
        status TEXT DEFAULT 'OPEN',
        admin_reply TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
      );
    `;
    tableInitialized = true;
  } catch (e) {
    // If table creation fails, fall back gracefully to local storage
  }
}

/**
 * Fetch all real support queries from Neon Database (with AsyncStorage fallback)
 */
export async function getAllSupportQueries(): Promise<SupportQueryItem[]> {
  try {
    await ensureSupportTable();
    const rows = await sql`
      SELECT 
        id, user_id as "userId", sender_type as "senderType", sender_name as "senderName",
        sender_phone as "senderPhone", mess_name as "messName", category, subject,
        message, messages_json as "messages", status, admin_reply as "adminReply",
        created_at as "createdAt", resolved_at as "resolvedAt"
      FROM support_tickets
      ORDER BY created_at DESC
      LIMIT 100;
    `;

    if (Array.isArray(rows)) {
      const formatted: SupportQueryItem[] = rows.map((r: any) => ({
        id: r.id,
        userId: r.userId || '',
        senderType: (r.senderType as any) || 'CUSTOMER',
        senderName: r.senderName || 'Student Diner',
        senderPhone: r.senderPhone || '',
        messName: r.messName,
        category: (r.category as any) || 'GENERAL_QUERY',
        subject: r.subject || 'Support Request',
        message: r.message || '',
        messages: Array.isArray(r.messages) ? r.messages : [],
        status: (r.status as any) || 'OPEN',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        adminReply: r.adminReply || undefined,
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : undefined,
      }));

      // Cache locally
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
      return formatted;
    }
  } catch (e) {
    // Fallback to local storage only if network is offline
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SupportQueryItem[] = JSON.parse(stored);
        return Array.isArray(parsed)
          ? parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];
      }
    } catch (err) {}
  }

  return [];
}

/**
 * Fetch specific customer's active support session from Neon Database
 */
export async function getCustomerSupportSession(userId: string): Promise<SupportQueryItem | null> {
  try {
    await ensureSupportTable();
    const rows = await sql`
      SELECT 
        id, user_id as "userId", sender_type as "senderType", sender_name as "senderName",
        sender_phone as "senderPhone", mess_name as "messName", category, subject,
        message, messages_json as "messages", status, admin_reply as "adminReply",
        created_at as "createdAt", resolved_at as "resolvedAt"
      FROM support_tickets
      WHERE user_id = ${userId} OR id = ${`tkt_user_${userId}`}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    if (rows && rows.length > 0) {
      const r = rows[0];
      const item: SupportQueryItem = {
        id: r.id,
        userId: r.userId || '',
        senderType: (r.senderType as any) || 'CUSTOMER',
        senderName: r.senderName || 'Student Diner',
        senderPhone: r.senderPhone || '',
        messName: r.messName,
        category: (r.category as any) || 'GENERAL_QUERY',
        subject: r.subject || 'Support Request',
        messages: Array.isArray(r.messages) ? r.messages : [],
        message: r.message || '',
        status: (r.status as any) || 'OPEN',
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        adminReply: r.adminReply || undefined,
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : undefined,
      };

      await AsyncStorage.setItem(
        `@elitemess_support_session_${userId}`,
        JSON.stringify({ id: item.id, messages: item.messages, status: item.status })
      );
      return item;
    }
  } catch (e) {}

  return null;
}

/**
 * Add or update customer live chat message in Neon Database & Local Storage
 */
export async function syncCustomerChatMessage(
  userId: string,
  senderName: string,
  senderPhone: string,
  userMessage: ChatMessage,
  category: SupportQueryItem['category'] = 'GENERAL_QUERY'
): Promise<SupportQueryItem> {
  const ticketId = `tkt_user_${userId}`;
  const nowIso = new Date().toISOString();

  // 1. Commit to Neon PostgreSQL DB directly (append message via SQL)
  let updatedMessages: ChatMessage[] = [userMessage];
  try {
    await ensureSupportTable();

    // Fetch existing messages and append in one go
    const rows = await sql`
      SELECT messages_json as "messages", status FROM support_tickets WHERE id = ${ticketId} LIMIT 1;
    `;

    if (rows && rows.length > 0) {
      const existingMsgs = Array.isArray(rows[0].messages) ? rows[0].messages : [];
      const wasResolved = rows[0].status === 'RESOLVED';

      if (wasResolved && existingMsgs.length > 0) {
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dividerMsg: ChatMessage = {
          id: `divider_${Date.now()}`,
          sender: 'concierge',
          text: `New Support Session Started • ${dateStr} • ${timeStr}`,
          isDivider: true,
          dividerText: `New Support Session Started • ${dateStr} • ${timeStr}`,
          time: timeStr,
        };
        updatedMessages = [...existingMsgs, dividerMsg, userMessage];
      } else {
        updatedMessages = [...existingMsgs, userMessage];
      }
    }

    await sql`
      INSERT INTO support_tickets (
        id, user_id, sender_type, sender_name, sender_phone, category, subject, message, messages_json, status, created_at
      ) VALUES (
        ${ticketId}, ${userId}, 'CUSTOMER', ${senderName || 'Student Diner'}, ${senderPhone || ''},
        ${category}, ${userMessage.text.slice(0, 60)}, ${userMessage.text},
        ${JSON.stringify(updatedMessages)}, 'OPEN', NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        message = EXCLUDED.message,
        messages_json = ${JSON.stringify(updatedMessages)},
        status = 'OPEN';
    `;
  } catch (e) {
    console.warn('Neon support ticket sync error:', e);
  }

  const updatedTicket: SupportQueryItem = {
    id: ticketId,
    userId,
    senderType: 'CUSTOMER',
    senderName: senderName || 'Student Diner',
    senderPhone: senderPhone || '',
    category,
    subject: userMessage.text.slice(0, 60),
    message: userMessage.text,
    messages: updatedMessages,
    status: 'OPEN',
    createdAt: nowIso,
  };

  // 2. Cache locally
  try {
    await AsyncStorage.setItem(
      `@elitemess_support_session_${userId}`,
      JSON.stringify({
        id: updatedTicket.id,
        messages: updatedTicket.messages,
        status: updatedTicket.status,
      })
    );
  } catch (e) {}

  // 3. Broadcast real-time events
  DeviceEventEmitter.emit('ELITEMESS_SUPPORT_TICKET_UPDATED', updatedTicket);
  broadcastEvent('TICKET_UPDATED', { ticket: updatedTicket });

  return updatedTicket;
}

/**
 * Add a new real support query (e.g. from Owner portal or customer session init)
 */
export async function submitSupportQuery(
  query: Omit<SupportQueryItem, 'id' | 'createdAt' | 'status' | 'messages'> & {
    messages?: ChatMessage[];
  }
): Promise<SupportQueryItem> {
  const ticketId = query.userId ? `tkt_user_${query.userId}` : `tkt_real_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const initialMsgs: ChatMessage[] = query.messages || [
    {
      id: `msg_${Date.now()}`,
      sender: query.senderType === 'CUSTOMER' ? 'customer' : 'owner',
      text: query.message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ];

  let finalMsgs = initialMsgs;

  // Commit to Neon PostgreSQL DB
  try {
    await ensureSupportTable();

    const rows = await sql`
      SELECT messages_json as "messages", status FROM support_tickets WHERE id = ${ticketId} LIMIT 1;
    `;

    if (rows && rows.length > 0) {
      const existingMsgs = Array.isArray(rows[0].messages) ? rows[0].messages : [];
      if (existingMsgs.length > 0) {
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dividerMsg: ChatMessage = {
          id: `divider_${Date.now()}`,
          sender: 'concierge',
          text: `New Support Session Started • ${dateStr} • ${timeStr}`,
          isDivider: true,
          dividerText: `New Support Session Started • ${dateStr} • ${timeStr}`,
          time: timeStr,
        };
        finalMsgs = [...existingMsgs, dividerMsg, ...initialMsgs];
      }
    }

    await sql`
      INSERT INTO support_tickets (
        id, user_id, sender_type, sender_name, sender_phone, mess_name, category, subject, message, messages_json, status, created_at
      ) VALUES (
        ${ticketId}, ${query.userId || null}, ${query.senderType}, ${query.senderName}, ${query.senderPhone},
        ${query.messName || null}, ${query.category}, ${query.subject}, ${query.message},
        ${JSON.stringify(finalMsgs)}, 'OPEN', NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        message = EXCLUDED.message,
        messages_json = ${JSON.stringify(finalMsgs)},
        status = 'OPEN',
        created_at = NOW();
    `;
  } catch (e) {
    console.warn('Neon submit query error:', e);
  }

  const newItem: SupportQueryItem = {
    ...query,
    id: ticketId,
    messages: finalMsgs,
    status: 'OPEN',
    createdAt: nowIso,
  };

  // Cache locally
  try {
    const current = await getAllSupportQueries();
    const idx = current.findIndex((q) => q.id === ticketId);
    if (idx >= 0) {
      current[idx] = newItem;
    } else {
      current.unshift(newItem);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    if (query.userId) {
      await AsyncStorage.setItem(
        `@elitemess_support_session_${query.userId}`,
        JSON.stringify({
          id: newItem.id,
          messages: newItem.messages,
          status: newItem.status,
        })
      );
    }
  } catch (e) {}

  DeviceEventEmitter.emit('ELITEMESS_SUPPORT_TICKET_UPDATED', newItem);
  broadcastEvent('TICKET_UPDATED', { ticket: newItem });
  return newItem;
}

/**
 * Super Admin Reply to Support Query / Chat
 */
export async function adminReplyToSupportQuery(
  ticketId: string,
  replyText: string,
  newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
): Promise<boolean> {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const adminMsg: ChatMessage = {
    id: `admin_${Date.now()}`,
    sender: 'admin',
    text: replyText,
    time: timeStr,
  };

  try {
    // 1. Fetch current ticket from DB
    await ensureSupportTable();
    const rows = await sql`
      SELECT messages_json as "messages", user_id as "userId" FROM support_tickets WHERE id = ${ticketId} LIMIT 1;
    `;

    let targetUserId = '';
    let updatedMsgs: ChatMessage[] = [adminMsg];

    if (rows && rows.length > 0) {
      targetUserId = rows[0].userId || '';
      const existingMsgs = Array.isArray(rows[0].messages) ? rows[0].messages : [];
      updatedMsgs = [...existingMsgs, adminMsg];
    }

    // 2. Update DB
    await sql`
      UPDATE support_tickets
      SET 
        admin_reply = ${replyText},
        messages_json = ${JSON.stringify(updatedMsgs)},
        status = ${newStatus},
        resolved_at = ${newStatus === 'RESOLVED' ? new Date().toISOString() : null}
      WHERE id = ${ticketId};
    `;

    // 3. Update local cache
    const current = await getAllSupportQueries();
    const idx = current.findIndex((q) => q.id === ticketId);
    if (idx >= 0) {
      current[idx].adminReply = replyText;
      current[idx].status = newStatus;
      current[idx].messages = updatedMsgs;
      targetUserId = targetUserId || current[idx].userId || '';
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }

    if (targetUserId) {
      await AsyncStorage.setItem(
        `@elitemess_support_session_${targetUserId}`,
        JSON.stringify({
          id: ticketId,
          messages: updatedMsgs,
          status: newStatus,
        })
      );
    }

    // 4. Emit events
    const payload = {
      ticketId,
      userId: targetUserId,
      replyText,
      status: newStatus,
      message: adminMsg,
    };

    DeviceEventEmitter.emit('ELITEMESS_ADMIN_REPLY_SENT', payload);
    DeviceEventEmitter.emit('ELITEMESS_SUPPORT_TICKET_UPDATED', { id: ticketId, messages: updatedMsgs, status: newStatus });
    broadcastEvent('ADMIN_REPLY', { payload });
    broadcastEvent('TICKET_UPDATED', { ticket: { id: ticketId, messages: updatedMsgs, status: newStatus } });

    return true;
  } catch (e) {
    console.warn('Neon admin reply error:', e);
    return false;
  }
}

/**
 * Delete a support query
 */
export async function deleteSupportQuery(ticketId: string): Promise<boolean> {
  try {
    await ensureSupportTable();
    await sql`DELETE FROM support_tickets WHERE id = ${ticketId};`;
    const current = await getAllSupportQueries();
    const updated = current.filter((q) => q.id !== ticketId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    DeviceEventEmitter.emit('ELITEMESS_SUPPORT_TICKET_UPDATED', { id: ticketId, deleted: true });
    broadcastEvent('TICKET_UPDATED', { ticket: { id: ticketId, deleted: true } });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Resolve a ticket (status only, no new message appended).
 * Used when customer or admin ends session to avoid duplicate message spam.
 */
export async function resolveTicketOnly(ticketId: string): Promise<boolean> {
  try {
    await ensureSupportTable();
    await sql`
      UPDATE support_tickets
      SET status = 'RESOLVED', resolved_at = NOW()
      WHERE id = ${ticketId};
    `;

    DeviceEventEmitter.emit('ELITEMESS_SUPPORT_TICKET_UPDATED', { id: ticketId, status: 'RESOLVED' });
    broadcastEvent('TICKET_UPDATED', { ticket: { id: ticketId, status: 'RESOLVED' } });
    return true;
  } catch (e) {
    console.warn('resolveTicketOnly error:', e);
    return false;
  }
}
