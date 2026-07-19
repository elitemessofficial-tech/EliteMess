const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearReviews() {
  console.log('=== CHECKING AND CLEARING REVIEWS IN DATABASE ===');

  try {
    // Check if 'reviews' table exists
    const { data: revData, error: revErr } = await supabase.from('reviews').select('*').limit(10);
    if (!revErr) {
      console.log('Found reviews table, deleting rows...');
      const { error: delErr } = await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) console.error('Error deleting from reviews table:', delErr.message);
      else console.log('✓ Successfully cleared reviews table.');
    } else {
      console.log('Note on reviews table:', revErr.message);
    }

    // Check if 'order_reviews' table exists
    const { data: ordRevData, error: ordRevErr } = await supabase.from('order_reviews').select('*').limit(10);
    if (!ordRevErr) {
      console.log('Found order_reviews table, deleting rows...');
      const { error: delErr } = await supabase.from('order_reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) console.error('Error deleting from order_reviews table:', delErr.message);
      else console.log('✓ Successfully cleared order_reviews table.');
    }

    // Clear orders table if requested
    const { error: ordErr } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (ordErr) console.error('Orders cleanup note:', ordErr.message);
    else console.log('✓ Successfully cleared orders table.');

    console.log('=== DATABASE CLEANUP COMPLETED ===');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

clearReviews();
