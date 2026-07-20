const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function setupRiderPayoutsTable() {
  console.log('Testing rider_payouts table in Supabase...');
  
  const { data, error } = await supabase.from('rider_payouts').select('*').limit(1);

  if (error) {
    console.log('Table rider_payouts might not exist yet:', error.message);
  } else {
    console.log('Table rider_payouts already exists! Sample row:', data);
  }
}

setupRiderPayoutsTable();
