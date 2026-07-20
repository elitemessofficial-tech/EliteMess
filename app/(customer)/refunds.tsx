import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Clipboard,
  Alert
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  Building2,
  CreditCard,
  Copy,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Wallet,
  Sparkles
} from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import Loader from '../../components/Loader';
import FloatingHeader from '../../components/FloatingHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RefundRecord {
  id: string;
  orderId: string;
  totalAmount: number;
  refundAmount: number;
  refundPercent: number;
  status: 'PENDING' | 'INITIATED' | 'CREDITED';
  txnId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export default function RefundsScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);

  const fetchRefundRecords = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all cancelled orders that have refund notes
      const { data: dbOrders, error } = await supabase
        .from('orders')
        .select('id, total_amount, notes, status, created_at, updated_at')
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const records: RefundRecord[] = [];

      (dbOrders || []).forEach(order => {
        const notesStr = order.notes || '';
        const isCodOrder = notesStr.toLowerCase().includes('payment: cod') || (notesStr.toLowerCase().includes('cod') && !notesStr.toLowerCase().includes('online'));

        const isRefundOrder =
          !isCodOrder &&
          (notesStr.includes('Refund') ||
          notesStr.includes('CANCELLED') ||
          notesStr.includes('OWNER REFUND') ||
          notesStr.includes('BANK_REFUND') ||
          notesStr.includes('WALLET_REFUND'));

        if (isRefundOrder) {
          // Parse refund percent
          let percent = 100;
          if (notesStr.includes('70%')) percent = 70;
          else if (notesStr.includes('50%')) percent = 50;
          else if (notesStr.includes('100%')) percent = 100;

          // Parse refund amount
          let amtMatch = notesStr.match(/₹(\d+)/);
          let amt = amtMatch ? parseInt(amtMatch[1]) : Math.round(order.total_amount * (percent / 100));

          // Parse Transaction ID
          let txnMatch = notesStr.match(/txn_id=([^\s|\]]+)/i) || notesStr.match(/TXN_ID:\s*([^\s|\]]+)/i) || notesStr.match(/Ref:\s*([^\s|\]]+)/i);
          let txnId = txnMatch ? txnMatch[1] : 'PENDING_OWNER_REF';

          // Determine status
          let status: 'PENDING' | 'INITIATED' | 'CREDITED' = 'INITIATED';
          if (txnId !== 'PENDING_OWNER_REF' && !txnId.includes('PENDING')) {
            status = 'CREDITED';
          } else if (notesStr.includes('CREDITED')) {
            status = 'CREDITED';
          }

          records.push({
            id: `ref_${order.id.slice(0, 8)}`,
            orderId: order.id,
            totalAmount: order.total_amount,
            refundAmount: amt,
            refundPercent: percent,
            status,
            txnId: txnId === 'PENDING_OWNER_REF' ? 'Processing Bank Payout' : txnId,
            notes: notesStr,
            createdAt: order.created_at,
            updatedAt: order.updated_at || order.created_at
          });
        }
      });

      setRefunds(records);
    } catch (err: any) {
      console.warn('Failed to load refund records:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRefundRecords();
  }, [fetchRefundRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRefundRecords();
  };

  const copyTxnId = async (txn: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(txn);
      } else {
        Clipboard.setString(txn);
      }
      Alert.alert('Copied!', `Bank Transaction Reference ID (${txn}) copied to clipboard.`);
    } catch (e) {
      Clipboard.setString(txn);
    }
  };

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    statusGreen: '#10B981',
    statusBlue: '#3B82F6',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Floating Header Component */}
      <FloatingHeader
        title="Bank Refund Tracker"
        titleAlign="center"
        showBackButton={true}
        rightContent={
          <TouchableOpacity 
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              borderWidth: 0.8,
              borderColor: colors.cardBorder
            }} 
            onPress={onRefresh}
          >
            <RefreshCw size={15} color={colors.accentGold} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />}
      >
        {/* Header Summary Banner */}
        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212, 175, 55, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={22} color={colors.accentGold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textMain, fontSize: 15, fontWeight: '900' }}>Direct Bank & UPI Refunds</Text>
              <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                All approved refunds are paid directly back to your original payment mode (GPay / PhonePe / Bank Account).
              </Text>
            </View>
          </View>
        </View>

        {/* Instant Wallet Refunds Promotion Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(customer)/wallet')}
          style={{ borderRadius: 18, overflow: 'hidden', marginTop: 12 }}
        >
          <LinearGradient
            colors={isDark ? ['#3A2D10', '#1C1608', '#2A200B'] : ['#FFFBEB', '#FEF3C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: 16,
              borderRadius: 18,
              borderWidth: 1.2,
              borderColor: colors.accentGold,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.accentGold,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Wallet size={22} color="#000000" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.textMain, fontSize: 14, fontWeight: '900' }}>
                    Want ⚡ Instant Refunds?
                  </Text>
                  <View style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: colors.accentGold, fontSize: 9, fontWeight: '900' }}>0 WAIT</Text>
                  </View>
                </View>

                <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                  Why wait 2–5 days for bank payouts? Switch to <Text style={{ color: colors.accentGold, fontWeight: '800' }}>Hotel Bet Money</Text> for 100% instant refunds ready to use immediately!
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                  <Text style={{ color: colors.accentGold, fontSize: 12, fontWeight: '900' }}>
                    SET INSTANT REFUND PREFERENCE
                  </Text>
                  <ArrowRight size={14} color={colors.accentGold} />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>MY REFUND HISTORY ({refunds.length})</Text>

        {loading ? (
          <View style={{ height: 200, justifyContent: 'center' }}>
            <Loader />
          </View>
        ) : refunds.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <ShieldCheck size={44} color={colors.textSub} style={{ opacity: 0.4, marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textMain }]}>No Bank Refunds Recorded</Text>
            <Text style={[styles.emptySub, { color: colors.textSub }]}>
              When an order is cancelled within the 30-minute window or refunded by the restaurant, bank status and UTR reference IDs will appear here.
            </Text>
          </View>
        ) : (
          refunds.map(rec => {
            const isCredited = rec.status === 'CREDITED';
            return (
              <View key={rec.id} style={[styles.refundCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.orderIdText, { color: colors.accentGold }]}>
                      ORDER #{rec.orderId.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={[styles.dateText, { color: colors.textSub }]}>
                      Cancelled on {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isCredited ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)', borderColor: isCredited ? colors.statusGreen : colors.statusBlue }]}>
                    <Text style={{ color: isCredited ? colors.statusGreen : colors.statusBlue, fontSize: 10, fontWeight: '900' }}>
                      {isCredited ? 'CREDITED TO BANK ✓' : 'PROCESSING PAYOUT ⏳'}
                    </Text>
                  </View>
                </View>

                {/* Amount Breakdown Row */}
                <View style={[styles.amountBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '700' }}>TOTAL ORDER INVOICE</Text>
                      <Text style={{ color: colors.textMain, fontSize: 13, fontWeight: '800', marginTop: 2 }}>₹{rec.totalAmount}</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '700' }}>REFUND RATE</Text>
                      <View style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 }}>
                        <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '900' }}>{rec.refundPercent}% REFUND</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '700' }}>REFUND AMOUNT</Text>
                      <Text style={{ color: colors.statusGreen, fontSize: 16, fontWeight: '900', marginTop: 2 }}>+₹{rec.refundAmount}</Text>
                    </View>
                  </View>
                </View>

                {/* Bank Reference Transaction ID */}
                <View style={[styles.txnBox, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.06)' : 'rgba(212, 175, 55, 0.08)', borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: colors.textSub, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                        BANK / UTR TRANSACTION REF ID:
                      </Text>
                      <Text style={{ color: colors.textMain, fontSize: 12, fontWeight: '900', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                        {rec.txnId}
                      </Text>
                    </View>
                    {rec.txnId !== 'Processing Bank Payout' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => copyTxnId(rec.txnId)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentGold, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                      >
                        <Copy size={11} color="#000000" />
                        <Text style={{ color: '#000000', fontSize: 10, fontWeight: '900' }}>COPY ID</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Stepper Progress */}
                <View style={styles.stepperContainer}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepDot, { backgroundColor: colors.accentGold }]}>
                      <CheckCircle2 size={12} color="#000000" />
                    </View>
                    <Text style={[styles.stepText, { color: colors.textMain }]}>Requested</Text>
                  </View>
                  <View style={[styles.stepLine, { backgroundColor: colors.accentGold }]} />
                  <View style={styles.stepItem}>
                    <View style={[styles.stepDot, { backgroundColor: colors.accentGold }]}>
                      <CheckCircle2 size={12} color="#000000" />
                    </View>
                    <Text style={[styles.stepText, { color: colors.textMain }]}>Approved</Text>
                  </View>
                  <View style={[styles.stepLine, { backgroundColor: isCredited ? colors.statusGreen : colors.accentGold }]} />
                  <View style={styles.stepItem}>
                    <View style={[styles.stepDot, { backgroundColor: isCredited ? colors.statusGreen : colors.statusBlue }]}>
                      <CheckCircle2 size={12} color="#000000" />
                    </View>
                    <Text style={[styles.stepText, { color: isCredited ? colors.statusGreen : colors.textMain }]}>
                      {isCredited ? 'Credited to Bank' : 'Bank Payout'}
                    </Text>
                  </View>
                </View>

                {/* Footer Note */}
                <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 12, fontStyle: 'italic', lineHeight: 14 }}>
                  {isCredited
                    ? `✓ Bank payout of ₹${rec.refundAmount} completed. Reference UTR: ${rec.txnId}`
                    : `⏳ Refund of ₹${rec.refundAmount} initiated by restaurant. Standard bank settlement takes 1-2 business days.`}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  emptyContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  refundCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '900',
  },
  dateText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.8,
  },
  amountBox: {
    borderRadius: 14,
    borderWidth: 0.8,
    padding: 12,
  },
  txnBox: {
    borderRadius: 12,
    borderWidth: 0.8,
    padding: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  stepText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
