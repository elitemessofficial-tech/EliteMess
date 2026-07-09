import React, { useState, useEffect } from 'react';
import { 
   View, 
   Text, 
   StyleSheet, 
   ScrollView, 
   TouchableOpacity, 
   TextInput, 
   ActivityIndicator, 
   Platform,
   Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, User, Sun, Moon, LogOut, ShieldCheck, UserCheck, CheckCircle, AlertCircle, DollarSign, Award } from 'lucide-react-native';
import { useAppTheme } from '../../src/context/ThemeContext';
import { supabase } from '../../src/services/supabase';
import Loader from '../../components/Loader';
import FloatingHeader from '../../components/FloatingHeader';

export default function RiderProfileScreen() {
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

  // Custom Toast/Alert State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [toastTitle, setToastTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = React.useRef<any>(null);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastTitle(title);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };
  
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('rider');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Rider metrics
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [tipsEarned, setTipsEarned] = useState(0);

  const colors = {
    bg: isDark ? '#0F0F0B' : '#F8FAFC',
    cardBg: isDark ? 'rgba(30, 30, 26, 0.45)' : 'rgba(255, 255, 255, 0.85)',
    cardBorder: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.25)',
    inputBg: isDark ? 'rgba(60, 60, 56, 0.3)' : 'rgba(15, 23, 42, 0.04)',
    textMain: isDark ? '#FFFFFF' : '#0F172A',
    textSub: isDark ? '#AEAEB2' : '#64748B',
    accentGold: '#D4AF37',
    goldGrad: ['#E2B755', '#B88E2F'] as const,
    statusGreen: '#10B981',
  };

  const getTabStyle = (isActive: boolean) => [
    styles.tabBtn,
    isActive && {
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.15)',
      borderRadius: 32,
      height: '100%' as any,
    }
  ];

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      let currentUserId = session?.user?.id;
      if (!currentUserId) {
        try {
          const { data } = await supabase.auth.signInAnonymously();
          currentUserId = data?.user?.id;
        } catch (e) {
          console.warn('Anonymous auth failed/disabled in rider fetch', e);
        }
        if (!currentUserId) {
          currentUserId = 'mock-rider-uid-123';
        }
      }

      setUserId(currentUserId);
      
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (profile) {
        setFullName(profile.full_name || 'Elite Rider');
        setPhoneNumber(profile.phone_number || '+15550198888');
        setRole(profile.role || 'rider');
      } else {
        setFullName('Rider Alpha');
        setPhoneNumber('+15550198888');
        setRole('rider');
      }

      // Fetch deliveries stats & tips
      const { data: deliveriesData } = await supabase
        .from('deliveries')
        .select(`
          id,
          status,
          orders (
            tip_amount
          )
        `)
        .eq('rider_id', currentUserId)
        .eq('status', 'delivered');

      if (deliveriesData) {
        setTotalDeliveries(deliveriesData.length);
        
        let sumTips = 0;
        deliveriesData.forEach((d: any) => {
          if (d.orders && d.orders.tip_amount) {
            sumTips += d.orders.tip_amount;
          }
        });
        setTipsEarned(sumTips);
      }
    } catch (e) {
      console.error('Error fetching rider profile & stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      showToast('Validation Error', 'Please enter your full name.', 'error');
      return;
    }

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', userId);

      if (error) throw error;
      showToast('Profile Updated', 'Your changes have been saved.', 'success');
    } catch (e: any) {
      showToast('Error', e.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('demo_role');
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Failed to sign out:', e);
      router.replace('/(auth)/login');
    }
  };

  const baseEarnings = totalDeliveries * 150;
  const netEarnings = baseEarnings + tipsEarned;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {toastVisible && (
        <View style={styles.alertOverlay}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={[styles.alertGlassCard, { borderColor: 'rgba(212, 175, 55, 0.25)', backgroundColor: isDark ? 'rgba(15, 15, 12, 0.85)' : 'rgba(255, 255, 255, 0.85)' }]}>
            <View style={styles.alertContent}>
              {toastType === 'success' && <CheckCircle size={18} color="#10B981" />}
              {toastType === 'error' && <AlertCircle size={18} color="#EF4444" />}
              {toastType === 'info' && <ShieldCheck size={18} color="#D4AF37" />}
              <View style={styles.alertTextWrapper}>
                <Text style={[styles.alertTitleText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{toastTitle}</Text>
                <Text style={[styles.alertMsgText, { color: isDark ? '#AEAEB2' : '#48484A' }]}>{toastMessage}</Text>
              </View>
            </View>
          </BlurView>
        </View>
      )}

      <FloatingHeader title="Rider Profile" titleAlign="center" showBackButton={true} />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={{ height: 120, position: 'relative' }}>
            <Loader />
          </View>
        ) : (
          <View style={styles.formContainer}>
            {/* User Meta Card */}
            <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.avatarCircle}>
                <User size={32} color={colors.accentGold} />
              </View>
              <Text style={[styles.profileNameTitle, { color: colors.textMain }]}>
                {fullName}
              </Text>
              <Text style={[styles.profilePhoneSub, { color: colors.textSub }]}>
                {phoneNumber}
              </Text>
              <View style={styles.roleBadge}>
                <UserCheck size={11} color="#000000" style={{ marginRight: 4 }} />
                <Text style={styles.roleBadgeText}>
                  {role.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Rider metrics */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold }]}>RIDER METRICS</Text>
            <View style={[styles.statsContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Completed Deliveries</Text>
                <Text style={[styles.statValue, { color: colors.textMain }]}>{totalDeliveries}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Base Earnings (₹150/del)</Text>
                <Text style={[styles.statValue, { color: colors.textMain }]}>₹{baseEarnings.toLocaleString()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.textSub }]}>Tips Collected</Text>
                <Text style={[styles.statValue, { color: colors.statusGreen, fontWeight: '800' }]}>+₹{tipsEarned.toLocaleString()}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={[styles.statRow, { marginTop: 4 }]}>
                <Text style={[styles.statLabel, { color: colors.accentGold, fontWeight: '800' }]}>Total Net Payout</Text>
                <Text style={[styles.statValue, { color: colors.accentGold, fontSize: 16, fontWeight: '900' }]}>₹{netEarnings.toLocaleString()}</Text>
              </View>
            </View>

            {/* Profile Inputs */}
            <Text style={[styles.sectionTitle, { color: colors.accentGold, marginTop: 24 }]}>EDIT PERSONAL DETAILS</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textSub }]}>Full Name</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.textMain }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name..."
                placeholderTextColor={colors.textSub}
              />
            </View>

            <TouchableOpacity 
              style={styles.saveBtnWrapper}
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
              >
                {updating ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.accentGold, marginTop: 32 }]}>PREFERENCES & ACCOUNT</Text>

            {/* Switch Theme Row */}
            <View style={[styles.settingsRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <View style={styles.settingsLabelWrapper}>
                {isDark ? (
                  <Moon size={18} color={colors.accentGold} style={{ marginRight: 10 }} />
                ) : (
                  <Sun size={18} color={colors.accentGold} style={{ marginRight: 10 }} />
                )}
                <Text style={[styles.settingsLabelText, { color: colors.textMain }]}>Dark Mode</Text>
              </View>
              <Switch 
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: '#E2B755' }}
                thumbColor={isDark ? '#B88E2F' : '#f4f3f4'}
              />
            </View>

            {/* Logout Row */}
            <TouchableOpacity 
              style={[styles.settingsRow, styles.logoutRow, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.settingsLabelWrapper}>
                <LogOut size={18} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.settingsLabelText, { color: '#EF4444', fontWeight: '800' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Navigation Bar */}
      <BlurView 
        intensity={95} 
        tint={isDark ? 'dark' : 'light'} 
        blurMethod="dimezisBlurView"
        style={[
          styles.bottomTabContainer, 
          { 
            borderColor: colors.cardBorder, 
            backgroundColor: isDark ? 'rgba(10, 10, 8, 0.35)' : 'rgba(255, 255, 255, 0.35)',
            borderWidth: 1
          }
        ]}
      >
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(rider)/rider_dashboard?segment=deliveries')}>
          <Home size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Deliveries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={getTabStyle(false)} onPress={() => router.replace('/(rider)/rider_dashboard?segment=earnings')}>
          <DollarSign size={18} color={colors.textSub} />
          <Text style={[styles.tabText, { color: colors.textSub }]}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={getTabStyle(true)}>
          <User size={18} color={colors.accentGold} />
          <Text style={[styles.tabText, { color: colors.accentGold }]}>Account</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 110,
    paddingBottom: 110,
  },
  formContainer: {
    width: '100%',
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  profileNameTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  profilePhoneSub: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
    paddingLeft: 4,
  },
  statsContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 10,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    paddingLeft: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    height: 48,
  },
  saveBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  saveBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  logoutRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  settingsLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bottomTabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 20,
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  alertOverlay: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  alertGlassCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertMsgText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
});
