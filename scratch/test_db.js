const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('branches').select('*');
  console.log('Branches:', data);
}
test();
