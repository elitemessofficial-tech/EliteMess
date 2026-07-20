import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Wallet,
  Clock,
  CheckCircle2,
  Gift,
  Sparkles,
  Lock,
  ArrowUpRight,
  ChevronRight,
  Banknote,
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  Check,
  Smartphone
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';
import ScratchCardModal, { ScratchCardData } from '../../src/components/ScratchCardModal';
import { supabase } from '../../src/services/supabase';
import { getRazorpayKeys } from '../../src/config/razorpayConfig';
import { useSession } from '@descope/react-native-sdk';

interface WalletTransaction {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'credited' | 'debited';
  description: string;
  createdAt: string;
}

const REFUND_PREF_KEY = 'hotelbet_refund_preference';

export default function WalletScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const [balance, setBalance] = useState(0.00);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [scratchCards, setScratchCards] = useState<ScratchCardData[]>([]);
  const [deliveredOrderIds, setDeliveredOrderIds] = useState<Set<string>>(new Set());
  
  // Refund Preference state
  const [refundPreference, setRefundPreference] = useState<'wallet' | 'bank'>('bank');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedRefundOption, setSelectedRefundOption] = useState<'wallet' | 'bank'>('bank');

  // Add Balance Top-Up Modal
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [addAmountInput, setAddAmountInput] = useState('');
  
  // Active modal scratch card
  const [activeModalCard, setActiveModalCard] = useState<ScratchCardData | null>(null);

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load saved refund preference
  useEffect(() => {
    AsyncStorage.getItem(REFUND_PREF_KEY).then(val => {
      if (val === 'bank' || val === 'wallet') {
        setRefundPreference(val);
        setSelectedRefundOption(val);
      }
    });
  }, []);

  const saveRefundPreference = async (pref: 'wallet' | 'bank') => {
    try {
      await AsyncStorage.setItem(REFUND_PREF_KEY, pref);
      setRefundPreference(pref);
      setShowRefundModal(false);
      showToast(`Refund preference saved to ${pref === 'wallet' ? 'Hotel Bet Money' : 'Payment source (Bank UTR)'}`);
    } catch (e) {
      console.error('Error saving refund preference:', e);
    }
  };

  const loadWalletData = useCallback(async () => {
    try {
      let balStr = await AsyncStorage.getItem('hotelbet_wallet_balance');
      if (!balStr) {
        balStr = await AsyncStorage.getItem('hotelbet_wallet_balance_backup');
      }
      let loadedBal = balStr ? parseFloat(balStr) : 0.00;

      let txnStr = await AsyncStorage.getItem('hotelbet_wallet_transactions');
      if (!txnStr) {
        txnStr = await AsyncStorage.getItem('hotelbet_wallet_transactions_backup');
      }
      let loadedTxns: WalletTransaction[] = txnStr ? JSON.parse(txnStr) : [];

      let cardsStr = await AsyncStorage.getItem('hotelbet_scratch_cards');
      if (!cardsStr) {
        cardsStr = await AsyncStorage.getItem('hotelbet_scratch_cards_backup');
      }
      let loadedCards: ScratchCardData[] = cardsStr ? JSON.parse(cardsStr) : [];

      loadedTxns = loadedTxns.map(t => {
        if (t.description && t.description.toLowerCase().startsWith('used')) {
          return { ...t, status: 'debited' };
        }
        return t;
      });

      try {
        const { data: dbOrders } = await supabase
          .from('orders')
          .select('id, notes, status, total_amount, created_at')
          .order('created_at', { ascending: false });

        if (dbOrders && dbOrders.length > 0) {
          const deliveredSet = new Set(
            dbOrders
              .filter(o => o.status === 'delivered')
              .map(o => o.id)
          );
          setDeliveredOrderIds(deliveredSet);

          const cancelledOrRefundedSet = new Set(
            dbOrders
              .filter(o => o.status === 'cancelled' || (o.notes && (o.notes.includes('status=CREDITED') || o.notes.includes('[BANK_REFUND:') || o.notes.includes('[WALLET_REFUND:'))))
              .map(o => o.id)
          );

          let validCards: ScratchCardData[] = [];
          for (const card of loadedCards) {
            const matchingDbOrder = dbOrders.find(o => o.id === card.orderId);
            if (matchingDbOrder && matchingDbOrder.notes) {
              const notesLower = matchingDbOrder.notes.toLowerCase();
              const isScratchOrder = notesLower.includes('scratch card') || notesLower.includes('cashback');
              if (!isScratchOrder) {
                // Card was erroneously saved for non-scratch card order - purge it
                if (card.isScratched) {
                  loadedBal = Math.max(0, loadedBal - card.wonAmount);
                  loadedTxns = loadedTxns.filter(t => t.orderId !== card.orderId);
                }
                continue;
              }
            }

            if (cancelledOrRefundedSet.has(card.orderId)) {
              if (card.isScratched) {
                loadedBal = Math.max(0, loadedBal - card.wonAmount);
                loadedTxns = loadedTxns.filter(t => t.orderId !== card.orderId);
                loadedTxns.push({
                  id: `txn_revoke_${card.orderId.slice(0, 8)}_${Date.now()}`,
                  orderId: card.orderId,
                  amount: card.wonAmount,
                  status: 'debited',
                  description: `Revoked Cashback (Order Cancelled/Refunded)`,
                  createdAt: new Date().toISOString()
                });
              }
              continue;
            }
            validCards.push(card);
          }
          loadedCards = validCards;

          const existingCardOrderIds = new Set(loadedCards.map(c => c.orderId));

          for (const order of dbOrders) {
            const notesStr = (order.notes || '').toLowerCase();
            const isQualifyingReward = 
              notesStr.includes('scratch card') || 
              notesStr.includes('cashback');

            if (isQualifyingReward && !existingCardOrderIds.has(order.id) && !cancelledOrRefundedSet.has(order.id)) {
              let minPrize = 25;
              let maxPrize = 35;
              let tierName = 'Order ₹500+ Tier';

              if (order.total_amount >= 2000) {
                minPrize = 80;
                maxPrize = 100;
                tierName = 'Order ₹2000+ Tier';
              } else if (order.total_amount >= 1000) {
                minPrize = 50;
                maxPrize = 65;
                tierName = 'Order ₹1000+ Tier';
              }

              let seed = 0;
              for (let i = 0; i < order.id.length; i++) {
                seed += order.id.charCodeAt(i);
              }
              const wonAmount = (seed % (maxPrize - minPrize + 1)) + minPrize;
              const isDelivered = order.status === 'delivered';

              const recoveredCard: ScratchCardData = {
                id: `card_${order.id.slice(0, 8)}`,
                orderId: order.id,
                tierName,
                minPrize,
                maxPrize,
                wonAmount,
                isScratched: isDelivered,
                createdAt: order.created_at || new Date().toISOString()
              };

              loadedCards.push(recoveredCard);
              existingCardOrderIds.add(order.id);

              if (isDelivered) {
                const hasTxn = loadedTxns.some(t => t.orderId === order.id);
                if (!hasTxn) {
                  loadedTxns.push({
                    id: `txn_auto_${order.id.slice(0, 8)}`,
                    orderId: order.id,
                    amount: wonAmount,
                    status: 'credited',
                    description: `Scratch Card Cashback (${tierName})`,
                    createdAt: order.created_at || new Date().toISOString()
                  });
                  loadedBal += wonAmount;
                }
              }
            }
          }
        } else {
          loadedCards = [];
          loadedTxns = [];
          loadedBal = 0;
          setDeliveredOrderIds(new Set());
        }
      } catch (dbErr) {
        console.warn('Failed to fetch DB orders during wallet sync:', dbErr);
      }

      loadedTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      loadedCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setBalance(loadedBal);
      setTransactions(loadedTxns);
      setScratchCards(loadedCards);

      await AsyncStorage.setItem('hotelbet_wallet_balance', String(loadedBal));
      await AsyncStorage.setItem('hotelbet_wallet_balance_backup', String(loadedBal));

      await AsyncStorage.setItem('hotelbet_wallet_transactions', JSON.stringify(loadedTxns));
      await AsyncStorage.setItem('hotelbet_wallet_transactions_backup', JSON.stringify(loadedTxns));

      await AsyncStorage.setItem('hotelbet_scratch_cards', JSON.stringify(loadedCards));
      await AsyncStorage.setItem('hotelbet_scratch_cards_backup', JSON.stringify(loadedCards));
    } catch (e) {
      console.error('Failed to load wallet data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWalletData();
    }, [loadWalletData])
  );

  // Helper: credit wallet after successful payment
  const creditWalletBalance = async (amt: number, paymentId: string) => {
    const newBal = balance + amt;
    const newTxn: WalletTransaction = {
      id: `topup_${Date.now()}`,
      orderId: `topup_${Date.now()}`,
      amount: amt,
      status: 'credited',
      description: `Added Balance via Razorpay (${paymentId})`,
      createdAt: new Date().toISOString()
    };

    const updatedTxns = [newTxn, ...transactions];

    setBalance(newBal);
    setTransactions(updatedTxns);
    setShowAddBalanceModal(false);
    setAddAmountInput('');

    await AsyncStorage.setItem('hotelbet_wallet_balance', String(newBal));
    await AsyncStorage.setItem('hotelbet_wallet_balance_backup', String(newBal));
    await AsyncStorage.setItem('hotelbet_wallet_transactions', JSON.stringify(updatedTxns));
    await AsyncStorage.setItem('hotelbet_wallet_transactions_backup', JSON.stringify(updatedTxns));

    showToast(`₹${amt} added to Hotel Bet Money via Razorpay!`);
  };

  const handleAddBalanceSubmit = async () => {
    const amt = parseFloat(addAmountInput);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid top-up amount.');
      return;
    }
    if (amt < 10) {
      Alert.alert('Minimum ₹10', 'Minimum top-up amount is ₹10.');
      return;
    }

    try {
      // Get customer phone for Razorpay key selection
      let customerPhone = '';
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone_number')
            .eq('id', user.id)
            .single();
          if (profile?.phone_number) customerPhone = profile.phone_number;
        }
      } catch (e) {}

      const razorpayKeys = getRazorpayKeys(customerPhone);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const rzpOptions = {
          key: razorpayKeys.key_id,
          amount: Math.round(amt * 100), // in paise
          currency: 'INR',
          name: 'Hotel Bet',
          description: `Wallet Top-Up ₹${amt} (${razorpayKeys.isTestMode ? 'TEST' : 'LIVE'})`,
          prefill: {
            contact: customerPhone,
            name: 'Valued Customer'
          },
          theme: { color: '#D4AF37' },
          handler: async function (response: any) {
            const paymentId = response?.razorpay_payment_id || `pay_rzp_${Date.now()}`;
            await creditWalletBalance(amt, paymentId);
          },
          modal: {
            ondismiss: function () {
              showToast('Payment cancelled. Wallet not updated.');
            }
          }
        };

        const openRzpModal = () => {
          try {
            const rzp = new (window as any).Razorpay(rzpOptions);
            rzp.open();
          } catch (e: any) {
            console.error('Failed to open Razorpay modal:', e);
            // Fallback: credit directly in test mode
            if (razorpayKeys.isTestMode) {
              creditWalletBalance(amt, `pay_test_fallback_${Date.now()}`);
            } else {
              Alert.alert('Payment Error', 'Failed to open payment gateway. Please try again.');
            }
          }
        };

        if ((window as any).Razorpay) {
          openRzpModal();
        } else {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => openRzpModal();
          script.onerror = () => {
            if (razorpayKeys.isTestMode) {
              creditWalletBalance(amt, `pay_test_script_fail_${Date.now()}`);
            } else {
              Alert.alert('Payment Error', 'Failed to load payment gateway. Please try again.');
            }
          };
          document.body.appendChild(script);
        }
      } else {
        // Native app: direct credit with simulated payment ID for now
        await creditWalletBalance(amt, `pay_native_${Date.now()}`);
      }
    } catch (e: any) {
      console.error('Wallet top-up error:', e);
      Alert.alert('Error', 'Failed to process payment: ' + (e.message || 'Unknown error'));
    }
  };

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.3)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    goldGrad: ['#E2B755', '#B88E2F'] as const,
    goldCardGrad: isDark 
      ? ['#3A2D10', '#1C1608', '#2A200B'] as const
      : ['#FFFBEB', '#FEF3C7', '#FDE68A'] as const,
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + 
           ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const activeCards = scratchCards.filter(c => !c.isScratched);
  const claimedCards = scratchCards.filter(c => c.isScratched);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader 
        title="Hotel Bet Money" 
        titleAlign="center" 
        showBackButton={true}
      />

      {toastMsg && (
        <View style={[styles.toastBanner, { backgroundColor: '#3A2D10', borderColor: colors.accentGold }]}>
          <CheckCircle2 size={16} color={colors.accentGold} />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>{toastMsg}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Luxury Gold Balance Card */}
        <LinearGradient
          colors={colors.goldCardGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.luxuryGoldCard, { borderColor: colors.accentGold }]}
        >
          <View style={styles.goldCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goldLabelText, { color: isDark ? '#E2B755' : '#B88E2F' }]}>AVAILABLE BALANCE</Text>
              <Text style={[styles.goldBalanceValue, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                ₹{Math.floor(balance)}
              </Text>
            </View>

            <View style={styles.goldMoneyGraphic}>
              <Banknote size={36} color={colors.accentGold} style={{ transform: [{ rotate: '-12deg' }] }} />
              <Wallet size={26} color={isDark ? '#FFFFFF' : '#0F172A'} style={{ position: 'absolute', bottom: -2, right: -2 }} />
            </View>
          </View>

          <View style={[styles.goldCardDivider, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(184, 142, 47, 0.3)' }]} />

          <Text style={[styles.goldSubtitleText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
            Hotel Bet Money can be used for all your orders across categories (Food, Dine-In & Delivery)
          </Text>
        </LinearGradient>

        {/* Get Instant Refunds Banner */}
        <View style={[styles.goldBannerCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goldBannerTitle, { color: colors.textMain }]}>
                Get instant refunds with Hotel Bet Money!
              </Text>
              <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, lineHeight: 15 }}>
                Current choice: <Text style={{ color: colors.accentGold, fontWeight: '800' }}>
                  {refundPreference === 'wallet' ? 'Hotel Bet Money (Instant ⚡)' : 'Bank UTR Payout (2-5 Days)'}
                </Text>
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedRefundOption(refundPreference);
                  setShowRefundModal(true);
                }}
                style={{ borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 12 }}
              >
                <LinearGradient
                  colors={colors.goldGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.goldBtnGrad}
                >
                  <Text style={styles.goldBtnText}>Select refund method</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.goldGraphicBadge}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(212, 175, 55, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.accentGold }}>
                <Banknote size={28} color={colors.accentGold} />
              </View>
            </View>
          </View>
        </View>

        {/* My Scratch Cards Section */}
        {scratchCards.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={[styles.sectionHeaderTitle, { color: colors.accentGold }]}>
              MY SCRATCH CARDS {activeCards.length > 0 ? `(${activeCards.length})` : ''}
            </Text>

            {activeCards.map((c) => {
              const isUnlocked = deliveredOrderIds.has(c.orderId);

              if (!isUnlocked) {
                return (
                  <TouchableOpacity
                    key={c.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      Alert.alert(
                        '🔒 Scratch Card Locked',
                        `This scratch card for Order #${c.orderId.substring(0, 8).toUpperCase()} is locked.\n\nIt will unlock automatically once your food is delivered by the delivery guy!`
                      );
                    }}
                    style={[
                      styles.scratchCardTile,
                      {
                        backgroundColor: 'rgba(212, 175, 55, 0.12)',
                        borderColor: colors.accentGold,
                        borderWidth: 1.2,
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.goldGiftBadge, { backgroundColor: colors.accentGold }]}>
                        <Lock size={18} color="#000000" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '900' }}>
                          {c.tierName} Scratch Card
                        </Text>
                        <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                          Unlocks upon doorstep delivery
                        </Text>
                      </View>
                      <View style={[styles.scratchActionPill, { backgroundColor: 'rgba(212, 175, 55, 0.2)', borderColor: colors.accentGold }]}>
                        <Lock size={11} color={colors.accentGold} />
                        <Text style={[styles.scratchActionText, { color: colors.accentGold }]}>LOCKED</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.85}
                  onPress={() => setActiveModalCard(c)}
                  style={[styles.scratchCardTile, { backgroundColor: 'rgba(212, 175, 55, 0.12)', borderColor: colors.accentGold }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.goldGiftBadge}>
                      <Gift size={20} color="#000000" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '900' }}>
                        {c.tierName} Scratch Card
                      </Text>
                      <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                        Guaranteed ₹{c.minPrize} – ₹{c.maxPrize} Cashback
                      </Text>
                    </View>
                    <View style={styles.scratchActionPill}>
                      <Sparkles size={12} color="#000000" />
                      <Text style={styles.scratchActionText}>SCRATCH</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {claimedCards.map((c) => (
              <View
                key={c.id}
                style={[styles.scratchCardTile, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: 0.7 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.goldGiftBadge, { backgroundColor: 'rgba(212, 175, 55, 0.2)' }]}>
                    <CheckCircle2 size={18} color={colors.accentGold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '800' }}>
                      {c.tierName} Scratch Card
                    </Text>
                    <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2 }}>
                      Scratched · Claimed ₹{c.wonAmount}
                    </Text>
                  </View>
                  <Text style={{ color: colors.accentGold, fontSize: 13, fontWeight: '900' }}>
                    +₹{c.wonAmount}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Transactions Section */}
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.textMain }]}>Recent Transactions</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyTransactionContainer}>
              <View style={[styles.emptyPhoneIconWrapper, { borderColor: colors.cardBorder }]}>
                <Smartphone size={56} color={colors.textSub} style={{ opacity: 0.35 }} />
              </View>
              <Text style={[styles.emptyTransactionText, { color: colors.textSub }]}>
                You don't have any recent transactions
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: 12 }}>
              {transactions.map((txn) => {
                const isDebited = txn.status === 'debited' || (txn.description && txn.description.toLowerCase().startsWith('used'));
                const isCredited = !isDebited && txn.status === 'credited';
                
                const statusColor = isDebited ? '#EF4444' : colors.accentGold;
                const statusBg = isDebited ? 'rgba(239, 68, 68, 0.12)' : 'rgba(212, 175, 55, 0.12)';
                const statusLabel = isDebited ? 'DEBITED' : isCredited ? 'CREDITED' : 'PENDING';
                const amountPrefix = isDebited ? '-₹' : '+₹';

                return (
                  <View 
                    key={txn.id} 
                    style={[styles.txnRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: statusBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isDebited ? (
                          <ArrowUpRight size={16} color="#EF4444" />
                        ) : isCredited ? (
                          <CheckCircle2 size={16} color={colors.accentGold} />
                        ) : (
                          <Clock size={16} color="#F59E0B" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                          {txn.description}
                        </Text>
                        <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2 }}>
                          {formatDate(txn.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ 
                        color: statusColor, 
                        fontSize: 14, 
                        fontWeight: '900' 
                      }}>
                        {amountPrefix}{txn.amount}
                      </Text>
                      <View style={{
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: statusBg,
                        marginTop: 3,
                      }}>
                        <Text style={{ 
                          color: statusColor,
                          fontSize: 8,
                          fontWeight: '900',
                          letterSpacing: 0.5,
                        }}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Fixed Action Bar */}
      <View style={[styles.bottomFixedBar, { backgroundColor: isDark ? '#0A0A08' : '#FFFFFF', borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setShowAddBalanceModal(true)}
          style={{ borderRadius: 14, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={colors.goldGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addBalanceBtnGrad}
          >
            <Text style={styles.addBalanceBtnText}>Add Balance</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/cart')}
          style={{ alignItems: 'center', marginTop: 10 }}
        >
          <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '600' }}>
            Have a gift promo code? <Text style={{ color: colors.accentGold, fontWeight: '900' }}>Redeem Now</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Refund Method Selection Bottom Sheet Modal */}
      <Modal
        visible={showRefundModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRefundModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.bottomSheetModal, { backgroundColor: isDark ? '#151512' : '#FFFFFF' }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textMain }]}>
                Where would you like to receive refunds?
              </Text>
              <TouchableOpacity onPress={() => setShowRefundModal(false)} style={styles.closeCircleBtn}>
                <X size={16} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedRefundOption('wallet')}
                style={[
                  styles.refundOptionCard,
                  {
                    borderColor: selectedRefundOption === 'wallet' ? colors.accentGold : colors.cardBorder,
                    backgroundColor: selectedRefundOption === 'wallet' ? (isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.06)') : 'transparent',
                    borderWidth: selectedRefundOption === 'wallet' ? 2 : 1
                  }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentGold, alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={20} color="#000000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.optionTitle, { color: colors.textMain }]}>Hotel Bet Money</Text>
                      <View style={styles.instantPill}>
                        <Sparkles size={10} color={colors.accentGold} style={{ marginRight: 2 }} />
                        <Text style={[styles.instantPillText, { color: colors.accentGold }]}>Instant</Text>
                      </View>
                    </View>
                    <Text style={[styles.optionSubtitle, { color: colors.textSub }]}>
                      Instant and usable immediately.
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, selectedRefundOption === 'wallet' && { borderColor: colors.accentGold }]}>
                    {selectedRefundOption === 'wallet' && <View style={[styles.radioInnerCircle, { backgroundColor: colors.accentGold }]} />}
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedRefundOption('bank')}
                style={[
                  styles.refundOptionCard,
                  {
                    borderColor: selectedRefundOption === 'bank' ? colors.accentGold : colors.cardBorder,
                    backgroundColor: selectedRefundOption === 'bank' ? (isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.06)') : 'transparent',
                    borderWidth: selectedRefundOption === 'bank' ? 2 : 1
                  }
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#475569', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.optionTitle, { color: colors.textMain }]}>Payment source</Text>
                      <View style={{ backgroundColor: 'rgba(100, 116, 139, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: colors.textSub, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>DEFAULT</Text>
                      </View>
                    </View>
                    <Text style={[styles.optionSubtitle, { color: colors.textSub }]}>
                      Refunds may take 2-5 days (Direct Bank UTR).
                    </Text>
                  </View>
                  <View style={[styles.radioCircle, selectedRefundOption === 'bank' && { borderColor: colors.accentGold }]}>
                    {selectedRefundOption === 'bank' && <View style={[styles.radioInnerCircle, { backgroundColor: colors.accentGold }]} />}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => saveRefundPreference(selectedRefundOption)}
              style={{ marginTop: 24, borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.savePrefBtn}
              >
                <Text style={styles.savePrefBtnText}>Save preference</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Balance Top-Up Modal */}
      <Modal
        visible={showAddBalanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddBalanceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddBalanceModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.dialogModal, { backgroundColor: isDark ? '#1C1C18' : '#FFFFFF' }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textMain, fontSize: 16, fontWeight: '900' }}>
                Add Money to Wallet
              </Text>
              <TouchableOpacity onPress={() => setShowAddBalanceModal(false)}>
                <X size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4 }}>
              Pay securely via Razorpay (UPI / Cards / NetBanking).
            </Text>

            <View style={{ marginTop: 16 }}>
              <TextInput
                style={[styles.amountInput, { color: colors.textMain, borderColor: colors.cardBorder, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9' }]}
                placeholder="Enter Amount (Min ₹10)"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
                value={addAmountInput}
                onChangeText={setAddAmountInput}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {['100', '200', '500', '1000'].map(val => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setAddAmountInput(val)}
                  style={{ 
                    flex: 1, 
                    paddingVertical: 8, 
                    borderRadius: 8, 
                    borderWidth: 1, 
                    borderColor: addAmountInput === val ? colors.accentGold : colors.cardBorder,
                    backgroundColor: addAmountInput === val ? 'rgba(212, 175, 55, 0.12)' : 'transparent',
                    alignItems: 'center' 
                  }}
                >
                  <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '800' }}>+₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Razorpay Secure Badge */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 6, 
              marginTop: 16, 
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', 
              padding: 8, 
              borderRadius: 8 
            }}>
              <ShieldCheck size={14} color={colors.accentGold} />
              <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '600', flex: 1 }}>
                Secured by <Text style={{ color: colors.accentGold, fontWeight: '900' }}>Razorpay</Text> • UPI • Cards • NetBanking • Wallets
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAddBalanceSubmit}
              style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden' }}
            >
              <LinearGradient colors={colors.goldGrad} style={{ paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                <CreditCard size={14} color="#000000" />
                <Text style={{ color: '#000000', fontSize: 13, fontWeight: '900' }}>
                  {addAmountInput && parseFloat(addAmountInput) > 0 
                    ? `PAY ₹${addAmountInput} VIA RAZORPAY →` 
                    : 'PAY & ADD VIA RAZORPAY →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Interactive Scratch Card Modal */}
      <ScratchCardModal
        visible={activeModalCard !== null}
        card={activeModalCard}
        onClose={() => setActiveModalCard(null)}
        onRewardClaimed={() => {
          loadWalletData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 104,
    paddingBottom: 120,
    gap: 16,
  },
  toastBanner: {
    position: 'absolute',
    top: 90,
    left: 20,
    right: 20,
    zIndex: 999,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  luxuryGoldCard: {
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  goldCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goldLabelText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  goldBalanceValue: {
    fontSize: 38,
    fontWeight: '900',
    marginTop: 4,
  },
  goldMoneyGraphic: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  goldCardDivider: {
    height: 1,
    marginVertical: 14,
  },
  goldSubtitleText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  goldBannerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  goldBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  goldBtnGrad: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  goldBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  goldGraphicBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyTransactionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyPhoneIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTransactionText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  scratchCardTile: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  goldGiftBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scratchActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scratchActionText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  bottomFixedBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  addBalanceBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBalanceBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    paddingRight: 10,
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundOptionCard: {
    padding: 14,
    borderRadius: 16,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  optionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  instantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  instantPillText: {
    fontSize: 9,
    fontWeight: '900',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  savePrefBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  savePrefBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  dialogModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
  },
});
