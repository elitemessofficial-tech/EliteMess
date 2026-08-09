import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserIdentity {
  userId: string;
  phone: string;
  fullName: string;
  isVip: boolean;
}

export async function getCurrentUserIdentity(): Promise<UserIdentity> {
  try {
    const isVip = (await AsyncStorage.getItem('vip_session_active')) === 'true';
    const phone = (await AsyncStorage.getItem('user_phone')) || '';
    const fullName = (await AsyncStorage.getItem('user_full_name')) || '';
    const cleanPhone = phone.replace(/\D/g, '');

    let userId = 'default_guest_user';
    if (isVip) {
      userId = 'vip_test_user';
    } else if (cleanPhone && cleanPhone.length >= 5) {
      userId = cleanPhone;
    }

    return {
      userId,
      phone: cleanPhone,
      fullName: fullName || (isVip ? 'VIP Student' : 'Student'),
      isVip,
    };
  } catch (e) {
    return {
      userId: 'default_guest_user',
      phone: '',
      fullName: 'Student',
      isVip: false,
    };
  }
}
