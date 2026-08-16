import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  DeviceEventEmitter,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  MessageSquare,
  HelpCircle,
  Phone,
  Mail,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  Headphones,
  CheckCircle,
  History,
  PlusSquare,
  ArrowLeft,
  ArrowRight,
  UserCircle2,
  Utensils,
  ShieldCheck,
  User,
  Smile,
  Paperclip,
  Camera,
  Mic,
  Image as ImageIcon,
  CheckCheck,
  X,
  FileText,
  Sparkles,
  Plus,
  Receipt,
  QrCode,
  Ticket,
  Calendar,
  Hash,
} from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';
import CustomerBottomBar from '../../components/CustomerBottomBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@descope/react-native-sdk';
import {
  getAllSupportQueries,
  submitSupportQuery,
  syncCustomerChatMessage,
  getCustomerSupportSession,
  resolveTicketOnly,
  SupportQueryItem,
  ChatMessage,
} from '../../src/services/adminSupport';
import {
  getPublicFAQs,
  submitCustomerFAQ,
  CommunityFAQItem,
} from '../../src/services/adminFaq';
import {
  getUserAllBookingsFromNeon,
  MealBookingDBRecord,
} from '../../src/services/neon';
import { useToken } from '../../src/context/TokenContext';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isCommunity?: boolean;
  askedByName?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'concierge' | 'owner' | 'customer' | 'admin';
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

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq_1',
    question: 'How does the Flexi Meal Pass subscription work?',
    answer:
      'You choose a flexible monthly meal plan (e.g. 60 meals/month for lunch & dinner, or 30 meals/month for 1 meal/day). You receive digital meal tokens in your wallet, allowing you to dine at ANY verified partner mess on campus without being locked into a single food vendor.',
  },
  {
    id: 'faq_2',
    question: 'How do Skip Tokens work if I skip or miss a meal?',
    answer:
      'On a 60 meals/month plan (2 meals/day), 1 skip token is deducted at 11:00 AM if no lunch is booked, and 1 token if no dinner is booked by cutoff. On a 30 meals/month plan (1 meal/day), a skip token is only deducted if you booked neither lunch nor dinner on that day. Unused skip tokens protect your balance and can be rolled over or refunded.',
  },
  {
    id: 'faq_3',
    question: 'Where do I find my Meal Verification OTP?',
    answer:
      'Whenever you book a meal at any partner mess, a secure 8-digit OTP is instantly generated. View it in the "Bookings" tab or on the booking confirmation screen, then present it at the mess counter (or have the mess manager scan your QR code) to redeem your meal.',
  },
  {
    id: 'faq_4',
    question: 'Can I cancel a meal booking if my schedule changes?',
    answer:
      'Yes! You can cancel any booked meal before the partner mess pre-book cutoff time (e.g. 2:15 PM for Lunch or 7:00 PM for Dinner). Your meal token is immediately refunded back to your wallet balance with zero penalty.',
  },
  {
    id: 'faq_5',
    question: 'How do I explore partner messes and view daily menus?',
    answer:
      'Navigate to the "Messes" tab or open the interactive Google Map view. You can see real-time walking distances calculated from your current GPS location, student ratings, today\'s star dish, and the complete daily menu for every partner mess.',
  },
  {
    id: 'faq_6',
    question: 'Can I switch messes and cuisines every day?',
    answer:
      'Yes, 100%! Flexi Meal gives you total dining freedom. You can choose a North Indian thali for lunch, and a Gujarati or Punjabi special for dinner. You are never tied down to a single kitchen.',
  },
  {
    id: 'faq_7',
    question: 'How do refunds and subscription renewals work?',
    answer:
      'Go to the "Wallet" tab to view your active plan, top up tokens, request a refund for remaining eligible tokens, or renew your pass seamlessly via UPI, NetBanking, or Cards.',
  },
];

const EMOJI_CATEGORIES = [
  {
    name: 'Food & Meals',
    icon: '🍛',
    emojis: ['🍛', '🍱', '🥗', '🍲', '🥘', '🍚', '🍞', '🥤', '☕', '🍎', '🥪', '🍕', '🍰', '🥞', '🍜', '🌯'],
  },
  {
    name: 'Reactions',
    icon: '😄',
    emojis: ['😀', '😄', '😂', '🤣', '😊', '😍', '🥰', '😋', '😎', '🤩', '🥳', '🤔', '🤫', '🥺', '😭', '😇'],
  },
  {
    name: 'Hands',
    icon: '👍',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤙', '👈', '👉', '👆', '👇', '✋', '👋', '🤝', '🙏', '👏'],
  },
  {
    name: 'Status',
    icon: '🔥',
    emojis: ['🔥', '✨', '⭐', '🌟', '💥', '⚡', '💯', '✅', '❌', '⚠️', '💡', '❤️', '💚', '💙', '💜', '🎉'],
  },
];

export default function SupportScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { activeBooking, mealHistory } = useToken();

  // Tabs: 'faq' | 'chat' | 'contact'
  const [activeTab, setActiveTab] = useState<'faq' | 'chat' | 'contact'>('faq');

  // FAQ State
  const [faqsList, setFaqsList] = useState<FAQItem[]>([]);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [showAskFaqModal, setShowAskFaqModal] = useState(false);
  const [askQuestionText, setAskQuestionText] = useState('');
  const [submittingFaq, setSubmittingFaq] = useState(false);
  const [faqSubmitSuccess, setFaqSubmitSuccess] = useState(false);

  // Chat States
  const [inputText, setInputText] = useState('');
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Booking Receipt Attachment State
  const [userBookingsList, setUserBookingsList] = useState<MealBookingDBRecord[]>([]);
  const [showReceiptPickerModal, setShowReceiptPickerModal] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const formatBookingDate = (raw?: string): string => {
    if (!raw) return '16 Aug 2026';
    if (raw.includes('2001') || raw.includes('2000') || raw.includes('2002')) {
      return raw.replace(/200[0-9]/g, '2026');
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const yr = d.getFullYear();
      if (yr < 2024 || yr > 2030) {
        d.setFullYear(2026);
      }
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const parts = raw.split(',');
    return parts.length > 0 ? `${parts[0].trim()} 2026` : '16 Aug 2026';
  };

  const openBookingReceiptPicker = async () => {
    setShowAttachModal(false);
    setShowReceiptPickerModal(true);
    setLoadingBookings(true);

    const mergedList: MealBookingDBRecord[] = [];

    // 1. Add active live booking if currently booked
    if (activeBooking) {
      mergedList.push({
        id: activeBooking.bookingId || `booking_active_${Date.now()}`,
        user_id: customerId,
        mess_id: activeBooking.messId || 'mess_partner',
        mess_name: activeBooking.messName || 'Campus Partner Mess',
        meal_type: activeBooking.mealType || 'Lunch',
        otp: activeBooking.otp || '00000000',
        otp_expires_at: activeBooking.otpExpiresAt || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        cutoff_time: activeBooking.cutoffTime || '2:15 PM',
        status: (activeBooking.status as any) || 'booked',
        created_at: formatBookingDate(activeBooking.bookedAt),
      });
    }

    // 2. Add past meals from mealHistory
    if (Array.isArray(mealHistory)) {
      mealHistory.forEach((item, idx) => {
        if (!mergedList.some((b) => b.id === item.id)) {
          const cleanDate = formatBookingDate(item.date);
          mergedList.push({
            id: item.id || `history_${idx}_${Date.now()}`,
            user_id: customerId,
            mess_id: 'mess_partner',
            mess_name: item.messName || 'Campus Partner Mess',
            meal_type: item.mealType || 'Lunch',
            otp: item.otp || '00000000',
            otp_expires_at: new Date().toISOString(),
            cutoff_time: item.cutoffTime || (item.mealType?.toLowerCase() === 'dinner' ? '7:00 PM' : '2:15 PM'),
            status: (item.status === 'completed' ? 'completed' : item.status === 'cancelled' ? 'cancelled' : 'completed') as any,
            created_at: cleanDate,
          });
        }
      });
    }

    // 3. Merge live remote bookings from Neon DB
    try {
      const remoteBookings = await getUserAllBookingsFromNeon(customerId);
      if (Array.isArray(remoteBookings)) {
        remoteBookings.forEach((rb) => {
          if (!mergedList.some((b) => b.id === rb.id || b.otp === rb.otp)) {
            mergedList.push({
              ...rb,
              created_at: formatBookingDate(rb.created_at),
            });
          }
        });
      }
    } catch (e) {}

    setUserBookingsList(mergedList);
    setLoadingBookings(false);
  };

  const handleAttachBookingReceipt = async (booking: MealBookingDBRecord) => {
    setShowReceiptPickerModal(false);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = formatBookingDate(booking.created_at);
    const orderId = `FM-ORD-${(booking.id || Date.now().toString()).slice(-6).toUpperCase()}`;
    const exactTime = booking.cutoff_time ? `Cutoff ${booking.cutoff_time}` : '2:15 PM';

    const receiptMessage: Message = {
      id: `receipt_${Date.now()}`,
      sender: 'customer',
      text: `Attached Verified Meal Receipt: #${orderId} (${booking.mess_name || 'Campus Partner Mess'})`,
      receiptData: {
        bookingId: booking.id,
        orderId,
        messName: booking.mess_name || 'Campus Partner Mess',
        mealType: booking.meal_type || 'Lunch',
        date: formattedDate,
        exactTime,
        status: booking.status || 'completed',
        tokenCount: 1,
      },
      time: timeStr,
    };

    const updatedMessages = [...messages, receiptMessage];
    setMessages(updatedMessages);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    syncCustomerChatMessage(
      customerId,
      customerName,
      customerPhone,
      receiptMessage as any
    ).then((syncedTicket) => {
      setSupportSessionId(syncedTicket.id);
    }).catch((e) => {
      console.warn('Failed to send receipt to support desk:', e);
    });
  };

  const chatScrollRef = useRef<ScrollView>(null);
  const [supportSessionId, setSupportSessionId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [viewingPastSession, setViewingPastSession] = useState<any | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [dismissedTicketId, setDismissedTicketId] = useState<string | null>(null);

  const customerId = session?.user?.userId || 'student_diner_user';
  const customerName = session?.user?.name || 'Student Diner';
  const customerPhone = session?.user?.phone || '+91 98765 43210';

  const storageKey = `@elitemess_support_session_${customerId}`;
  const pastSessionsKey = `@elitemess_support_past_${customerId}`;
  const dismissedKey = `@elitemess_support_dismissed_${customerId}`;

  const loadFaqs = async () => {
    try {
      const publicData = await getPublicFAQs();
      setFaqsList(publicData);
    } catch (e) {
      setFaqsList(FAQ_DATA);
    }
  };

  useEffect(() => {
    loadFaqs();
    const subFaq = DeviceEventEmitter.addListener('ELITEMESS_FAQS_UPDATED', () => {
      loadFaqs();
    });
    return () => {
      subFaq.remove();
    };
  }, []);

  const handleAskFaqSubmit = async () => {
    if (!askQuestionText.trim()) return;
    setSubmittingFaq(true);
    try {
      await submitCustomerFAQ(customerId, customerName, askQuestionText.trim());
      setFaqSubmitSuccess(true);
      setAskQuestionText('');
      setTimeout(() => {
        setFaqSubmitSuccess(false);
        setShowAskFaqModal(false);
      }, 1600);
    } catch (e) {
      console.warn('Failed to submit FAQ:', e);
    } finally {
      setSubmittingFaq(false);
    }
  };

  const initSupportChat = async () => {
    try {
      setChatLoading(true);

      const dismissed = await AsyncStorage.getItem(dismissedKey);
      setDismissedTicketId(dismissed);

      // Check live Neon DB
      const remoteSession = await getCustomerSupportSession(customerId);
      if (
        remoteSession &&
        Array.isArray(remoteSession.messages) &&
        remoteSession.messages.length > 0 &&
        remoteSession.id !== dismissed
      ) {
        setSupportSessionId(remoteSession.id);
        setMessages(remoteSession.messages);
        if (remoteSession.status === 'RESOLVED') {
          setSessionResolved(true);
        } else {
          setSessionResolved(false);
        }
      } else {
        // Fallback to local storage
        const activeSession = await AsyncStorage.getItem(storageKey);
        if (activeSession) {
          const parsed = JSON.parse(activeSession);
          if (parsed.id && Array.isArray(parsed.messages) && parsed.messages.length > 0 && parsed.id !== dismissed) {
            setSupportSessionId(parsed.id);
            setMessages(parsed.messages);
            setSessionResolved(parsed.status === 'RESOLVED');
          } else {
            setSupportSessionId(null);
            setMessages([]);
            setSessionResolved(false);
          }
        } else {
          setSupportSessionId(null);
          setMessages([]);
          setSessionResolved(false);
        }
      }

      const storedPast = await AsyncStorage.getItem(pastSessionsKey);
      if (storedPast) {
        try {
          setPastSessions(JSON.parse(storedPast));
        } catch (e) {
          setPastSessions([]);
        }
      }
    } catch (e) {
      console.warn('Failed to load support sessions:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const startNewSession = async () => {
    try {
      setChatLoading(true);
      const newSessionId = `tkt_user_${customerId}_${Date.now().toString().slice(-5)}`;
      const welcomeMsg: Message = {
        id: `init_${Date.now()}`,
        sender: 'concierge',
        text: `Hello ${customerName}! Welcome to Flexi Meal Student Support Desk. How can we assist you today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const newSession = {
        id: newSessionId,
        createdAt: new Date().toISOString(),
        messages: [welcomeMsg],
        status: 'OPEN',
      };

      // Clear any dismissed ticket record
      await AsyncStorage.removeItem(dismissedKey);
      setDismissedTicketId(null);

      await AsyncStorage.setItem(storageKey, JSON.stringify(newSession));
      setSupportSessionId(newSessionId);
      setMessages([welcomeMsg]);
      setSessionResolved(false);

      // Register ticket in Neon DB Super Admin Support Desk
      await submitSupportQuery({
        userId: customerId,
        senderType: 'CUSTOMER',
        senderName: customerName,
        senderPhone: customerPhone,
        category: 'GENERAL_QUERY',
        subject: `New chat session from ${customerName}`,
        message: 'Started new live chat support session.',
        messages: [welcomeMsg as any],
      });
    } catch (e) {
      console.warn('Failed to start support session:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const resolveActiveSession = async () => {
    const sessionIdToResolve = supportSessionId;
    const currentMsgs = [...messages];

    // Clear active UI state immediately
    setSupportSessionId(null);
    setMessages([]);
    setSessionResolved(false);

    if (!sessionIdToResolve) return;

    // Mark as dismissed so polling doesn't resurrect it
    setDismissedTicketId(sessionIdToResolve);
    try {
      await AsyncStorage.setItem(dismissedKey, sessionIdToResolve);
      await AsyncStorage.removeItem(storageKey);
    } catch (e) {}

    // Save to past sessions (sanitize to remove bulky base64 data URIs to avoid QuotaExceededError)
    try {
      const sanitizedMessages = currentMsgs.map((m) => ({
        ...m,
        imageUri: m.imageUri ? (m.imageUri.length > 300 ? '[Photo Attachment]' : m.imageUri) : undefined,
      }));

      const pastItem = {
        id: sessionIdToResolve,
        resolvedAt: new Date().toISOString(),
        messages: sanitizedMessages,
        summary: currentMsgs[currentMsgs.length - 1]?.text || 'Support session',
      };

      const nextPast = [pastItem, ...pastSessions.slice(0, 5)];
      setPastSessions(nextPast);
      try {
        await AsyncStorage.setItem(pastSessionsKey, JSON.stringify(nextPast));
      } catch (storageErr) {
        console.warn('AsyncStorage quota exceeded for past sessions, caching single item:', storageErr);
        try {
          await AsyncStorage.setItem(pastSessionsKey, JSON.stringify([pastItem]));
        } catch (err2) {}
      }
    } catch (e) {
      console.warn('Failed to archive past session:', e);
    }

    // Sync RESOLVED status to Neon DB
    resolveTicketOnly(sessionIdToResolve).catch((e) => {
      console.warn('Failed to sync session resolve to Neon DB:', e);
    });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      initSupportChat();

      // Real-time listener for Super Admin replies
      const subAdminReply = DeviceEventEmitter.addListener('ELITEMESS_ADMIN_REPLY_SENT', (evt) => {
        if (evt && (evt.userId === customerId || evt.ticketId?.includes(customerId))) {
          initSupportChat();
        }
      });

      const subTicketUpdate = DeviceEventEmitter.addListener('ELITEMESS_SUPPORT_TICKET_UPDATED', (ticket) => {
        if (ticket && (ticket.userId === customerId || ticket.id?.includes(customerId))) {
          if (ticket.status === 'RESOLVED') {
            setSessionResolved(true);
            return;
          }
          if (Array.isArray(ticket.messages) && ticket.id !== dismissedTicketId) {
            setMessages(ticket.messages);
            setSupportSessionId(ticket.id);
            setSessionResolved(false);
          }
        }
      });

      // Background live sync interval from Neon DB while on chat tab
      const interval = setInterval(async () => {
        try {
          const remote = await getCustomerSupportSession(customerId);
          if (remote && Array.isArray(remote.messages) && remote.messages.length > 0) {
            if (remote.id === dismissedTicketId) {
              // This session was already dismissed by customer
              return;
            }
            if (remote.status === 'RESOLVED') {
              if (!sessionResolved && supportSessionId === remote.id) {
                setMessages(remote.messages);
                setSessionResolved(true);
              }
              return;
            }
            setMessages(remote.messages);
            setSupportSessionId(remote.id);
            setSessionResolved(false);
          }
        } catch (e) {}
      }, 2500);

      return () => {
        subAdminReply.remove();
        subTicketUpdate.remove();
        clearInterval(interval);
      };
    }
  }, [activeTab, customerId, sessionResolved, dismissedTicketId, supportSessionId]);

  // Image Picking
  const pickImageFromGallery = async () => {
    setShowAttachModal(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to pick image:', e);
    }
  };

  const takePhotoWithCamera = async () => {
    setShowAttachModal(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        alert('Camera permission is required to capture photos for support.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachedImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Failed to capture photo:', e);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachedImageUri) return;

    const userMsgText = inputText.trim() || (attachedImageUri ? 'Photo attachment' : '');
    const currentImg = attachedImageUri;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Convert image to base64 data URI for cross-browser visibility
    let imageDataUri: string | undefined;
    if (currentImg) {
      try {
        if (currentImg.startsWith('data:')) {
          imageDataUri = currentImg;
        } else if (Platform.OS === 'web') {
          // On web, fetch the blob: URI and convert to base64
          const response = await fetch(currentImg);
          const blob = await response.blob();
          imageDataUri = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } else {
          // On native, use the file URI directly (same device)
          imageDataUri = currentImg;
        }
      } catch (e) {
        console.warn('Failed to convert image to base64:', e);
        imageDataUri = currentImg;
      }
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      text: userMsgText,
      imageUri: imageDataUri || undefined,
      time: timeStr,
    };

    // Optimistic UI update — instant feedback
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setAttachedImageUri(null);
    setShowEmojiTray(false);

    // Auto scroll chat to bottom
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Async DB sync — fire and forget (non-blocking)
    syncCustomerChatMessage(
      customerId,
      customerName,
      customerPhone,
      userMessage as any
    ).then((syncedTicket) => {
      setSupportSessionId(syncedTicket.id);
    }).catch((e) => {
      console.warn('Failed to send customer message to admin desk:', e);
    });
  };

  const handleSendVoiceNote = async () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const voiceMsg: Message = {
      id: `voice_${Date.now()}`,
      sender: 'customer',
      text: '🎤 Voice Note (0:04)',
      time: timeStr,
    };

    const updatedMessages = [...messages, voiceMsg];
    setMessages(updatedMessages);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Async DB sync — fire and forget
    syncCustomerChatMessage(
      customerId,
      customerName,
      customerPhone,
      voiceMsg as any
    ).then((syncedTicket) => {
      setSupportSessionId(syncedTicket.id);
    }).catch(() => {});
  };

  const handlePhoneCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@fleximeal.app?subject=Flexi%20Meal%20Customer%20Support');
  };

  const toggleFaq = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.85)' : '#FFFFFF',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.2)',
    inputBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    accentGold: '#10B981',
    goldGrad: ['#10B981', '#059669'] as const,
    chatUserBg: '#10B981',
    chatRiderBg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
  };

  const getTabButtonStyle = (tab: 'faq' | 'chat' | 'contact') => [
    styles.tabButton,
    { borderColor: colors.cardBorder },
    activeTab === tab && { backgroundColor: '#10B981', borderColor: '#10B981' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <FloatingHeader title="Help & Support" titleAlign="center" showBackButton={true} />

      {/* Navigation Sub-Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={getTabButtonStyle('faq')} onPress={() => setActiveTab('faq')}>
          <HelpCircle size={14} color={activeTab === 'faq' ? '#FFFFFF' : colors.textSub} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'faq' ? '#FFFFFF' : colors.textMain }]}>
            FAQs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={getTabButtonStyle('chat')} onPress={() => setActiveTab('chat')}>
          <MessageSquare size={14} color={activeTab === 'chat' ? '#FFFFFF' : colors.textSub} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'chat' ? '#FFFFFF' : colors.textMain }]}>
            Live Chat
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={getTabButtonStyle('contact')} onPress={() => setActiveTab('contact')}>
          <Headphones size={14} color={activeTab === 'contact' ? '#FFFFFF' : colors.textSub} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'contact' ? '#FFFFFF' : colors.textMain }]}>
            Contact
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* ================= FAQs TAB ================= */}
        {activeTab === 'faq' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 }}>
              <Text style={[styles.sectionTitle, { color: colors.accentGold, marginTop: 0, marginBottom: 0 }]}>
                FREQUENTLY ASKED QUESTIONS ({faqsList.length})
              </Text>
              <TouchableOpacity
                style={styles.askFaqHeaderBtn}
                onPress={() => setShowAskFaqModal(true)}
                activeOpacity={0.8}
              >
                <Plus size={13} color="#10B981" />
                <Text style={styles.askFaqHeaderBtnText}>Ask Question</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {faqsList.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <TouchableOpacity
                    key={faq.id}
                    style={[styles.faqCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => toggleFaq(faq.id)}
                    activeOpacity={0.8}
                  >
                    {faq.isCommunity && (
                      <View style={styles.communityFaqBadge}>
                        <Sparkles size={11} color="#10B981" />
                        <Text style={styles.communityFaqBadgeText}>
                          Campus Q&A • Answered by Super Admin
                        </Text>
                      </View>
                    )}
                    <View style={styles.faqHeader}>
                      <Text style={[styles.faqQuestion, { color: colors.textMain }]}>{faq.question}</Text>
                      {isExpanded ? (
                        <ChevronUp size={16} color={colors.accentGold} />
                      ) : (
                        <ChevronDown size={16} color={colors.textSub} />
                      )}
                    </View>
                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder }]} />
                        <Text style={[styles.faqAnswer, { color: colors.textSub }]}>{faq.answer}</Text>
                        {faq.isCommunity && faq.askedByName && (
                          <Text style={{ fontSize: 10, color: colors.textSub, marginTop: 8, fontStyle: 'italic' }}>
                            Submitted by {faq.askedByName}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ================= CONTACT TAB ================= */}
        {activeTab === 'contact' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>DIRECT SUPPORT HOTLINES</Text>

            <View style={[styles.contactCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <TouchableOpacity style={styles.contactActionRow} onPress={() => setActiveTab('chat')}>
                <View style={styles.contactRowLeft}>
                  <Clock size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Campus Dining Support</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>7:00 AM - 11:00 PM Daily</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>CHAT NOW</Text>
              </TouchableOpacity>

              <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity style={styles.contactActionRow} onPress={handlePhoneCall}>
                <View style={styles.contactRowLeft}>
                  <Phone size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Student Helpline</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>+91 98765 43210</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>CALL</Text>
              </TouchableOpacity>

              <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder }]} />

              <TouchableOpacity style={styles.contactActionRow} onPress={handleEmailSupport}>
                <View style={styles.contactRowLeft}>
                  <Mail size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Official Support Desk</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>support@fleximeal.app</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>EMAIL</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ================= LIVE CHAT TAB ================= */}
        {activeTab === 'chat' && (
          <View style={styles.chatWrapper}>
            {chatLoading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={colors.accentGold} />
                <Text style={{ color: colors.textSub, marginTop: 12, fontSize: 13 }}>
                  Connecting to Flexi Meal Support...
                </Text>
              </View>
            ) : !supportSessionId && !viewingPastSession ? (
              /* No Active Session - Start Session Card */
              <ScrollView contentContainerStyle={styles.noSessionContainer}>
                <View style={[styles.startSessionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  <View style={styles.startSessionIconCircle}>
                    <MessageSquare size={28} color="#10B981" />
                  </View>
                  <Text style={[styles.startSessionTitle, { color: colors.textMain }]}>Start Live Support Chat</Text>
                  <Text style={[styles.startSessionSub, { color: colors.textSub }]}>
                    Connect directly with Super Admin Support for quick assistance with meal passes, skip tokens, OTP verification, or dining inquiries.
                  </Text>
                  <TouchableOpacity style={styles.startSessionBtn} onPress={startNewSession} activeOpacity={0.88}>
                    <LinearGradient colors={['#10B981', '#047857']} style={styles.startSessionGrad}>
                      <MessageSquare size={16} color="#FFFFFF" />
                      <Text style={styles.startSessionBtnText}>START LIVE SESSION</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Past Sessions List */}
                {pastSessions.length > 0 && (
                  <View style={{ width: '100%', gap: 10, marginTop: 20 }}>
                    <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>RESOLVED SESSIONS</Text>
                    {pastSessions.map((sessionItem, idx) => (
                      <TouchableOpacity
                        key={`${sessionItem.id}_${sessionItem.resolvedAt || idx}`}
                        style={[styles.pastSessionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                        onPress={() => setViewingPastSession(sessionItem)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.pastSessionHeader}>
                          <CheckCircle size={14} color="#10B981" />
                          <Text style={[styles.pastSessionDate, { color: colors.textSub }]}>
                            {new Date(sessionItem.resolvedAt).toLocaleDateString()} at{' '}
                            {new Date(sessionItem.resolvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={[styles.pastSessionSnippet, { color: colors.textMain }]} numberOfLines={1}>
                          {sessionItem.summary}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : (
              /* Active Chat Screen */
              <View style={{ flex: 1 }}>
                {/* Chat Top Action Bar */}
                <View style={[styles.chatTopBar, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                  {viewingPastSession ? (
                    <TouchableOpacity
                      style={styles.backToActiveBtn}
                      onPress={() => setViewingPastSession(null)}
                      activeOpacity={0.8}
                    >
                      <ArrowLeft size={16} color={colors.textMain} />
                      <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }}>Back to Chat</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={styles.activeOnlineDot} />
                      <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>SUPER ADMIN SUPPORT ACTIVE</Text>
                    </View>
                  )}

                  {!viewingPastSession && supportSessionId && (
                    <TouchableOpacity style={styles.resolveSessionBtn} onPress={resolveActiveSession} activeOpacity={0.8}>
                      <Text style={styles.resolveSessionBtnText}>End Session</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Messages List */}
                <ScrollView
                  ref={chatScrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.messagesContainer}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                >
                  {(viewingPastSession ? viewingPastSession.messages : messages).map((msg: Message) => {
                    if (msg.isDivider || msg.text?.startsWith('New Support Session Started')) {
                      return (
                        <View key={msg.id} style={{ width: '100%', alignItems: 'center', marginVertical: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            <Clock size={12} color="#10B981" />
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>
                              {msg.dividerText || msg.text}
                            </Text>
                          </View>
                        </View>
                      );
                    }
                    const isUser = msg.sender === 'customer' || msg.sender === 'user';
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageRow,
                          isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
                        ]}
                      >
                        {!isUser && (
                          <View style={styles.senderAvatar}>
                            <UserCircle2 size={16} color="#10B981" />
                          </View>
                        )}
                        <View
                          style={[
                            styles.messageBubble,
                            isUser
                              ? { backgroundColor: colors.chatUserBg, borderBottomRightRadius: 4 }
                              : {
                                  backgroundColor: colors.chatRiderBg,
                                  borderBottomLeftRadius: 4,
                                  borderColor: colors.cardBorder,
                                  borderWidth: 1,
                                },
                          ]}
                        >
                          {/* Attached Photo Thumbnail */}
                          {msg.imageUri && (
                            <Image
                              source={{ uri: msg.imageUri }}
                              style={styles.bubbleImage}
                              resizeMode="cover"
                            />
                          )}

                          {/* Digital Booking Receipt Card */}
                          {msg.receiptData && (
                            <View style={[styles.chatReceiptCard, { backgroundColor: isDark ? 'rgba(10, 18, 14, 0.95)' : '#FFFFFF', borderColor: 'rgba(16, 185, 129, 0.35)', padding: 12, gap: 10 }]}>
                              <View style={styles.chatReceiptHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Receipt size={14} color="#10B981" />
                                  <Text style={styles.chatReceiptHeaderTitle}>VERIFIED DINING RECEIPT</Text>
                                </View>
                                <View
                                  style={[
                                    styles.receiptStatusPill,
                                    {
                                      backgroundColor: msg.receiptData.status?.toLowerCase() === 'booked' ? 'rgba(16, 185, 129, 0.15)' : msg.receiptData.status?.toLowerCase() === 'completed' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      borderColor: msg.receiptData.status?.toLowerCase() === 'booked' ? 'rgba(16, 185, 129, 0.35)' : msg.receiptData.status?.toLowerCase() === 'completed' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(239, 68, 68, 0.35)',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: '900',
                                      color: msg.receiptData.status?.toLowerCase() === 'booked' ? '#10B981' : msg.receiptData.status?.toLowerCase() === 'completed' ? '#3B82F6' : '#EF4444',
                                    }}
                                  >
                                    {msg.receiptData.status?.toUpperCase()}
                                  </Text>
                                </View>
                              </View>

                              <Text style={[styles.chatReceiptMessName, { color: colors.textMain }]}>
                                {msg.receiptData.messName}
                              </Text>

                              {/* Clean 2-column Detail List */}
                              <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 10, padding: 10, gap: 8, borderWidth: 1, borderColor: colors.cardBorder }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Hash size={11} color={colors.textSub} />
                                    <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>Order ID</Text>
                                  </View>
                                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#10B981' }}>
                                    {msg.receiptData.orderId || `#FM-${msg.receiptData.bookingId?.slice(-6).toUpperCase()}`}
                                  </Text>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Utensils size={11} color={colors.textSub} />
                                    <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>Meal Slot</Text>
                                  </View>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMain }}>
                                    {msg.receiptData.mealType?.toUpperCase()}
                                  </Text>
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Calendar size={11} color={colors.textSub} />
                                    <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>Date</Text>
                                  </View>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMain }}>
                                    {msg.receiptData.date}
                                  </Text>
                                </View>

                                {msg.receiptData.exactTime ? (
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                      <Clock size={11} color={colors.textSub} />
                                      <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>Timing</Text>
                                    </View>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMain }}>
                                      {msg.receiptData.exactTime}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>

                              <View style={styles.chatReceiptSecurityRow}>
                                <ShieldCheck size={12} color="#10B981" />
                                <Text style={styles.chatReceiptSecurityText}>1 Verified Meal Token Deducted</Text>
                              </View>
                            </View>
                          )}

                          {msg.text && !msg.receiptData ? (
                            <Text
                              style={[
                                styles.messageText,
                                isUser ? { color: '#FFFFFF' } : { color: colors.textMain },
                              ]}
                            >
                              {msg.text}
                            </Text>
                          ) : null}

                          <View style={styles.bubbleMetaRow}>
                            <Text
                              style={[
                                styles.messageTime,
                                isUser ? { color: 'rgba(255, 255, 255, 0.75)' } : { color: colors.textSub },
                              ]}
                            >
                              {msg.time}
                            </Text>
                            {isUser && <CheckCheck size={12} color="#FFFFFF" style={{ opacity: 0.85 }} />}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* ================= SESSION RESOLVED BY ADMIN BANNER ================= */}
                {sessionResolved && !viewingPastSession && (
                  <View style={{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.08)', borderTopWidth: 1, borderTopColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={18} color="#10B981" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>Session Closed by Super Admin</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSub, textAlign: 'center' }}>
                      Your support query has been reviewed and resolved. Start a new session if you need further help.
                    </Text>
                    <TouchableOpacity
                      style={{ marginTop: 6, backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}
                      onPress={() => {
                        setSessionResolved(false);
                        resolveActiveSession();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>OK, Close Chat</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ================= WHATSAPP STYLE INPUT BAR ================= */}
                {!viewingPastSession && !sessionResolved && (
                  <View style={styles.whatsappBarContainer}>
                    {/* Attached Photo Thumbnail Preview */}
                    {attachedImageUri && (
                      <View style={[styles.attachedImagePreview, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                        <Image source={{ uri: attachedImageUri }} style={styles.previewImageThumb} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.previewImageTitle, { color: colors.textMain }]}>Image Attached</Text>
                          <Text style={{ fontSize: 11, color: colors.textSub }}>Ready to send to support desk</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeImageBtn}
                          onPress={() => setAttachedImageUri(null)}
                          activeOpacity={0.8}
                        >
                          <X size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Main WhatsApp Input Row */}
                    <View style={styles.whatsappInputRow}>
                      {/* Pill Container */}
                      <View style={[styles.whatsappPill, { backgroundColor: isDark ? '#141E1B' : '#F1F5F9', borderColor: colors.cardBorder }]}>
                        {/* Emoji Button */}
                        <TouchableOpacity
                          style={styles.pillActionBtn}
                          onPress={() => setShowEmojiTray(!showEmojiTray)}
                          activeOpacity={0.7}
                        >
                          <Smile size={22} color={showEmojiTray ? '#10B981' : colors.textSub} />
                        </TouchableOpacity>

                        {/* TextInput without browser outline */}
                        <TextInput
                          style={[
                            styles.whatsappTextInput,
                            {
                              color: colors.textMain,
                              maxHeight: 100,
                            },
                          ]}
                          placeholder="Message"
                          placeholderTextColor={colors.textSub}
                          value={inputText}
                          onChangeText={setInputText}
                          multiline
                        />

                        {/* Attach Paperclip Button */}
                        <TouchableOpacity
                          style={styles.pillActionBtn}
                          onPress={() => setShowAttachModal(true)}
                          activeOpacity={0.7}
                        >
                          <Paperclip size={20} color={colors.textSub} />
                        </TouchableOpacity>

                        {/* Camera Quick Button (when no text) */}
                        {!inputText.trim() && !attachedImageUri && (
                          <TouchableOpacity
                            style={styles.pillActionBtn}
                            onPress={takePhotoWithCamera}
                            activeOpacity={0.7}
                          >
                            <Camera size={20} color={colors.textSub} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Right Circular Action Button: Send or Mic */}
                      {inputText.trim() || attachedImageUri ? (
                        <TouchableOpacity
                          style={styles.whatsappSendCircle}
                          onPress={handleSendMessage}
                          activeOpacity={0.88}
                        >
                          <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.whatsappMicCircle}
                          onPress={handleSendVoiceNote}
                          activeOpacity={0.88}
                        >
                          <Mic size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* WhatsApp Emoji Tray */}
                    {showEmojiTray && (
                      <View style={[styles.emojiTrayCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                        {/* Category Selector Tabs */}
                        <View style={styles.emojiCategoryTabs}>
                          {EMOJI_CATEGORIES.map((cat, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.emojiCatTab,
                                activeEmojiCategory === idx && { borderBottomColor: '#10B981', borderBottomWidth: 2 },
                              ]}
                              onPress={() => setActiveEmojiCategory(idx)}
                            >
                              <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  color: activeEmojiCategory === idx ? '#10B981' : colors.textSub,
                                }}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Emoji Grid */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiGrid}>
                          {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, eIdx) => (
                            <TouchableOpacity
                              key={eIdx}
                              style={styles.emojiButton}
                              onPress={() => insertEmoji(emoji)}
                              activeOpacity={0.6}
                            >
                              <Text style={styles.emojiText}>{emoji}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ================= WHATSAPP ATTACHMENT MODAL ================= */}
      <Modal
        visible={showAttachModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAttachModal(false)}
        >
          <View style={[styles.attachSheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.attachSheetTitle, { color: colors.textMain }]}>Share Attachment</Text>

            <View style={styles.attachGrid}>
              {/* Photo & Video Gallery */}
              <TouchableOpacity style={styles.attachItem} onPress={pickImageFromGallery} activeOpacity={0.8}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#8B5CF6' }]}>
                  <ImageIcon size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.attachItemLabel, { color: colors.textMain }]}>Gallery</Text>
              </TouchableOpacity>

              {/* Camera Photo */}
              <TouchableOpacity style={styles.attachItem} onPress={takePhotoWithCamera} activeOpacity={0.8}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#EC4899' }]}>
                  <Camera size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.attachItemLabel, { color: colors.textMain }]}>Camera</Text>
              </TouchableOpacity>

              {/* Mess Token / Receipt Document */}
              <TouchableOpacity
                style={styles.attachItem}
                onPress={openBookingReceiptPicker}
                activeOpacity={0.8}
              >
                <View style={[styles.attachIconCircle, { backgroundColor: '#06B6D4' }]}>
                  <FileText size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.attachItemLabel, { color: colors.textMain }]}>Booking Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= BOOKING RECEIPT PICKER MODAL ================= */}
      <Modal
        visible={showReceiptPickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceiptPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowReceiptPickerModal(false)}
        >
          <View style={[styles.receiptPickerSheet, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.sheetHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color="#10B981" />
                <Text style={[styles.sheetTitleText, { color: colors.textMain }]}>Select Meal Booking Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReceiptPickerModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.textSub, marginBottom: 8 }}>
              Select an active or verified meal booking to share its official verification receipt directly with Support.
            </Text>

            {loadingBookings ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 8 }}>Loading your meal bookings...</Text>
              </View>
            ) : userBookingsList.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center', gap: 6 }}>
                <Ticket size={32} color={colors.textSub} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>No Meal Bookings Found</Text>
                <Text style={{ fontSize: 11, color: colors.textSub, textAlign: 'center' }}>
                  You do not have any active or past meal bookings on this account.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {userBookingsList.map((booking) => {
                  const orderId = `FM-ORD-${(booking.id || Date.now().toString()).slice(-6).toUpperCase()}`;
                  const formattedDate = formatBookingDate(booking.created_at);
                  const exactTime = booking.cutoff_time ? `Cutoff ${booking.cutoff_time}` : '2:15 PM';

                  return (
                    <TouchableOpacity
                      key={booking.id}
                      style={[styles.receiptItemCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                      onPress={() => handleAttachBookingReceipt(booking)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                          <Utensils size={14} color="#10B981" />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }} numberOfLines={1}>
                            {booking.mess_name || 'Campus Partner Mess'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.receiptStatusPill,
                            booking.status === 'booked'
                              ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }
                              : booking.status === 'completed'
                              ? { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }
                              : { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '900',
                              color: booking.status === 'booked' ? '#10B981' : booking.status === 'completed' ? '#3B82F6' : '#EF4444',
                            }}
                          >
                            {booking.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Specific Order Details without emojis */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Hash size={11} color="#10B981" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>
                            #{orderId}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} color={colors.textSub} />
                          <Text style={{ fontSize: 11, color: colors.textSub }}>
                            {booking.meal_type?.toUpperCase()} • {exactTime}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} color={colors.textSub} />
                          <Text style={{ fontSize: 11, color: colors.textSub }}>
                            {formattedDate}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.receiptOtpRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={13} color="#10B981" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
                            1 Verified Meal Token
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>Attach Receipt</Text>
                          <ArrowRight size={12} color="#10B981" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ================= ASK FAQ MODAL ================= */}
      <Modal
        visible={showAskFaqModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAskFaqModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.askFaqModalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={styles.askFaqModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <HelpCircle size={20} color="#10B981" />
                <Text style={[styles.askFaqModalTitle, { color: colors.textMain }]}>Ask Campus Support</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAskFaqModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.askFaqModalSub, { color: colors.textSub }]}>
              Have a question about meal plans, partner messes, or tokens? Submit it here. Once verified & answered by the Super Admin, it will be published to the campus FAQs.
            </Text>

            {faqSubmitSuccess ? (
              <View style={styles.faqSuccessBanner}>
                <CheckCircle size={20} color="#10B981" />
                <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 13 }}>
                  Question submitted! Waiting for Super Admin review.
                </Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={[
                    styles.askFaqInput,
                    { color: colors.textMain, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9', borderColor: colors.cardBorder },
                  ]}
                  placeholder="Type your question in detail..."
                  placeholderTextColor={colors.textSub}
                  value={askQuestionText}
                  onChangeText={setAskQuestionText}
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity
                  style={[styles.submitFaqBtn, !askQuestionText.trim() && { opacity: 0.5 }]}
                  onPress={handleAskFaqSubmit}
                  disabled={submittingFaq || !askQuestionText.trim()}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={['#10B981', '#047857']} style={styles.submitFaqGrad}>
                    {submittingFaq ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Send size={15} color="#FFFFFF" />
                        <Text style={styles.submitFaqBtnText}>SUBMIT QUESTION</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomerBottomBar activeTab="profile" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 10,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 2,
  },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  faqAnswerContainer: {
    marginTop: 10,
  },
  faqDivider: {
    height: 1,
    marginVertical: 10,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  contactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  contactRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactValue: {
    fontSize: 11,
    marginTop: 2,
  },
  chatWrapper: {
    flex: 1,
    paddingBottom: 90,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSessionContainer: {
    padding: 16,
    alignItems: 'center',
  },
  startSessionCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  startSessionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  startSessionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  startSessionSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  startSessionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  startSessionGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startSessionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pastSessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  pastSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pastSessionDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  pastSessionSnippet: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  activeOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  backToActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resolveSessionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resolveSessionBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  messagesContainer: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 9,
    fontWeight: '600',
  },
  // WhatsApp Style Bar
  whatsappBarContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    gap: 6,
  },
  attachedImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  previewImageThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  previewImageTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  removeImageBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsappPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minHeight: 46,
  },
  pillActionBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappTextInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingTop: 10,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineWidth: 0,
          outlineStyle: 'none',
          outlineColor: 'transparent',
        } as any)
      : {}),
  },
  whatsappSendCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappMicCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Digital Receipt Card in Chat Bubble
  chatReceiptCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 4,
    minWidth: 220,
  },
  chatReceiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  chatReceiptHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  chatReceiptMessName: {
    fontSize: 14,
    fontWeight: '800',
  },
  chatReceiptMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  chatReceiptMetaLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
  },
  chatReceiptMetaVal: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  chatReceiptOtpBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  chatReceiptOtpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  chatReceiptOtpVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 2,
    marginTop: 2,
  },
  chatReceiptSecurityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chatReceiptSecurityText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  // Receipt Picker Sheet
  receiptPickerSheet: {
    width: '92%',
    maxWidth: 440,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitleText: {
    fontSize: 15,
    fontWeight: '900',
  },
  receiptItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  receiptStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  receiptOtpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  // Emoji Tray
  emojiTrayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  emojiCategoryTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 4,
    gap: 12,
  },
  emojiCatTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 6,
  },
  emojiButton: {
    padding: 6,
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 22,
  },
  // Modal Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  attachSheetTitle: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  attachGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  attachItem: {
    alignItems: 'center',
    gap: 8,
  },
  attachIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachItemLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Ask FAQ Styles
  askFaqHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  askFaqHeaderBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  communityFaqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  communityFaqBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  askFaqModalCard: {
    width: '92%',
    maxWidth: 440,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  askFaqModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  askFaqModalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
  },
  askFaqModalSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  askFaqInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitFaqBtn: {
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  submitFaqGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitFaqBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  faqSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: 14,
    borderRadius: 12,
  },
});
