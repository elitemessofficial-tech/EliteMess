const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function checkTables() {
  console.log('Testing Supabase query on profiles, deliveries, orders...');

  const { data: profs } = await supabase.from('profiles').select('*').limit(3);
  console.log('Profiles columns:', profs ? Object.keys(profs[0] || {}) : 'none');

  const { data: delivs } = await supabase.from('deliveries').select('*').limit(3);
  console.log('Deliveries columns:', delivs ? Object.keys(delivs[0] || {}) : 'none');

  const { data: ords } = await supabase.from('orders').select('*').limit(3);
  console.log('Orders columns:', ords ? Object.keys(ords[0] || {}) : 'none');
}

checkTables();
