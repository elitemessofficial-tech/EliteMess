export interface RazorpayKeyConfig {
  key_id: string;
  key_secret: string;
  isTestMode: boolean;
  label: string;
}

/**
 * Returns Razorpay credentials based on customer phone number.
 * Uses TEST KEY for guest/test phone number (+15550192834).
 * Uses LIVE KEY for all real customer phone numbers.
 */
export const getRazorpayKeys = (phone?: string | null): RazorpayKeyConfig => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const isTestAccount = 
    cleanPhone.includes('15550192834') || 
    cleanPhone.includes('5550192834') || 
    cleanPhone === '15550192834';

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
