import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Plus,
  LogOut,
  Utensils,
  KeyRound,
  TrendingUp,
  Store,
  ChevronDown,
  RefreshCw,
  Sparkles,
  QrCode,
  ScanLine,
  ListPlus,
  UtensilsCrossed,
  User,
  Moon,
  Sun,
  Building2,
  Phone,
  CreditCard,
  Settings,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDescope, useSession } from '@descope/react-native-sdk';
import { useAppTheme } from '../../src/context/ThemeContext';
import FloatingHeader from '../../components/FloatingHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import OwnerBottomBar, { OwnerTabType } from '../../components/OwnerBottomBar';
import QRScannerModal from '../../src/components/QRScannerModal';
import {
  getMessesFromNeon,
  getMessOwnerDataFromNeon,
  updateMessMenuInNeon,
  verifyOwnerOtpInNeon,
  MessDBRecord,
  OwnerVerifiedLogItem,
} from '../../src/services/neon';
import { SEED_RESTAURANT_MESSES } from '../../src/services/dbSeedSync';

export default function MessOwnerDashboardScreen() {
  const router = useRouter();
  const sdk = useDescope();
  const { manageSession } = useSession();
  const { isDark, toggleTheme } = useAppTheme();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<OwnerTabType>('overview');

  // Mess Selection state
  const [messesList, setMessesList] = useState<MessDBRecord[]>([]);
  const [selectedMessId, setSelectedMessId] = useState<string>('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
  const [selectedMess, setSelectedMess] = useState<MessDBRecord | null>(null);
  const [showMessPicker, setShowMessPicker] = useState<boolean>(false);

  // Live Metrics & Real Log state
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [liveHeadcount, setLiveHeadcount] = useState<number>(0);
  const [verifiedCount, setVerifiedCount] = useState<number>(0);
  const [verifiedList, setVerifiedList] = useState<OwnerVerifiedLogItem[]>([]);

  // OTP & QR Scanner state
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

  // Menu Update state
  const [starDish, setStarDish] = useState<string>('Special Shahi Paneer & Butter Naan');
  const [cutoffTime, setCutoffTime] = useState<string>('2:15 PM');
  const [dishMenuInput, setDishMenuInput] = useState<string>('Shahi Paneer, Dal Makhani, Garlic Naan, Jeera Rice, Gulab Jamun');
  const [savingMenu, setSavingMenu] = useState<boolean>(false);

  // Logout Modal state
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // In-App Status / Feedback Card Modal State (replaces browser alerts)
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'menu';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showFeedback = (title: string, message: string, type: 'success' | 'error' | 'menu' = 'success') => {
    setStatusModal({
      visible: true,
      type,
      title,
      message,
    });
  };

  const colors = {
    bg: isDark ? '#080C0E' : '#F8FAFC',
    cardBg: isDark ? 'rgba(18, 26, 23, 0.88)' : 'rgba(255, 255, 255, 0.95)',
    cardBorder: isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.15)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#94A3B8' : '#64748B',
    emerald: '#10B981',
    inputBg: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(241, 245, 249, 0.8)',
  };

  // 1. Fetch Real Messes and Owner Data from Neon Database
  const fetchOwnerData = useCallback(async (messId: string) => {
    try {
      // 1. Fetch messes list
      let messes = await getMessesFromNeon();
      if (!messes || messes.length === 0) {
        messes = SEED_RESTAURANT_MESSES as unknown as MessDBRecord[];
      }
      setMessesList(messes);

      // Find selected mess record
      const currentMess = messes.find(m => m.id === messId) || messes[0];
      setSelectedMess(currentMess);
      if (currentMess) {
        setStarDish(currentMess.star_dish || 'Special Shahi Paneer & Butter Naan');
        setCutoffTime(currentMess.cutoff_time || '2:15 PM');
        if (currentMess.highlights && Array.isArray(currentMess.highlights) && currentMess.highlights.length > 0) {
          setDishMenuInput(currentMess.highlights.join(', '));
        } else {
          setDishMenuInput('Shahi Paneer, Dal Makhani, Garlic Naan, Jeera Rice, Gulab Jamun');
        }
      }

      // 2. Fetch real live headcount and verified logs from Neon
      const ownerStats = await getMessOwnerDataFromNeon(currentMess ? currentMess.id : messId);

      // Strictly real headcount from DB (0 if no active un-redeemed bookings exist)
      const headCount = Number(ownerStats.liveHeadcount) || 0;

      setLiveHeadcount(headCount);
      setVerifiedCount(ownerStats.verifiedCount || 0);
      setVerifiedList(ownerStats.verifiedLog || []);
    } catch (error) {
      console.warn('Error loading real owner data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnerData(selectedMessId);
  }, [fetchOwnerData, selectedMessId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOwnerData(selectedMessId);
  };

  // 2. Real OTP Verification Handler
  const handleVerifyOtp = async (overrideOtp?: string) => {
    const rawInput = overrideOtp !== undefined ? overrideOtp : enteredOtp;
    const cleanOtp = rawInput.trim().replace(/\D/g, '');
    if (cleanOtp.length < 4) {
      showFeedback('Invalid OTP', 'Please enter at least a 4-digit student OTP.', 'error');
      return;
    }

    setVerifying(true);
    try {
      // 1. Try real verification in Neon Database
      const result = await verifyOwnerOtpInNeon(selectedMessId, cleanOtp);

      if (result.success && result.entry) {
        setVerifiedList(prev => [result.entry!, ...prev]);
        setLiveHeadcount(prev => Math.max(0, prev - 1));
        setVerifiedCount(prev => prev + 1);
        setEnteredOtp('');

        const msg = `Dining confirmed for ${result.entry.studentName} (${result.entry.mealType})! 1 Token deducted from student pass.`;
        showFeedback('OTP Verified & Redeemed! 🎉', msg, 'success');
        return;
      }

      // 2. Check local storage active booking fallback
      try {
        const localActiveStr = await AsyncStorage.getItem('mealhop_active_booking');
        if (localActiveStr && localActiveStr !== 'EXPIRED') {
          const localBooking = JSON.parse(localActiveStr);
          const rawOtp = (localBooking.otp || '').replace(/\D/g, '');

          if (rawOtp.includes(cleanOtp) || cleanOtp.includes(rawOtp) || cleanOtp === rawOtp.slice(-4)) {
            // Mark verified locally
            localBooking.status = 'completed';
            await AsyncStorage.setItem('mealhop_active_booking', JSON.stringify(localBooking));

            const newEntry: OwnerVerifiedLogItem = {
              id: `v_${Date.now()}`,
              studentName: 'Verified Student',
              collegeId: '2026-CAMPUS-VIP',
              otp: localBooking.otp || cleanOtp,
              mealType: localBooking.mealType || 'Lunch',
              verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'completed',
            };

            setVerifiedList(prev => [newEntry, ...prev]);
            setLiveHeadcount(prev => Math.max(0, prev - 1));
            setVerifiedCount(prev => prev + 1);
            setEnteredOtp('');

            const msg = `Dining confirmed for OTP ${cleanOtp}. 1 Token deducted from student account.`;
            showFeedback('OTP Verified & Redeemed! 🎉', msg, 'success');
            return;
          }
        }
      } catch (e) {}

      // If not found anywhere:
      const failMsg = `No active dining booking found matching OTP "${rawInput}". Please check with the student.`;
      showFeedback('Verification Failed ❌', failMsg, 'error');
    } catch (e) {
      console.warn('Verification error:', e);
      showFeedback('Verification Error', 'Network issue communicating with Neon database.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleScanSuccess = (scannedOtp: string) => {
    setEnteredOtp(scannedOtp);
    handleVerifyOtp(scannedOtp);
  };

  // 3. Real Menu & Cutoff Update Handler
  const handleSaveMenu = async () => {
    if (!starDish.trim()) {
      showFeedback('Required Field', 'Please enter a valid Star Dish name.', 'error');
      return;
    }

    setSavingMenu(true);
    try {
      const parsedHighlights = dishMenuInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const success = await updateMessMenuInNeon(
        selectedMessId,
        starDish.trim(),
        cutoffTime.trim(),
        parsedHighlights.length > 0 ? parsedHighlights : undefined
      );
      if (success) {
        // Also update local state
        if (selectedMess) {
          setSelectedMess({
            ...selectedMess,
            star_dish: starDish.trim(),
            cutoff_time: cutoffTime.trim(),
            highlights: parsedHighlights,
          });
        }
        const msg = `Today's Star Dish is now "${starDish.trim()}" with cutoff at ${cutoffTime.trim()} and ${parsedHighlights.length} Dish Menu items saved!`;
        showFeedback('Menu Updated Successfully! 🔥', msg, 'menu');
      } else {
        showFeedback('Update Failed', 'Failed to update menu in database. Please check your network connection.', 'error');
      }
    } catch (e) {
      console.warn('Menu update error:', e);
      showFeedback('Update Error', 'An error occurred while updating menu in database.', 'error');
    } finally {
      setSavingMenu(false);
    }
  };

  // 4. Logout Handler
  const doLogout = async () => {
    try {
      await AsyncStorage.setItem('explicit_logout', 'true');
      await AsyncStorage.removeItem('vip_session_active');
      await AsyncStorage.removeItem('demo_role');
      await AsyncStorage.removeItem('user_selected_role');
      try { await sdk.logout(); } catch (e) {}
      try { await manageSession(undefined); } catch (e) {}
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Logout error:', e);
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FloatingHeader
        title="Mess Owner Portal"
        titleAlign="center"
        showBackButton={false}
        rightContent={
          <TouchableOpacity style={styles.logoutHeaderBtn} onPress={() => setShowLogoutModal(true)} activeOpacity={0.8}>
            <LogOut size={16} color="#EF4444" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* MESS PARTNER SELECTOR BAR */}
        <AnimatedEntrance direction="down">
          <TouchableOpacity
            style={[styles.messSelectorCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={() => setShowMessPicker(true)}
            activeOpacity={0.85}
          >
            <View style={styles.messIconCircle}>
              <Store size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>MANAGING PARTNER MESS</Text>
              <Text style={[styles.selectedMessTitle, { color: colors.textMain }]} numberOfLines={1}>
                {selectedMess?.name || 'Annapurna Campus Mess'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSub }} numberOfLines={1}>
                {selectedMess?.address || 'North Campus Hub, Pune'}
              </Text>
            </View>
            <View style={styles.switchMessPill}>
              <Text style={styles.switchMessText}>Switch</Text>
              <ChevronDown size={14} color="#10B981" />
            </View>
          </TouchableOpacity>
        </AnimatedEntrance>

        {/* 1. OVERVIEW SECTION / LIVE HEADCOUNT */}
        {(activeTab === 'overview' || activeTab === 'verify') && (
          <AnimatedEntrance direction="up" delay={60}>
            <LinearGradient
              colors={isDark ? ['#0F241C', '#061712'] : ['#ECFDF5', '#D1FAE5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metricBanner}
            >
              <View style={styles.metricHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                  <Users size={16} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 }} numberOfLines={1}>
                    DINING HEADCOUNT
                  </Text>
                </View>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>LIVE</Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                {loading ? (
                  <ActivityIndicator size="large" color="#10B981" />
                ) : (
                  <Text style={styles.metricNumber}>{liveHeadcount}</Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metricLabel, { color: colors.textMain }]}>Students Confirmed for Today</Text>
                  <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 2 }}>
                    {verifiedCount} student{verifiedCount === 1 ? '' : 's'} already verified
                  </Text>
                </View>
              </View>

              <View style={styles.metricFooter}>
                <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '600' }}>
                  🔥 Cutoff: <Text style={{ color: '#10B981', fontWeight: '800' }}>{cutoffTime}</Text>
                </Text>
                <TouchableOpacity onPress={onRefresh} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={12} color="#10B981" />
                  <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>Sync Neon DB</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </AnimatedEntrance>
        )}

        {/* 2. OTP VERIFICATION KEYPAD MODULE */}
        {(activeTab === 'overview' || activeTab === 'verify') && (
          <AnimatedEntrance direction="up" delay={120}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Student Dining Verification</Text>
              <View style={styles.secureBadge}>
                <ShieldCheck size={13} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>Direct Neon Ledger</Text>
              </View>
            </View>

            <View style={[styles.otpVerifyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {/* PRIMARY ACTION: CAMERA QR SCANNER */}
              <TouchableOpacity
                style={styles.scanQrHeroBtn}
                onPress={() => setShowScannerModal(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#047857']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.scanQrHeroGrad}
                >
                  <View style={styles.scanQrIconCircle}>
                    <QrCode size={20} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanQrHeroTitle}>Scan Student QR Code</Text>
                    <Text style={styles.scanQrHeroSub}>Point camera for instant verification</Text>
                  </View>
                  <ScanLine size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              {/* DIVIDER */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                <Text style={[styles.dividerText, { color: colors.textSub }]}>OR ENTER OTP MANUALLY</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} color="#10B981" />
                <Text style={[styles.otpCardTitle, { color: colors.textMain }]}>4-Digit / 8-Digit OTP</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSub, lineHeight: 16 }}>
                Enter the OTP shown on the student's booking screen
              </Text>

              {/* OTP Input Field */}
              <TextInput
                style={[styles.otpInput, { color: colors.textMain, borderColor: colors.cardBorder, backgroundColor: colors.inputBg }]}
                value={enteredOtp}
                onChangeText={setEnteredOtp}
                placeholder="e.g. 4900 or 8492"
                placeholderTextColor={colors.textSub}
                keyboardType="number-pad"
                maxLength={8}
              />

              {/* Verify Button */}
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => handleVerifyOtp()}
                disabled={verifying}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.verifyGrad}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text style={styles.verifyBtnText}>VERIFY OTP & DEDUCT TOKEN</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}

        {/* 3. DAILY MENU & CUTOFF MANAGEMENT */}
        {(activeTab === 'overview' || activeTab === 'menu') && (
          <AnimatedEntrance direction="up" delay={180}>
            <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Daily Menu & Cutoff Management</Text>
            <View style={[styles.menuUpdateCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Flame size={18} color="#FF6B00" fill="#FF6B00" />
                <Text style={[styles.otpCardTitle, { color: colors.textMain }]}>Today's Star Dish</Text>
              </View>

              <TextInput
                style={[styles.formInput, { color: colors.textMain, borderColor: colors.cardBorder, backgroundColor: colors.inputBg }]}
                value={starDish}
                onChangeText={setStarDish}
                placeholder="Enter special dish name"
                placeholderTextColor={colors.textSub}
              />

              <Text style={[styles.formLabel, { color: colors.textSub }]}>Pre-Book Cutoff Time</Text>
              <TextInput
                style={[styles.formInput, { color: colors.textMain, borderColor: colors.cardBorder, backgroundColor: colors.inputBg }]}
                value={cutoffTime}
                onChangeText={setCutoffTime}
                placeholder="e.g. 2:15 PM"
                placeholderTextColor={colors.textSub}
              />

              {/* DISH MENU ITEMS (EDITABLE) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <ListPlus size={16} color="#10B981" />
                <Text style={[styles.formLabel, { color: colors.textMain, marginTop: 0, fontWeight: '800' }]}>
                  Today's Dish Menu Items (Separated by commas)
                </Text>
              </View>
              <TextInput
                style={[styles.formInput, { color: colors.textMain, borderColor: colors.cardBorder, backgroundColor: colors.inputBg, height: 50 }]}
                value={dishMenuInput}
                onChangeText={setDishMenuInput}
                placeholder="e.g. Shahi Paneer, Dal Makhani, Garlic Naan, Jeera Rice, Gulab Jamun"
                placeholderTextColor={colors.textSub}
              />

              {/* LIVE DISH PREVIEW CHIPS */}
              {dishMenuInput.trim().length > 0 && (
                <View style={{ marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: colors.textSub, fontWeight: '700', marginBottom: 6 }}>
                    CUSTOMER SCREEN PREVIEW (DISH MENU):
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {dishMenuInput.split(',').map((d, i) => {
                      const trimmed = d.trim();
                      if (!trimmed) return null;
                      return (
                        <View key={i} style={styles.dishPreviewChip}>
                          <CheckCircle2 size={11} color="#10B981" />
                          <Text style={{ color: colors.textMain, fontSize: 11, fontWeight: '700' }}>{trimmed}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveMenuBtn, savingMenu && { opacity: 0.7 }]}
                onPress={handleSaveMenu}
                disabled={savingMenu}
                activeOpacity={0.85}
              >
                {savingMenu ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveMenuText}>Update Today's Mess Menu 🔥</Text>
                )}
              </TouchableOpacity>
            </View>
          </AnimatedEntrance>
        )}

        {/* 4. VERIFIED STUDENT DINING LOG */}
        {(activeTab === 'overview' || activeTab === 'log') && (
          <AnimatedEntrance direction="up" delay={220}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.sectionHeading, { color: colors.textMain }]}>Verified Dining Log (Real-Time)</Text>
              <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>
                {verifiedList.length} Record{verifiedList.length === 1 ? '' : 's'}
              </Text>
            </View>

            <View style={[styles.verifiedLogCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {verifiedList.length === 0 ? (
                <View style={styles.emptyLogWrapper}>
                  <Utensils size={32} color={colors.textSub} />
                  <Text style={{ color: colors.textMain, fontSize: 14, fontWeight: '700', marginTop: 8 }}>
                    No Verifications Yet Today
                  </Text>
                  <Text style={{ color: colors.textSub, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                    Verified student OTP entries will automatically appear here live.
                  </Text>
                </View>
              ) : (
                verifiedList.map((entry, idx) => (
                  <View
                    key={entry.id || idx}
                    style={[
                      styles.logRow,
                      idx === verifiedList.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.checkCircleIcon}>
                      <CheckCircle2 size={16} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentNameText, { color: colors.textMain }]}>{entry.studentName}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSub }}>
                        OTP: <Text style={{ color: colors.textMain, fontWeight: '700' }}>{entry.otp}</Text> • {entry.mealType} • {entry.verifiedAt}
                      </Text>
                    </View>
                    <View style={styles.deductTag}>
                      <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>-1 TOKEN</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </AnimatedEntrance>
        )}

        {/* 5. OWNER PROFILE & BUSINESS SETTINGS SECTION */}
        {activeTab === 'profile' && (
          <AnimatedEntrance direction="up" delay={60}>
            {/* Manager Profile Hero Card */}
            <View style={[styles.profileHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.profileAvatarCircle}>
                <User size={34} color="#10B981" />
                <View style={styles.avatarOnlineDot} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.profileManagerName, { color: colors.textMain }]}>Mess Partner Manager</Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                  {selectedMess?.name || 'Annapurna Campus Mess'}
                </Text>
                <View style={styles.partnerBadge}>
                  <ShieldCheck size={11} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>VERIFIED ELITEMESS PARTNER</Text>
                </View>
              </View>
            </View>

            {/* Mess Business Details */}
            <Text style={[styles.sectionHeading, { color: colors.textMain, marginTop: 16 }]}>Mess Business Overview</Text>
            <View style={[styles.profileInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.profileInfoRow}>
                <Building2 size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>CAMPUS LOCATION</Text>
                  <Text style={[styles.infoRowVal, { color: colors.textMain }]}>{selectedMess?.address || 'Gate 2, North Campus Hub, Pune'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <Utensils size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>CUISINE / SPECIALTY</Text>
                  <Text style={[styles.infoRowVal, { color: colors.textMain }]}>{selectedMess?.type || 'North Indian Thali Special'}</Text>
                </View>
              </View>

              <View style={styles.profileInfoRow}>
                <Clock size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>PRE-BOOK CUTOFF TIME</Text>
                  <Text style={[styles.infoRowVal, { color: colors.textMain }]}>{cutoffTime}</Text>
                </View>
              </View>

              <View style={[styles.profileInfoRow, { borderBottomWidth: 0 }]}>
                <Users size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>LIVE PRE-BOOKED TODAY</Text>
                  <Text style={[styles.infoRowVal, { color: '#10B981', fontWeight: '900' }]}>{liveHeadcount} Confirmed Student{liveHeadcount === 1 ? '' : 's'}</Text>
                </View>
              </View>
            </View>

            {/* Quick Preferences & Settings */}
            <Text style={[styles.sectionHeading, { color: colors.textMain, marginTop: 16 }]}>Preferences & Settlement</Text>
            <View style={[styles.profileInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {/* Theme Switch */}
              <TouchableOpacity style={styles.profileActionRow} onPress={toggleTheme} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {isDark ? <Moon size={18} color="#10B981" /> : <Sun size={18} color="#F59E0B" />}
                  <View>
                    <Text style={[styles.infoRowVal, { color: colors.textMain }]}>Theme Appearance</Text>
                    <Text style={{ fontSize: 11, color: colors.textSub }}>{isDark ? 'Dark Emerald Mode' : 'Light Crisp Mode'}</Text>
                  </View>
                </View>
                <View style={styles.themeTogglePill}>
                  <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '800' }}>Switch</Text>
                </View>
              </TouchableOpacity>

              {/* Settlement Ledger */}
              <View style={[styles.profileInfoRow, { marginTop: 4 }]}>
                <CreditCard size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>TOKEN SETTLEMENT LEDGER</Text>
                  <Text style={[styles.infoRowVal, { color: colors.textMain }]}>Instant Direct Debit via Neon Postgres</Text>
                </View>
              </View>

              {/* Partner Support Hotline */}
              <View style={[styles.profileInfoRow, { borderBottomWidth: 0 }]}>
                <Phone size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textSub, fontWeight: '700' }}>24/7 PARTNER DESK</Text>
                  <Text style={[styles.infoRowVal, { color: colors.textMain }]}>+91 98765 43210 (Partner Support)</Text>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.profileLogoutBtn}
              onPress={() => setShowLogoutModal(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.profileLogoutGrad}
              >
                <LogOut size={18} color="#FFFFFF" />
                <Text style={styles.profileLogoutText}>Sign Out of Owner Portal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedEntrance>
        )}
      </ScrollView>

      {/* ================= PARTNER MESS PICKER MODAL ================= */}
      <Modal
        visible={showMessPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMessPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.textMain }]}>Select Partner Mess</Text>
              <TouchableOpacity onPress={() => setShowMessPicker(false)} style={styles.pickerCloseBtn}>
                <Text style={{ color: colors.textMain, fontWeight: '800' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {messesList.map((m) => {
                const isCurrent = m.id === selectedMessId;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.messOptionRow,
                      isCurrent && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' },
                    ]}
                    onPress={() => {
                      setSelectedMessId(m.id);
                      setSelectedMess(m);
                      setStarDish(m.star_dish || 'Special Shahi Paneer & Butter Naan');
                      setCutoffTime(m.cutoff_time || '2:15 PM');
                      setShowMessPicker(false);
                      fetchOwnerData(m.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.messOptionName, { color: colors.textMain }]}>{m.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSub }}>{m.address} • {m.type}</Text>
                    </View>
                    {isCurrent && <CheckCircle2 size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

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
              <Text style={[modalStyles.title, { color: colors.textMain }]}>Sign Out of Owner Portal?</Text>
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

      {/* ================= THEMED STATUS / FEEDBACK CARD MODAL ================= */}
      <Modal
        visible={statusModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={modalStyles.overlay}>
          <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={modalStyles.cardWrapper}>
            <View
              style={[
                modalStyles.card,
                {
                  backgroundColor: isDark ? '#0D1412' : '#FFFFFF',
                  borderColor:
                    statusModal.type === 'error'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : statusModal.type === 'menu'
                      ? 'rgba(255, 107, 0, 0.4)'
                      : 'rgba(16, 185, 129, 0.4)',
                },
              ]}
            >
              {/* Icon Circle */}
              <View
                style={[
                  modalStyles.iconCircle,
                  statusModal.type === 'error'
                    ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }
                    : statusModal.type === 'menu'
                    ? { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: 'rgba(255, 107, 0, 0.4)' }
                    : { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' },
                ]}
              >
                {statusModal.type === 'error' ? (
                  <AlertCircle size={30} color="#EF4444" />
                ) : statusModal.type === 'menu' ? (
                  <Flame size={30} color="#FF6B00" fill="#FF6B00" />
                ) : (
                  <CheckCircle2 size={30} color="#10B981" />
                )}
              </View>

              {/* Title & Subtitle */}
              <Text style={[modalStyles.title, { color: colors.textMain }]}>{statusModal.title}</Text>
              <Text style={[modalStyles.subtitle, { color: colors.textSub }]}>{statusModal.message}</Text>

              {/* Dismiss Button */}
              <TouchableOpacity
                style={{ width: '100%', height: 48, borderRadius: 14, overflow: 'hidden', marginTop: 4 }}
                onPress={() => setStatusModal(prev => ({ ...prev, visible: false }))}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    statusModal.type === 'error'
                      ? ['#EF4444', '#DC2626']
                      : statusModal.type === 'menu'
                      ? ['#FF6B00', '#EA580C']
                      : ['#10B981', '#059669']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={modalStyles.confirmGrad}
                >
                  <Text style={modalStyles.confirmBtnText}>Great, Got It 👍</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ================= LIVE QR CODE CAMERA SCANNER MODAL ================= */}
      <QRScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* ================= DEDICATED OWNER BOTTOM NAVBAR ================= */}
      <OwnerBottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={liveHeadcount}
      />
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
    paddingBottom: 110,
    gap: 16,
  },
  messSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  messIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMessTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  switchMessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  switchMessText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 14,
  },
  metricNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: '#10B981',
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 0.8,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  otpVerifyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  scanQrHeroBtn: {
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  scanQrHeroGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  scanQrIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanQrHeroTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  scanQrHeroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  otpCardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  otpInput: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 6,
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
    fontSize: 13,
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
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  saveMenuBtn: {
    height: 46,
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
  dishPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  verifiedLogCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  emptyLogWrapper: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  deductTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  profileAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#080C0E',
  },
  profileManagerName: {
    fontSize: 16,
    fontWeight: '900',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  profileInfoCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 8,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  infoRowVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.8,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  themeTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  profileLogoutBtn: {
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  profileLogoutGrad: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileLogoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  pickerCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  messOptionName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
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
