import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Platform,
  Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useAppTheme } from '../../src/context/ThemeContext';

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);

  // Selected demo role in segmented control
  const [selectedDemoRole, setSelectedDemoRole] = useState<'customer' | 'owner' | 'rider'>('customer');

  const colors = {
    bg: '#0F0F0B', // Pitch dark luxury background
    cardBg: 'rgba(30, 30, 26, 0.7)',
    cardBorder: 'rgba(212, 175, 55, 0.15)', // Subtle gold border
    inputBg: 'rgba(60, 60, 56, 0.4)',
    inputText: '#FFFFFF',
    inputPlaceholder: '#8E8E93',
    textMain: '#FFFFFF',
    textSub: '#AEAEB2',
    accentGold: '#D4AF37', // Aurum Stays Gold
    goldGrad: ['#E2B755', '#B88E2F'] as const, // Smooth gold gradient
    goldGlow: 'rgba(212, 175, 55, 0.3)',
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setErrorMsg('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    try {
      console.log('Firebase verification SMS code requested for:', phoneNumber);
      setConfirmResult({ 
        confirm: async (code: string) => ({ 
          user: { uid: 'mock-firebase-uid-' + Date.now(), phoneNumber } 
        }) 
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending confirmation SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmCode) {
      setErrorMsg('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const firebaseUserCredential = await confirmResult.confirm(confirmCode);
      const { uid, phoneNumber: phone } = firebaseUserCredential.user;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single();
      
      if (profileError || !profile) {
        await supabase
          .from('profiles')
          .insert({
            id: uid,
            phone_number: phone || phoneNumber,
            full_name: 'Guest Guest',
            role: 'customer'
          });
      }
      
      console.log('User signed in with Firebase UID:', uid);
      await AsyncStorage.removeItem('demo_role');
      router.replace('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      // Authenticate anonymously in Supabase to receive a valid JWT session for RLS selection
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn('Supabase anonymous signin failed, proceeding with demo state only:', error.message);
      } else {
        console.log('Supabase anonymous session established:', data.session?.user?.id);
      }
      await AsyncStorage.setItem('demo_role', selectedDemoRole);
      router.replace('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save demo bypass');
    } finally {
      setLoading(false);
    }
  };

  const renderLogo = () => (
    <View style={styles.logoWrapper}>
      <LinearGradient
        colors={colors.goldGrad}
        style={styles.logoCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoInnerCircle}>
          <Image 
            source={require('../../assets/images/hotelbet.png')} 
            style={{ width: 82, height: 82 }} 
            resizeMode="contain"
          />
        </View>
      </LinearGradient>
      <Text style={styles.logoText}>H O T E L   B E T</Text>
    </View>
  );

  const renderGlassCard = (children: React.ReactNode) => {
    if (Platform.OS === 'ios' || Platform.OS === 'web') {
      return (
        <BlurView intensity={25} tint="dark" style={[styles.glassCard, { borderColor: colors.cardBorder }]}>
          {children}
        </BlurView>
      );
    }
    return (
      <View style={[styles.glassCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        {children}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {renderLogo()}

      <View style={styles.headerBlock}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.textSub }]}>
          Enter your number to access your private portal
        </Text>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {renderGlassCard(
        !confirmResult ? (
          <View style={styles.formContainer}>
            {/* Split Phone Input Row */}
            <View style={styles.splitInputRow}>
              <View style={[styles.countryDropdown, { backgroundColor: colors.inputBg }]}>
                <Text style={styles.countryText}>IN +91</Text>
                <ChevronDown size={14} color="#AEAEB2" />
              </View>
              
              <View style={[styles.phoneInputContainer, { backgroundColor: colors.inputBg }]}>
                <TextInput
                  style={[
                    styles.phoneInput, 
                    { 
                      color: colors.inputText,
                      borderBottomColor: phoneFocused ? colors.accentGold : 'transparent'
                    }
                  ]}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.inputPlaceholder}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleSendCode} 
              disabled={loading}
              activeOpacity={0.85}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientBtn, { shadowColor: colors.accentGold }]}
              >
                {loading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={[styles.otpInputContainer, { backgroundColor: colors.inputBg }]}>
              <TextInput
                style={[
                  styles.phoneInput, 
                  { 
                    color: colors.inputText,
                    borderBottomColor: codeFocused ? colors.accentGold : 'transparent'
                  }
                ]}
                placeholder="Enter 6-Digit OTP"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="number-pad"
                maxLength={6}
                value={confirmCode}
                onChangeText={setConfirmCode}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
              />
            </View>

            <TouchableOpacity 
              onPress={handleVerifyCode} 
              disabled={loading}
              activeOpacity={0.85}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientBtn, { shadowColor: colors.accentGold }]}
              >
                {loading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setConfirmResult(null)} style={styles.secondaryButton}>
              <Text style={[styles.secondaryButtonText, { color: colors.textSub }]}>Cancel Verification</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      <Text style={[styles.footerText, { color: colors.textSub }]}>
        By continuing, you agree to our Privacy Policy
      </Text>

      {/* Demo bypass gate */}
      <View style={[styles.demoContainer, { borderTopColor: 'rgba(255,255,255,0.05)' }]}>
        <Text style={styles.demoTitle}>DEMO GATEWAY BYPASS</Text>
        
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentBtn, selectedDemoRole === 'customer' && styles.segmentBtnActive]} 
            onPress={() => setSelectedDemoRole('customer')}
          >
            <Text style={[styles.segmentText, { color: selectedDemoRole === 'customer' ? '#000000' : '#8E8E93' }]}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, selectedDemoRole === 'owner' && styles.segmentBtnActive]} 
            onPress={() => setSelectedDemoRole('owner')}
          >
            <Text style={[styles.segmentText, { color: selectedDemoRole === 'owner' ? '#000000' : '#8E8E93' }]}>Owner</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, selectedDemoRole === 'rider' && styles.segmentBtnActive]} 
            onPress={() => setSelectedDemoRole('rider')}
          >
            <Text style={[styles.segmentText, { color: selectedDemoRole === 'rider' ? '#000000' : '#8E8E93' }]}>Rider</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.demoGoBtn}
          onPress={handleDemoLogin}
        >
          <Text style={styles.demoGoText}>Enter View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  logoInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    backgroundColor: '#0F0F0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondVector: {
    width: 14,
    height: 14,
    borderWidth: 1.8,
    borderColor: '#E2B755',
    transform: [{ rotate: '45deg' }],
  },
  logoText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 14,
    letterSpacing: 2,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  glassCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 0.8,
    backgroundColor: 'rgba(30, 30, 26, 0.4)',
  },
  formContainer: {
    width: '100%',
  },
  splitInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  countryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 6,
  },
  countryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flex: 1,
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  phoneInput: {
    fontSize: 14,
    height: '100%',
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingVertical: 0,
  },
  otpInputContainer: {
    width: '100%',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
    fontSize: 13,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '500',
  },
  demoContainer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 0.8,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 9,
    color: '#8E8E93',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#D4AF37',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  demoGoBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  demoGoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
