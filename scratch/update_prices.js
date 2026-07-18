const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

async function updatePrices() {
  // Fetch all menu items
  const { data: items, error: fetchErr } = await sb.from('menu_items').select('id, name, price');
  if (fetchErr) { console.error('Fetch error:', fetchErr); return; }

  console.log(`Found ${items.length} menu items. Adding ₹20 to each...`);

  let updated = 0;
  let failed = 0;

  for (const item of items) {
    const newPrice = item.price + 20;
    const { error } = await sb
      .from('menu_items')
      .update({ price: newPrice })
      .eq('id', item.id);

    if (error) {
      console.error(`Failed to update ${item.name}:`, error.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`Done! Updated: ${updated}, Failed: ${failed}`);

  // Verify a sample
  const { data: sample } = await sb.from('menu_items').select('name, price').limit(5);
  console.log('Sample after update:', sample);
}

updatePrices();
