const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function createTable() {
  console.log('Attempting to create rider_payouts table...');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      CREATE TABLE IF NOT EXISTS public.rider_payouts (
        id text PRIMARY KEY,
        rider_id text NOT NULL,
        rider_name text,
        rider_phone text,
        amount numeric NOT NULL,
        payment_method text DEFAULT 'UPI',
        reference_note text,
        created_at timestamptz DEFAULT now()
      );
    `
  });

  console.log('RPC result:', { data, error });
}

createTable();
