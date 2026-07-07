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
  Headphones 
} from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface Message {
  id: string;
  sender: 'user' | 'concierge';
  text: string;
  time: string;
}

export default function SupportScreen() {
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
      text: 'Greetings! Welcome to Hotel Bet Concierge Support. How may we elevate your dining and delivery experience today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

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

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      time: timeStr
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Auto scroll chat to bottom
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Simulate Concierge Support Reply
    setTimeout(() => {
      let replyText = "Thank you for reaching out to Hotel Bet support. A senior concierge agent has been notified of your query and will assist you shortly. You can also write to us directly at support@hotelbet.com.";
      
      const lower = userMsgText.toLowerCase();
      if (lower.includes('order') || lower.includes('food') || lower.includes('delay') || lower.includes('status')) {
        replyText = "We have alerted the branch kitchen dispatcher regarding your culinary order details. You can track real-time courier updates on your screen or contact our hotlines.";
      } else if (lower.includes('refund') || lower.includes('cancel') || lower.includes('wrong')) {
        replyText = "Order cancellations are processed instantly if food prep has not started. Refunds for eligible transactions are credited back to the original source within 24 hours.";
      } else if (lower.includes('tip') || lower.includes('rider') || lower.includes('earnings')) {
        replyText = " door-step tips are processed instantly in their entirety. 100% of tips are credited to your assigned rider's payouts list immediately upon successful delivery verification.";
      } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        replyText = "Hello! How can we assist you with your luxury hotel bet dining experience today?";
      }

      const replyMessage: Message = {
        id: `reply_${Date.now()}`,
        sender: 'concierge',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, replyMessage]);
      setIsTyping(false);

      // Auto scroll chat to bottom
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
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
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>DIRECT CONCIERGE HOTLINES</Text>
            
            <View style={[styles.contactCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.contactRow}>
                <Clock size={18} color={colors.accentGold} />
                <View>
                  <Text style={[styles.contactLabel, { color: colors.textMain }]}>Operating Hours</Text>
                  <Text style={[styles.contactValue, { color: colors.textSub }]}>24/7 Premium Dining Assistance</Text>
                </View>
              </View>

              <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder, marginVertical: 14 }]} />

              <TouchableOpacity style={styles.contactActionRow} onPress={handlePhoneCall}>
                <View style={styles.contactRowLeft}>
                  <Phone size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Phone Hotline</Text>
                    <Text style={[styles.contactValue, { color: colors.textSub }]}>+1 (800) 555-0199</Text>
                  </View>
                </View>
                <Text style={{ color: colors.accentGold, fontWeight: '800', fontSize: 11 }}>CALL NOW</Text>
              </TouchableOpacity>

              <View style={[styles.faqDivider, { backgroundColor: colors.cardBorder, marginVertical: 14 }]} />

              <TouchableOpacity style={styles.contactActionRow} onPress={handleEmailSupport}>
                <View style={styles.contactRowLeft}>
                  <Mail size={18} color={colors.accentGold} />
                  <View>
                    <Text style={[styles.contactLabel, { color: colors.textMain }]}>Email Concierge</Text>
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
            <ScrollView 
              ref={chatScrollRef}
              contentContainerStyle={styles.chatScrollContent}
              showsVerticalScrollIndicator={true}
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
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
              })}

              {isTyping && (
                <View style={[styles.messageContainer, { alignSelf: 'flex-start' }]}>
                  <View style={[styles.messageBubble, styles.typingBubble, { backgroundColor: colors.chatRiderBg, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                    <ActivityIndicator size="small" color={colors.accentGold} />
                    <Text style={[styles.typingText, { color: colors.textSub }]}>Concierge is writing...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
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
