import React, { useState, useRef, useEffect } from 'react';
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
import LottieView from 'lottie-react-native';
import { supabase } from '../../src/services/supabase';
import envBypass from '../../src/config/env_bypass.json';
import { useAppTheme } from '../../src/context/ThemeContext';

import { useDescope, useSession } from '@descope/react-native-sdk';

const isSpecialOwnerNumber = (phoneStr: string) => {
  const envVal = envBypass.EXPO_PUBLIC_OWNER_NUMBERS;
  const numbers = envVal.split(',').map(n => n.trim().replace(/\D/g, ''));
  const cleanPhone = phoneStr.replace(/\D/g, '');
  return numbers.some(n => cleanPhone.endsWith(n) && n.length >= 5);
};

const isVipNumber = (phoneStr: string) => {
  const vipVal = envBypass.EXPO_PUBLIC_VIP_NUMBER || '7777777777';
  const cleanVip = vipVal.replace(/\D/g, '');
  const cleanPhone = phoneStr.replace(/\D/g, '');
  return cleanPhone.endsWith(cleanVip) && cleanVip.length >= 5;
};

export default function PhoneLoginScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const sdk = useDescope();
  const { session, manageSession } = useSession();

  const codeInputRef = useRef<TextInput>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const [fullName, setFullName] = useState('');
  const [showNameForm, setShowNameForm] = useState(false);
  const [descopeUserData, setDescopeUserData] = useState<any>(null);
  const [showSuccessOnboarding, setShowSuccessOnboarding] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showOwnerSelection, setShowOwnerSelection] = useState(false);
  const [showVipSelection, setShowVipSelection] = useState(false);

  // Selected demo role in segmented control
  const [selectedDemoRole, setSelectedDemoRole] = useState<'customer' | 'owner' | 'rider'>('customer');

  const resetToLogin = async () => {
    setLoading(true);
    try {
      await AsyncStorage.removeItem('vip_session_active');
      await AsyncStorage.removeItem('user_selected_role');
      await AsyncStorage.removeItem('demo_role');

      try {
        await sdk.logout();
      } catch (err) {}
      try {
        await manageSession(undefined);
      } catch (err) {}
      try {
        await supabase.auth.signOut();
      } catch (err) {}

      setShowVipSelection(false);
      setShowOwnerSelection(false);
      setShowRoleSelection(false);
      setShowNameForm(false);
      setConfirmResult(null);
      setPhoneNumber('');
      setConfirmCode('');
      setDescopeUserData(null);
      setFullName('');
      setErrorMsg('');
    } catch (e) {
      console.error('Error resetting login:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkVipSession = async () => {
      const isVipActive = await AsyncStorage.getItem('vip_session_active');
      if (isVipActive === 'true') {
        const storedRole = await AsyncStorage.getItem('user_selected_role');
        if (storedRole) {
          if (storedRole === 'customer') router.replace('/');
          else if (storedRole === 'owner') router.replace('/(owner)/owner_dashboard');
          else if (storedRole === 'rider') router.replace('/(rider)/rider_dashboard');
        } else {
          setShowVipSelection(true);
          setDescopeUserData({ uid: 'vip_user_id', phone: `+91${process.env.EXPO_PUBLIC_VIP_NUMBER || '7777777777'}` });
        }
        return true;
      }
      return false;
    };

    const runChecks = async () => {
      const isVip = await checkVipSession();
      if (isVip) return;

      if (session) {
        try {
          const uid = session.user.userId;
          const phone = session.user.phone || '';

          // Fetch profile first to ensure name is configured
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .or(`id.eq.${uid},phone_number.eq.${phone}`)
            .maybeSingle();

          const hasValidName = profile && profile.full_name && 
                               profile.full_name !== 'Guest Customer' && 
                               profile.full_name !== 'Guest Guest' && 
                               profile.full_name !== 'Pending Rider';

          if (!hasValidName) {
            setDescopeUserData({ uid, phone });
            setShowNameForm(true);
            return;
          }

          if (phone && isSpecialOwnerNumber(phone)) {
            const storedRole = await AsyncStorage.getItem('user_selected_role');
            if (storedRole) {
              router.replace(storedRole === 'owner' ? '/(owner)/owner_dashboard' : '/');
            } else {
              setShowOwnerSelection(true);
              setDescopeUserData({ uid, phone });
            }
            return;
          }

          if (profile && profile.role === 'rider') {
            await AsyncStorage.setItem('user_selected_role', 'rider');
            router.replace('/(rider)/rider_dashboard');
            return;
          } else if (profile && profile.role === 'owner') {
            router.replace('/(owner)/owner_dashboard');
          } else {
            router.replace('/');
          }
        } catch (e) {
          console.warn('Error checking existing session:', e);
        }
      }
    };

    runChecks();
  }, [session]);

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
      const formattedPhone = `+91${phoneNumber.trim()}`;
      
      // Check VIP bypass
      if (isVipNumber(formattedPhone)) {
        console.log('VIP Number detected, bypassing OTP send.');
        // Sign in anonymously on Supabase to satisfy RLS
        await supabase.auth.signInAnonymously();
        
        const vipUid = 'vip_user_id';
        // Upsert standard VIP profile record
        await supabase
          .from('profiles')
          .upsert({
            id: vipUid,
            phone_number: formattedPhone,
            full_name: 'VIP Administrator',
            role: 'owner'
          });
          
        await AsyncStorage.setItem('vip_session_active', 'true');
        await AsyncStorage.removeItem('demo_role');
        
        setDescopeUserData({ uid: vipUid, phone: formattedPhone });
        setShowVipSelection(true);
        setLoading(false);
        return;
      }

      console.log('Sending Descope OTP code to:', formattedPhone);
      
      // Request Descope OTP code via SMS
      await sdk.otp.signUpOrIn.sms(formattedPhone);
      
      // Save confirmResult to trigger OTP input view
      setConfirmResult({ phone: formattedPhone });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending confirmation SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeOverride?: string) => {
    const codeToVerify = codeOverride || confirmCode;
    if (!codeToVerify) {
      setErrorMsg('Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const formattedPhone = confirmResult.phone;
      console.log('Verifying Descope OTP code for:', formattedPhone);
      
      // Verify OTP code using Descope SDK
      // NOTE: The React Native SDK may throw on failure instead of returning { ok: false }
      // On success it returns { data: JWTResponse } — the `.ok` property is not always present on native
      let response: any;
      try {
        response = await sdk.otp.verify.sms(formattedPhone, codeToVerify);
      } catch (verifyErr: any) {
        // Descope native SDK throws on invalid OTP
        console.error('Descope OTP verify threw:', verifyErr);
        throw new Error(verifyErr?.message || verifyErr?.errorMessage || 'Invalid verification code. Please try again.');
      }
      
      // Extract response data — handle both web SDK format ({ok, data}) and native ({data}) 
      const responseData = response?.data || response;
      
      if (!responseData || (!responseData.sessionJwt && !responseData.refreshJwt)) {
        // If we still don't have session tokens, check if the response itself has them
        if (!response?.sessionJwt && !response?.refreshJwt) {
          throw new Error('Invalid verification code or no session returned');
        }
      }
      
      // Normalize: use responseData if it has sessionJwt, else use response directly
      const sessionPayload = responseData?.sessionJwt ? responseData : response;
      
      // Persist the session in Descope session manager
      await manageSession(sessionPayload);
      
      // Access the session token and user details from Descope response
      const sessionToken = sessionPayload.sessionJwt;
      const refreshSessionToken = sessionPayload.refreshJwt;
      const descopeUser = sessionPayload.user;
      
      if (!descopeUser) {
        throw new Error('No user data returned from Descope');
      }
      const uid = descopeUser.userId;

      // Match Supabase session with Descope session token
      if (sessionToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: sessionToken,
          refresh_token: refreshSessionToken || '',
        });
        if (sessionError) {
          console.warn('Failed to sync Descope session with Supabase:', sessionError.message);
        }
      }

      // Check/create user profile in Supabase database by uid or by phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .or(`id.eq.${uid},phone_number.eq.${descopeUser.phone || formattedPhone}`)
        .maybeSingle();
      
      const isOwnerNum = isSpecialOwnerNumber(descopeUser.phone || formattedPhone);

      if (profile && profile.full_name && profile.full_name !== 'Guest Customer' && profile.full_name !== 'Guest Guest' && profile.full_name !== 'Pending Rider') {
        console.log('User profile already exists, role is:', profile.role);
        await AsyncStorage.removeItem('demo_role');

        // If the profile ID is a temporary one, update it to the proper UID
        if (profile.id !== uid) {
          await supabase.from('profiles').delete().eq('id', profile.id);
          await supabase.from('profiles').insert({
            id: uid,
            phone_number: descopeUser.phone || formattedPhone,
            full_name: profile.full_name,
            role: isOwnerNum ? 'owner' : profile.role
          });
        }

        if (isOwnerNum) {
          setDescopeUserData({ uid, phone: descopeUser.phone || formattedPhone });
          setShowOwnerSelection(true);
        } else if (profile.role === 'rider') {
          await AsyncStorage.setItem('user_selected_role', 'rider');
          router.replace('/(rider)/rider_dashboard');
        } else {
          router.replace('/');
        }
      } else {
        // Show name setup screen!
        setDescopeUserData({ uid, phone: descopeUser.phone || formattedPhone });
        setShowNameForm(true);
      }
    } catch (err: any) {
      console.error('OTP Verification error:', err);
      setErrorMsg(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNameAndSignIn = async () => {
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (!descopeUserData) throw new Error('No user metadata found');
      
      const { uid, phone } = descopeUserData;

      // Fetch existing profile to check if they are already rider/owner by uid or phone
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, role')
        .or(`id.eq.${uid},phone_number.eq.${phone}`)
        .maybeSingle();

      const isOwnerNum = isSpecialOwnerNumber(phone);
      const finalRole = isOwnerNum ? 'owner' : (existing?.role || 'customer');

      if (existing && existing.id !== uid) {
        // Delete the temporary profile row so we don't have duplicates or primary key conflicts
        await supabase.from('profiles').delete().eq('id', existing.id);
      }
      
      // Upsert profile in Supabase database
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: uid,
          phone_number: phone,
          full_name: fullName.trim(),
          role: finalRole
        });

      if (upsertErr) throw upsertErr;

      console.log('User signed in with new profile name, role is:', finalRole);
      await AsyncStorage.removeItem('demo_role');

      if (isOwnerNum) {
        setShowOwnerSelection(true);
      } else if (finalRole === 'rider') {
        await AsyncStorage.setItem('user_selected_role', 'rider');
        router.replace('/(rider)/rider_dashboard');
      } else {
        // Activate success animation view!
        setShowSuccessOnboarding(true);
        
        // Delay redirect by 2.5 seconds to show the Lottie tick beautifully
        setTimeout(() => {
          router.replace('/');
        }, 2500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving details');
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

  if (showSuccessOnboarding) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <LottieView
          source={require('../../assets/images/Greentick.lottie')}
          autoPlay
          loop={false}
          style={{ width: 160, height: 160, marginBottom: 20 }}
        />
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
          Account Created Successfully!
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 32 }}>
          Welcome to Hotel Bet. Loading your private portal...
        </Text>
      </View>
    );
  }

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
        showVipSelection ? (
          <View style={styles.formContainer}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
              VIP Control Center
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
              Authorized VIP access. Select view mode:
            </Text>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'owner');
                router.replace('/(owner)/owner_dashboard');
              }} 
              activeOpacity={0.85}
              style={{ marginBottom: 10 }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientBtn, { shadowColor: colors.accentGold }]}
              >
                <Text style={styles.buttonText}>Enter Owner View</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'rider');
                router.replace('/(rider)/rider_dashboard');
              }} 
              activeOpacity={0.85}
              style={{ marginBottom: 10 }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientBtn, { shadowColor: colors.accentGold }]}
              >
                <Text style={styles.buttonText}>Enter Rider View</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'customer');
                router.replace('/');
              }} 
              activeOpacity={0.85}
              style={[styles.secondaryButton, { marginTop: 4, height: 48, justifyContent: 'center' }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                Enter Customer View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToLogin} style={styles.secondaryButton}>
              <Text style={{ color: '#D4AF37', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                Use Different Number
              </Text>
            </TouchableOpacity>
          </View>
        ) : showOwnerSelection ? (
          <View style={styles.formContainer}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
              Select Access View
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              Your credentials grant owner level privileges. Choose your view portal:
            </Text>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'owner');
                router.replace('/(owner)/owner_dashboard');
              }} 
              activeOpacity={0.85}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientBtn, { shadowColor: colors.accentGold }]}
              >
                <Text style={styles.buttonText}>Login as Owner</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'customer');
                router.replace('/');
              }} 
              activeOpacity={0.85}
              style={[styles.secondaryButton, { marginTop: 4, height: 48, justifyContent: 'center' }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                Login as Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToLogin} style={styles.secondaryButton}>
              <Text style={{ color: '#D4AF37', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                Use Different Number
              </Text>
            </TouchableOpacity>
          </View>
        ) : showRoleSelection ? (
          <View style={styles.formContainer}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 }}>
              Select View Mode
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              You have rider access. Choose how you want to navigate today:
            </Text>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'rider');
                router.replace('/(rider)/rider_dashboard');
              }} 
              activeOpacity={0.85}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={colors.goldGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientBtn, { shadowColor: colors.accentGold }]}
              >
                <Text style={styles.buttonText}>Login as Rider</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                await AsyncStorage.setItem('user_selected_role', 'customer');
                router.replace('/');
              }} 
              activeOpacity={0.85}
              style={[styles.secondaryButton, { marginTop: 4, height: 48, justifyContent: 'center' }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                Login as Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToLogin} style={styles.secondaryButton}>
              <Text style={{ color: '#D4AF37', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                Use Different Number
              </Text>
            </TouchableOpacity>
          </View>
        ) : showNameForm ? (
          <View style={styles.formContainer}>
            <Text style={[styles.subtitle, { color: colors.textSub, marginBottom: 16, textAlign: 'left', marginTop: 0 }]}>
              Enter your name to complete your registration:
            </Text>
            
            <View style={[styles.phoneInputContainer, { backgroundColor: colors.inputBg, width: '100%', marginBottom: 16, height: 48, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }]}>
              <TextInput
                style={{
                  color: colors.inputText,
                  fontSize: 14,
                  height: '100%',
                }}
                placeholder="Full Name"
                placeholderTextColor={colors.inputPlaceholder}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <TouchableOpacity 
              onPress={handleSaveNameAndSignIn} 
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
                  <Text style={styles.buttonText}>Complete Signup</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToLogin} style={styles.secondaryButton}>
              <Text style={{ color: '#D4AF37', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                Use Different Number
              </Text>
            </TouchableOpacity>
          </View>
        ) : !confirmResult ? (
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
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={(val) => {
                    const digits = val.replace(/\D/g, '');
                    setPhoneNumber(digits);
                  }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 8 }}>
              <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '600' }}>
                OTP Sent to {confirmResult.phone}
              </Text>
              <TouchableOpacity onPress={() => setConfirmResult(null)}>
                <Text style={{ color: '#D4AF37', fontSize: 13, fontWeight: '800', textDecorationLine: 'underline' }}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => codeInputRef.current?.focus()}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16 }}
            >
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: 3 }).map((_, idx) => {
                  const val = confirmCode[idx] || '';
                  const isFocused = codeFocused && confirmCode.length === idx;
                  const isFilled = val !== '';
                  const borderCol = isFilled 
                    ? '#10B981' 
                    : isFocused 
                      ? colors.accentGold 
                      : 'rgba(255,255,255,0.15)';

                  return (
                    <View
                      key={idx}
                      style={{
                        width: 40,
                        height: 52,
                        borderRadius: 8,
                        borderWidth: 1.8,
                        backgroundColor: colors.inputBg,
                        borderColor: borderCol,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                        {val}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Spacing hyphen */}
              <View style={{ width: 18, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '800', fontSize: 18 }}>-</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                {Array.from({ length: 3 }).map((_, idx) => {
                  const realIdx = idx + 3;
                  const val = confirmCode[realIdx] || '';
                  const isFocused = codeFocused && confirmCode.length === realIdx;
                  const isFilled = val !== '';
                  const borderCol = isFilled 
                    ? '#10B981' 
                    : isFocused 
                      ? colors.accentGold 
                      : 'rgba(255,255,255,0.15)';

                  return (
                    <View
                      key={realIdx}
                      style={{
                        width: 40,
                        height: 52,
                        borderRadius: 8,
                        borderWidth: 1.8,
                        backgroundColor: colors.inputBg,
                        borderColor: borderCol,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                        {val}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>

            <TextInput
              ref={codeInputRef}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
              keyboardType="number-pad"
              maxLength={6}
              value={confirmCode}
              onChangeText={(val) => {
                const digits = val.replace(/\D/g, '');
                setConfirmCode(digits);
                if (digits.length === 6) {
                  handleVerifyCode(digits);
                }
              }}
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setCodeFocused(false)}
            />

            <TouchableOpacity 
              onPress={() => handleVerifyCode()} 
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

      <Text style={[styles.footerText, { color: colors.textSub, marginBottom: 24 }]}>
        By continuing, you agree to our Privacy Policy
      </Text>
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
    fontSize: 16,
    height: '100%',
    fontWeight: '700',
    letterSpacing: 3,
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
