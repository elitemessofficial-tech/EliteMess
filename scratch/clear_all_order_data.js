const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllOrderData() {
  console.log('=== CLEARING ALL TEST ORDER DATA FROM SUPABASE DATABASE ===');

  try {
    // 1. Delete all order items
    const { error: itemsErr } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (itemsErr) console.error('Error deleting order_items:', itemsErr);
    else console.log('✓ Successfully cleared order_items table.');

    // 2. Delete all deliveries
    const { error: delErr } = await supabase
      .from('deliveries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (delErr) console.log('Deliveries table note:', delErr.message);
    else console.log('✓ Successfully cleared deliveries table.');

    // 3. Delete all orders
    const { error: ordersErr } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (ordersErr) console.error('Error deleting orders:', ordersErr);
    else console.log('✓ Successfully cleared orders table.');

    console.log('=== ALL TEST ORDERS SUCCESSFULLY PURGED FROM DATABASE ===');
  } catch (err) {
    console.error('Fatal error during database cleanup:', err);
  }
}

clearAllOrderData();
