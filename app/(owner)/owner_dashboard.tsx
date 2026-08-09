import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  LogOut,
  Utensils,
  KeyRound,
  TrendingUp,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDescope, useSession } from '@descope/react-native-sdk';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { supabase } from '../../src/services/supabase';

interface VerifiedEntry {
  id: string;
  studentName: string;
  collegeId: string;
  otp: string;
  mealType: string;
  verifiedAt: string;
}

export default function MessOwnerDashboardScreen() {
  const router = useRouter();
  const sdk = useDescope();
  const { manageSession } = useSession();
  const { isDark } = useAppTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // OTP Verification state
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [liveHeadcount, setLiveHeadcount] = useState<number>(142);
  const [verifiedList, setVerifiedList] = useState<VerifiedEntry[]>([
    { id: 'v1', studentName: 'Alex Student', collegeId: '2026-CS-409', otp: '8492', mealType: 'Lunch', verifiedAt: '12:45 PM' },
    { id: 'v2', studentName: 'Rohan Sharma', collegeId: '2026-EC-102', otp: '3190', mealType: 'Lunch', verifiedAt: '12:38 PM' },
    { id: 'v3', studentName: 'Priya Patel', collegeId: '2026-ME-088', otp: '7721', mealType: 'Lunch', verifiedAt: '12:30 PM' },
  ]);

  // Menu Update state
  const [starDish, setStarDish] = useState<string>('Special Shahi Paneer & Butter Naan');
  const [cutoffTime, setCutoffTime] = useState<string>('2:15 PM');
  const [isMenuSaved, setIsMenuSaved] = useState<boolean>(false);

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
  };

  const handleVerifyOtp = async () => {
    if (enteredOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit student OTP.');
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      const newEntry: VerifiedEntry = {
        id: `v_${Date.now()}`,
        studentName: 'Student #' + Math.floor(1000 + Math.random() * 9000),
        collegeId: '2026-CAMPUS',
        otp: enteredOtp,
        mealType: 'Lunch',
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setVerifiedList([newEntry, ...verifiedList]);
      setLiveHeadcount((prev) => prev + 1);
      setEnteredOtp('');

      Alert.alert(
        'OTP Verified! 🎉',
        `Dining confirmed for OTP ${enteredOtp}. 1 Token deducted from student account.`
      );
    }, 600);
  };

  const handleSaveMenu = () => {
    setIsMenuSaved(true);
    Alert.alert('Menu Updated! 🔥', `Today's menu updated to "${starDish}" with cutoff at ${cutoffTime}.`);
  };

  const doLogout = async () => {
    try {
      await AsyncStorage.setItem('explicit_logout', 'true');
      await AsyncStorage.removeItem('vip_session_active');
      await AsyncStorage.removeItem('demo_role');
      await AsyncStorage.removeItem('user_selected_role');
      try { await sdk.logout(); } catch (e) {}
      try { await manageSession(undefined); } catch (e) {}
      try { await supabase.auth.signOut(); } catch (e) {}
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Logout error:', e);
      router.replace('/(auth)/login');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader
        title="Mess Owner Dashboard"
        titleAlign="center"
        showBackButton={false}
        rightContent={
          <TouchableOpacity style={styles.logoutHeaderBtn} onPress={handleLogout}>
            <LogOut size={16} color="#EF4444" />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Live Headcount Banner */}
        <AnimatedEntrance direction="down">
          <LinearGradient
            colors={isDark ? ['#0F241C', '#061712'] : ['#ECFDF5', '#D1FAE5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricBanner}
          >
            <View style={styles.metricHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Users size={18} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 }}>
                  LIVE PRE-BOOKED DINING HEADCOUNT
                </Text>
              </View>
              <View style={styles.livePill}>
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>LIVE</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricNumber}>{liveHeadcount}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSub }]}>Students Confirmed for Lunch Today</Text>
            </View>

            <View style={styles.metricFooter}>
              <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>
                🔥 Pre-Book Cutoff: <Text style={{ color: '#10B981', fontWeight: '800' }}>2:15 PM</Text>
              </Text>
              <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>
                98% Attendance Rate
              </Text>
            </View>
          </LinearGradient>
        </AnimatedEntrance>

        {/* PROMINENT OTP VERIFICATION KEYPAD MODULE */}
        <AnimatedEntrance direction="up" delay={100}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Student Dining Verification</Text>
          <View style={[styles.otpVerifyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <KeyRound size={20} color="#10B981" />
              <Text style={[styles.otpCardTitle, { color: colors.textMain }]}>Enter Student 4-Digit OTP</Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSub }}>
              Enter the time-bound OTP shown on the student's app at the counter
            </Text>

            {/* OTP Input Field */}
            <TextInput
              style={[styles.otpInput, { color: colors.textMain, borderColor: colors.cardBorder }]}
              value={enteredOtp}
              onChangeText={setEnteredOtp}
              placeholder="e.g. 8492"
              placeholderTextColor={colors.textSub}
              keyboardType="number-pad"
              maxLength={4}
            />

            {/* Verify Button */}
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerifyOtp}
              disabled={verifying}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.verifyGrad}
              >
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>
                  {verifying ? 'VERIFYING OTP...' : 'VERIFY OTP & DEDUCT TOKEN'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>

        {/* DAILY MENU & CUTOFF UPDATE MODULE */}
        <AnimatedEntrance direction="up" delay={150}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Daily Menu & Cutoff Management</Text>
          <View style={[styles.menuUpdateCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Flame size={18} color="#FF6B00" fill="#FF6B00" />
              <Text style={[styles.otpCardTitle, { color: colors.textMain }]}>Today's Star Dish</Text>
            </View>

            <TextInput
              style={[styles.formInput, { color: colors.textMain, borderColor: colors.cardBorder }]}
              value={starDish}
              onChangeText={setStarDish}
              placeholder="Enter special dish name"
              placeholderTextColor={colors.textSub}
            />

            <Text style={[styles.formLabel, { color: colors.textSub }]}>Pre-Book Cutoff Time</Text>
            <TextInput
              style={[styles.formInput, { color: colors.textMain, borderColor: colors.cardBorder }]}
              value={cutoffTime}
              onChangeText={setCutoffTime}
              placeholder="e.g. 2:15 PM"
              placeholderTextColor={colors.textSub}
            />

            <TouchableOpacity style={styles.saveMenuBtn} onPress={handleSaveMenu} activeOpacity={0.85}>
              <Text style={styles.saveMenuText}>Update Today's Mess Menu 🔥</Text>
            </TouchableOpacity>
          </View>
        </AnimatedEntrance>

        {/* VERIFIED DINING LOG */}
        <AnimatedEntrance direction="up" delay={200}>
          <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Verified Student Dining Log</Text>
          <View style={[styles.verifiedLogCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {verifiedList.map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <View style={styles.checkCircleIcon}>
                  <CheckCircle2 size={16} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentNameText, { color: colors.textMain }]}>{entry.studentName}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSub }}>OTP: {entry.otp} • {entry.verifiedAt}</Text>
                </View>
                <View style={styles.deductTag}>
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>-1 TOKEN</Text>
                </View>
              </View>
            ))}
          </View>
        </AnimatedEntrance>
      </ScrollView>

      {/* ================= THEMED LOGOUT CONFIRMATION MODAL ================= */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={modalStyles.overlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={modalStyles.cardWrapper}>
            <View style={[modalStyles.card, { backgroundColor: isDark ? '#0D1412' : '#FFFFFF', borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)' }]}>
              {/* Icon Circle */}
              <View style={modalStyles.iconCircle}>
                <LogOut size={28} color="#EF4444" />
              </View>

              {/* Title & Subtitle */}
              <Text style={[modalStyles.title, { color: colors.textMain }]}>Sign Out of Mess Owner Portal?</Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSub }]}>
                Are you sure you want to sign out? You will need to log back in to manage your mess menu and verify student dining OTPs.
              </Text>

              {/* Actions Row */}
              <View style={modalStyles.btnRow}>
                <TouchableOpacity
                  style={[modalStyles.cancelBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setShowLogoutModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[modalStyles.cancelBtnText, { color: colors.textMain }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={modalStyles.confirmBtn}
                  onPress={() => {
                    setShowLogoutModal(false);
                    doLogout();
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={modalStyles.confirmGrad}
                  >
                    <LogOut size={16} color="#FFFFFF" />
                    <Text style={modalStyles.confirmBtnText}>Sign Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoutHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  scrollContent: {
    paddingTop: 104,
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  metricBanner: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginVertical: 12,
  },
  metricNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: '#10B981',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  otpVerifyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  otpCardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  otpInput: {
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  verifyBtn: {
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  verifyGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  menuUpdateCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  saveMenuBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveMenuText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  verifiedLogCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  checkCircleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  deductTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
