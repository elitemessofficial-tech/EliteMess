const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function testStorage() {
  console.log('Testing storing payouts in profiles...');
  const { data: riders } = await supabase.from('profiles').select('*').eq('role', 'rider');
  console.log('Riders found:', riders);
}

testStorage();
