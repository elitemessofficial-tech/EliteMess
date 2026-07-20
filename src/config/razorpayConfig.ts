export interface RazorpayKeyConfig {
  key_id: string;
  key_secret: string;
  isTestMode: boolean;
  label: string;
}

// VIP number from env bypass config — always gets test mode
let VIP_NUMBER_DIGITS = '';
try {
  const envBypass = require('./env_bypass.json');
  VIP_NUMBER_DIGITS = (envBypass.EXPO_PUBLIC_VIP_NUMBER || '').replace(/\D/g, '');
} catch (e) {}

/**
 * Returns Razorpay credentials based on customer phone number.
 * Uses TEST KEY when:
 *   - No phone number is available (anonymous/test sessions)
 *   - Phone matches the VIP number (admin test account)
 * Uses LIVE KEY for all real authenticated users.
 */
export const getRazorpayKeys = (phone?: string | null): RazorpayKeyConfig => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  
  const isVipPhone = VIP_NUMBER_DIGITS.length >= 5 && cleanPhone.endsWith(VIP_NUMBER_DIGITS);
  const isTestAccount = !cleanPhone || cleanPhone.length < 5 || isVipPhone;

  if (isTestAccount) {
    return {
      key_id: process.env.EXPO_PUBLIC_RAZORPAY_TEST_KEY_ID || 'rzp_test_TDMu0EgOYNzXMy',
      key_secret: process.env.EXPO_PUBLIC_RAZORPAY_TEST_KEY_SECRET || 'xPm7uU383iHRwq3GpMtJjcaT',
      isTestMode: true,
      label: 'Razorpay Test Mode (Sandbox)'
    };
  }

  return {
    key_id: process.env.EXPO_PUBLIC_RAZORPAY_LIVE_KEY_ID || 'rzp_live_TDMwFtEM1Zr9SK',
    key_secret: process.env.EXPO_PUBLIC_RAZORPAY_LIVE_KEY_SECRET || 'dlU8gx0DX98eb9SM6RtWl7sq',
    isTestMode: false,
    label: 'Razorpay Secure Live'
  };
};
