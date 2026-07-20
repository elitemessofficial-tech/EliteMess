const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function removePapadSection() {
  console.log('Hiding/removing Papad items in Supabase menu_items table...');
  
  // Set is_available = false for all Papad items so they never show in menu
  const { data: updated, error: updateErr } = await supabase
    .from('menu_items')
    .update({ is_available: false, category: 'Archived Papad' })
    .or('category.eq.Papad,name.ilike.%papad%')
    .select();

  if (updateErr) {
    console.error('Error updating Papad items:', updateErr.message);
  } else {
    console.log(`Archived ${updated ? updated.length : 0} Papad menu items:`, updated?.map(i => i.name));
  }

  // Try deleting unreferenced ones
  const { data: deleted, error: deleteErr } = await supabase
    .from('menu_items')
    .delete()
    .eq('category', 'Archived Papad')
    .select();

  if (deleteErr) {
    console.log('Some Papad items referenced in past order history retained as archived (is_available=false).');
  } else {
    console.log(`Successfully deleted ${deleted ? deleted.length : 0} unreferenced Papad items.`);
  }
}

removePapadSection();
