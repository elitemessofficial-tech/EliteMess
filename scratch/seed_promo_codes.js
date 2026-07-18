const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

function generateAlphanumericCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function seedPromoCodes() {
  console.log('Generating 100 unique 8-digit alphanumeric promo codes...');
  
  const codesSet = new Set();
  while (codesSet.size < 100) {
    codesSet.add(generateAlphanumericCode());
  }

  const promoCodesArray = Array.from(codesSet).map(code => ({
    code,
    discount_amount: 50,
    is_used: false
  }));

  // Attempt to insert into promo_codes table in Supabase
  const { data, error } = await sb
    .from('promo_codes')
    .insert(promoCodesArray)
    .select();

  if (error) {
    console.log('Database insertion message/error:', error.message);
    console.log('Writing fallback promo codes JSON to scratch/promo_codes_seed.json...');
    fs.writeFileSync('scratch/promo_codes_seed.json', JSON.stringify(promoCodesArray, null, 2));
    console.log('100 promo codes written to scratch/promo_codes_seed.json!');
  } else {
    console.log(`Successfully seeded ${data.length} promo codes into Supabase 'promo_codes' table!`);
    console.log('Sample codes:', data.slice(0, 5).map(c => c.code));
    fs.writeFileSync('scratch/promo_codes_seed.json', JSON.stringify(promoCodesArray, null, 2));
  }
}

seedPromoCodes();
