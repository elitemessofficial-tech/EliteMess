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
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
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
  ArrowLeft
} from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';
import { supabase } from '../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '@descope/react-native-sdk';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface Message {
  id: string;
  sender: 'user' | 'concierge' | 'owner' | 'customer';
  text: string;
  time: string;
}

export default function SupportScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { isDark } = useAppTheme();

  // Tabs: 'faq' | 'chat' | 'contact'
  const [activeTab, setActiveTab] = useState<'faq' | 'chat' | 'contact'>('faq');

  // FAQ Accordion State
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Chat States
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init_1',
      sender: 'concierge',
      text: 'Greetings! Welcome to Hotel Bet Support. How may we elevate your dining and delivery experience today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const [supportOrderId, setSupportOrderId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [viewingPastSession, setViewingPastSession] = useState<any | null>(null);

  const initSupportChat = async () => {
    try {
      setChatLoading(true);
      let userId = session?.user?.userId;
      
      if (!userId) {
        const { data: sbSessionData } = await supabase.auth.getSession();
        userId = sbSessionData?.session?.user?.id;
      }
      
      if (!userId) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          userId = data?.user?.id;
        } catch (e) {}
        if (!userId) {
          userId = 'mock-customer-uid-999';
        }
      }

      const { data: active, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .eq('delivery_address', 'SUPPORT_TICKET')
        .eq('status', 'cancelled')
        .limit(1);

      if (active && active.length > 0) {
        const supportOrder = active[0];
        setSupportOrderId(supportOrder.id);
        if (supportOrder.notes) {
          try {
            const parsed = JSON.parse(supportOrder.notes);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
            }
          } catch (e) {}
        }
      } else {
        setSupportOrderId(null);
        setMessages([]);
      }

      const { data: resolved, error: resolvedErr } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', userId)
        .eq('delivery_address', 'SUPPORT_TICKET')
        .eq('status', 'delivered')
        .order('updated_at', { ascending: false });

      if (resolved) {
        setPastSessions(resolved);
      }
    } catch (e) {
      console.warn("Failed to load support sessions:", e);
    } finally {
      setChatLoading(false);
    }
  };

  const startNewSession = async () => {
    try {
      setChatLoading(true);
      let userId = session?.user?.userId;
      
      if (!userId) {
        const { data: sbSessionData } = await supabase.auth.getSession();
        userId = sbSessionData?.session?.user?.id;
      }
      
      if (!userId) {
        userId = 'mock-customer-uid-999';
      }

      const { data: created, error } = await supabase
        .from('orders')
        .insert({
          customer_id: userId,
          branch_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          status: 'cancelled',
          total_amount: 0,
          notes: JSON.stringify([
            {
              id: 'init_1',
              sender: 'concierge',
              text: 'Greetings! Welcome to your new Hotel Bet Support session. How may we elevate your dining and delivery experience today?',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]),
          delivery_address: 'SUPPORT_TICKET',
          delivery_phone: '+10000000000',
          delivery_latitude: 0,
          delivery_longitude: 0,
          tip_amount: 0
        })
        .select()
        .single();

      if (created) {
        setSupportOrderId(created.id);
        setMessages([
          {
            id: 'init_1',
            sender: 'concierge',
            text: 'Greetings! Welcome to your new Hotel Bet Support session. How may we elevate your dining and delivery experience today?',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        initSupportChat();
      }
    } catch (e) {
      console.warn("Failed to start support session:", e);
    } finally {
      setChatLoading(false);
    }
  };

  const resolveActiveSession = async () => {
    if (!supportOrderId) return;
    try {
      const updatedMessages = [
        ...messages,
        {
          id: `resolve_${Date.now()}`,
          sender: 'concierge',
          text: '✅ This support session has been closed and resolved. Thank you for choosing Hotel Bet.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          notes: JSON.stringify(updatedMessages)
        })
        .eq('id', supportOrderId);

      if (error) throw error;
      
      setSupportOrderId(null);
      setMessages([]);
      initSupportChat();
    } catch (e) {
      console.warn("Failed to close session:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      initSupportChat();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!supportOrderId) return;

    const channel = supabase
      .channel(`support_chat_${supportOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${supportOrderId}`
        },
        (payload: any) => {
          const updatedOrder = payload.new;
          if (updatedOrder && updatedOrder.notes) {
            try {
              const parsed = JSON.parse(updatedOrder.notes);
              if (Array.isArray(parsed)) {
                setMessages(parsed);
              }
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supportOrderId]);

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    inputBg: isDark ? 'rgba(60, 60, 56, 0.3)' : 'rgba(15, 23, 42, 0.04)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    goldGrad: ['#E2B755', '#B88E2F'] as const,
    chatUserBg: '#D4AF37',
    chatRiderBg: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
  };

  const faqs: FAQItem[] = [
    {
      id: 'faq_1',
      question: 'How do I select the closest branch?',
      answer: 'Upon signing in as a customer, you will see a list of active Hotel Bet branches with their approximate distance. Select the branch closest to you to view their specialized in-room menu.'
    },
    {
      id: 'faq_2',
      question: 'Where is my delivery verification OTP?',
      answer: 'Once your order status changes to placed, a unique 8-digit OTP is shown on your Order Tracking screen and in your Order History page. Please share this code with your rider upon arrival to complete delivery.'
    },
    {
      id: 'faq_3',
      question: 'How does doorstep tipping work?',
      answer: 'You can choose to tip your delivery partner directly from the Order Tracking screen using our pre-set buttons (₹20, ₹30, ₹50) or type a custom amount. 100% of these tips go directly to the rider\'s total payout.'
    },
    {
      id: 'faq_4',
      question: 'Can I cancel my order after placing it?',
      answer: 'Orders can be cancelled before they are accepted by the hotel kitchen. Once preparation begins, the cancellation option is removed. If cancelled, the OTP is automatically cleared.'
    },
    {
      id: 'faq_5',
      question: 'How do I review my food and delivery rider?',
      answer: 'Navigate to the Orders tab (History section) and tap "Leave Feedback" on any completed order. You can rate the food quality and your rider\'s performance independently.'
    }
  ];

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      text: userMsgText,
      time: timeStr
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');

    // Auto scroll chat to bottom
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    if (supportOrderId) {
      try {
        await supabase
          .from('orders')
          .update({ notes: JSON.stringify(updatedMessages) })
          .eq('id', supportOrderId);
      } catch (e) {
        console.warn("Failed to sync customer message to DB:", e);
      }
    }
  };

  const handlePhoneCall = () => {
    Linking.openURL('tel:+18005550199');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@hotelbet.com?subject=Hotel%20Bet%20Customer%20Support');
  };

  const toggleFaq = (id: string) => {
    if (expandedFaqId === id) {
      setExpandedFaqId(null);
    } else {
      setExpandedFaqId(id);
    }
  };

  const getTabButtonStyle = (tab: 'faq' | 'chat' | 'contact') => [
    styles.tabButton,
    { borderColor: colors.cardBorder },
    activeTab === tab && { backgroundColor: colors.accentGold }
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <FloatingHeader title="Help & Support" titleAlign="center" showBackButton={true} />

      {/* Navigation Sub-Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={getTabButtonStyle('faq')}
          onPress={() => setActiveTab('faq')}
        >
          <HelpCircle size={14} color={activeTab === 'faq' ? '#000000' : colors.textSub} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'faq' ? '#000000' : colors.textMain }]}>FAQs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={getTabButtonStyle('chat')}
          onPress={() => setActiveTab('chat')}
        >
          <MessageSquare size={14} color={activeTab === 'chat' ? '#000000' : colors.textSub} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'chat' ? '#000000' : colors.textMain }]}>Live Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={getTabButtonStyle('contact')}
          onPress={() => setActiveTab('contact')}
        >
          <Headphones size={14} color={activeTab === 'contact' ? '#000000' : colors.textSub} />
          <Text style={[styles.tabButtonText, { color: activeTab === 'contact' ? '#000000' : colors.textMain }]}>Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeTab === 'faq' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>FREQUENTLY ASKED QUESTIONS</Text>

            <View style={{ gap: 12 }}>
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <TouchableOpacity
                    key={faq.id}
                    style={[styles.faqCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => toggleFaq(faq.id)}
                    activeOpacity={0.8}
                  >
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
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {activeTab === 'contact' && (
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>DIRECT SUPPORT HOTLINES</Text>

            <View style={[styles.contactCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <TouchableOpacity style={styles.contactActionRow} onPress={() => setActiveTab('chat')}>
                <View style={styles.contactRowLeft}>
                  <Clock size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Operating Hours</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>24/7 Live Support Assistance</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>CHAT NOW</Text>
              </TouchableOpacity>

              <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder, marginVertical: 14 }]} />

              <TouchableOpacity style={styles.contactActionRow} onPress={handlePhoneCall}>
                <View style={styles.contactRowLeft}>
                  <Phone size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Phone Hotline</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>+91 9730820316</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>CALL NOW</Text>
              </TouchableOpacity>

              <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder, marginVertical: 14 }]} />

              <TouchableOpacity style={styles.contactActionRow} onPress={handleEmailSupport}>
                <View style={styles.contactRowLeft}>
                  <Mail size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Email Support</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>support@hotelbet.com</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>WRITE EMAIL</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {activeTab === 'chat' && (
          <View style={styles.chatWrapper}>
            {viewingPastSession ? (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder }}>
                  <TouchableOpacity onPress={() => setViewingPastSession(null)} style={{ padding: 4 }}>
                    <ArrowLeft size={16} color={colors.accentGold} />
                  </TouchableOpacity>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMain }}>Resolved Chat Log</Text>
                    <Text style={{ fontSize: 10, color: colors.textSub }}>Closed on {new Date(viewingPastSession.updated_at).toLocaleDateString()}</Text>
                  </View>
                </View>

                <ScrollView
                  style={{ flex: 1, marginVertical: 10 }}
                  contentContainerStyle={{ gap: 12, paddingBottom: 16, paddingHorizontal: 16 }}
                >
                  {(() => {
                    let pastMsgs = [];
                    try { pastMsgs = JSON.parse(viewingPastSession.notes); } catch (e) {}
                    return pastMsgs.map((msg: any) => {
                      const isUser = msg.sender === 'user' || msg.sender === 'customer';
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageContainer,
                            isUser ? { alignSelf: 'flex-end', alignItems: 'flex-end' } : { alignSelf: 'flex-start', alignItems: 'flex-start' }
                          ]}
                        >
                          <View
                            style={[
                              styles.messageBubble,
                              isUser
                                ? { backgroundColor: colors.chatUserBg, borderBottomRightRadius: 4 }
                                : { backgroundColor: colors.chatRiderBg, borderBottomLeftRadius: 4, borderColor: colors.cardBorder, borderWidth: 1 }
                            ]}
                          >
                            <Text style={[styles.messageText, { color: isUser ? '#000000' : colors.textMain }]}>
                              {msg.text}
                            </Text>
                          </View>
                          <Text style={styles.messageTime}>{msg.time}</Text>
                        </View>
                      );
                    });
                  })()}
                </ScrollView>

                <View style={{ paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: colors.cardBorder, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '800' }}>
                    🔒 This session was resolved and closed.
                  </Text>
                </View>
              </View>
            ) : !supportOrderId ? (
              <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 20, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                {chatLoading ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                    <ActivityIndicator size="large" color={colors.accentGold} />
                  </View>
                ) : (
                  <>
                    <View style={[styles.faqCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 20, alignItems: 'center', gap: 12 }]}>
                      <PlusSquare size={36} color={colors.accentGold} />
                      <Text style={{ fontSize: 14, fontWeight: '900', color: colors.textMain }}>Start Live Chat</Text>
                      <Text style={{ fontSize: 11, color: colors.textSub, textAlign: 'center', paddingHorizontal: 10 }}>
                        Connect instantly with the hotel operations desk to resolve culinary, room, or delivery inquiries.
                      </Text>
                      <TouchableOpacity 
                        onPress={startNewSession}
                        style={{ width: '105%', height: 40, marginTop: 8 }}
                      >
                        <LinearGradient
                          colors={colors.goldGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ width: '100%', height: '100%', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <Text style={{ color: '#000000', fontSize: 12, fontWeight: '900' }}>START NEW SESSION</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>

                    {pastSessions.length > 0 && (
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <History size={16} color={colors.accentGold} />
                          <Text style={{ fontSize: 12, fontWeight: '900', color: colors.accentGold, letterSpacing: 1.5, textTransform: 'uppercase' }}>Resolved Sessions History</Text>
                        </View>

                        <View style={{ gap: 10 }}>
                          {pastSessions.map((session, idx) => {
                            let msgs = [];
                            try { msgs = JSON.parse(session.notes); } catch (e) {}
                            const lastMsg = msgs[msgs.length - 1];

                            return (
                              <TouchableOpacity
                                key={session.id}
                                style={[styles.faqCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                onPress={() => setViewingPastSession(session)}
                                activeOpacity={0.8}
                              >
                                <View style={{ flex: 1, marginRight: 10 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textMain }}>
                                    Session of {new Date(session.updated_at).toLocaleDateString()}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: colors.textSub, marginTop: 2 }} numberOfLines={1}>
                                    Last: {lastMsg ? lastMsg.text : ''}
                                  </Text>
                                </View>
                                <Text style={{ color: colors.accentGold, fontSize: 10, fontWeight: '900' }}>VIEW LOG</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accentGold }} />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: colors.textMain }}>Active Support Session</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={resolveActiveSession}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5, borderColor: '#10B981' }}
                    activeOpacity={0.7}
                  >
                    <CheckCircle size={12} color="#10B981" />
                    <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>Close Session</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={chatScrollRef}
                  contentContainerStyle={styles.chatScrollContent}
                  showsVerticalScrollIndicator={true}
                  onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                >
                  {chatLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                      <ActivityIndicator size="large" color={colors.accentGold} />
                      <Text style={{ color: colors.textSub, marginTop: 12, fontSize: 12, fontWeight: '700' }}>
                        Connecting to Support Desk...
                      </Text>
                    </View>
                  ) : (
                    messages.map((msg) => {
                      const isUser = msg.sender === 'user' || msg.sender === 'customer';
                      return (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageContainer,
                            isUser ? { alignSelf: 'flex-end', alignItems: 'flex-end' } : { alignSelf: 'flex-start', alignItems: 'flex-start' }
                          ]}
                        >
                          <View
                            style={[
                              styles.messageBubble,
                              isUser
                                ? { backgroundColor: colors.chatUserBg, borderBottomRightRadius: 4 }
                                : { backgroundColor: colors.chatRiderBg, borderBottomLeftRadius: 4, borderColor: colors.cardBorder, borderWidth: 1 }
                            ]}
                          >
                            <Text style={[styles.messageText, { color: isUser ? '#000000' : colors.textMain }]}>
                              {msg.text}
                            </Text>
                          </View>
                          <Text style={styles.messageTime}>{msg.time}</Text>
                        </View>
                      );
                    })
                  )}

                  {isTyping && (
                    <View style={[styles.messageContainer, { alignSelf: 'flex-start' }]}>
                      <View style={[styles.messageBubble, styles.typingBubble, { backgroundColor: colors.chatRiderBg, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                        <ActivityIndicator size="small" color={colors.accentGold} />
                        <Text style={[styles.typingText, { color: colors.textSub }]}>Support agent is writing...</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                <View style={[styles.inputBar, { borderColor: colors.cardBorder }]}>
                  <TextInput
                    style={[styles.chatInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                    placeholder="Type your message..."
                    placeholderTextColor={colors.textSub}
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendMessage}
                  />
                  <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <LinearGradient
                      colors={colors.goldGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sendButtonGrad}
                    >
                      <Send size={15} color="#000000" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 100,
    gap: 8,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    borderRadius: 12,
    borderWidth: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  faqCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    lineHeight: 18,
  },
  faqAnswerContainer: {
    marginTop: 12,
  },
  faqDivider: {
    height: 0.8,
    marginBottom: 12,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  contactCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  contactActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  contactValue: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  chatWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chatScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 14,
  },
  messageContainer: {
    maxWidth: '80%',
    gap: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 9,
    color: '#8E8E93',
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 0.8,
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 0.8,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
