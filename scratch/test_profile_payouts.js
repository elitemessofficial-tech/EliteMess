const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function testProfilePayouts() {
  console.log('Testing saving payouts inside profiles.fcm_token...');
  
  // Fetch rider Omkar profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'rider')
    .single();

  if (error) {
    console.error('Error fetching rider profile:', error);
    return;
  }

  console.log('Found rider profile:', profile.full_name, profile.phone_number, profile.id);

  const samplePayout = {
    id: `payout_${Date.now()}`,
    rider_id: profile.id,
    rider_name: profile.full_name,
    rider_phone: profile.phone_number,
    amount: 10,
    payment_method: 'UPI',
    reference_note: 'Settlement payout from owner',
    created_at: new Date().toISOString()
  };

  const payoutsArray = [samplePayout];
  const jsonStr = JSON.stringify(payoutsArray);

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ fcm_token: jsonStr })
    .eq('id', profile.id);

  if (updateErr) {
    console.error('Error updating profile with payout:', updateErr);
  } else {
    console.log('Successfully updated profiles row with payouts JSON!');
    
    // Read it back
    const { data: readBack } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', profile.id)
      .single();

    console.log('Read back parsed payouts:', JSON.parse(readBack.fcm_token));
  }
}

testProfilePayouts();
