const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/EXPO_PUBLIC_SUPABASE_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

// Zomato reference prices mapping provided by user
const ZOMATO_PRICES = {
  // Mutton Thalis
  'Bokdachi Special Mutton Thali': 699,
  'Bokdachi Dhaavra Thali': 519,
  'Bokdachi Mutton Dhavara Thali (Kala Masala)': 519,
  'Bokdachi Mutton Dhavara Thali (Goat Mutton White Thali)': 519,
  'Mutton Fry Thali': 559,
  'Mutton Fry Thali (Kala Masala)': 559,
  'Special Mutton Thali': 559,
  'Special Mutton Thali (Kala Masala)': 559,

  // Chicken Thalis
  'Chicken Masala Thali': 449,
  'Chicken Fry Thali': 449,
  'Chicken Fry Thali (Kala Masala)': 449,
  'Chicken Rassa Thali': 399,
  'Chicken Rassa Thali (Kala Masala)': 399,
  'Special Chicken Thali': 519,
  'Special Chicken Thali (Kala Masala)': 519,

  // Chilapi Thalis
  'Chilapi Aalni Thali': 449,
  'Chilapi Masala Thali': 449,
  'Chilapi Fry Thali': 449,
  'Special Chilapi Thali': 499,

  // Veg Thali
  'Veg Thali': 379,
  'Special Veg Thali': 379,
  'Maharashtrian Thali': 379,
  'Special Maharashtrian Thali': 399,

  // Handi & A La Carte
  'Chicken Masala Handi (Half)': 550,
  'Chicken Masala Handi (Full)': 849,
  'Chicken Masala Handi Half': 550,
  'Chicken Masala Handi Full': 849,
  'Mutton Kala Masala Handi (Half)': 559,
  'Mutton Kala Masala Handi (Full)': 949,
  'Mutton Malvani Handi (Half)': 599,
  'Mutton Malvani Handi (Full)': 899,
  'Mutton Regular Handi (Half)': 559,
  'Mutton Regular Handi (Full)': 949,
  'Chicken Regular Handi (Half)': 399,
  'Chicken Regular Handi (Full)': 699,
  'Chicken Malvani Handi (Half)': 499,
  'Chicken Malvani Handi (Full)': 799,

  // Starters & Mains
  'Mutton Fry': 479,
  'Mutton Masala': 499,
  'Mutton Kharda': 449,
  'Mutton Ukkad': 449,
  'Mutton Curry': 449,
  'Chicken Fry': 269,
  'Chicken Masala': 289,
  'Chicken Curry': 249,
  'Chicken Kharda': 299,
  'Chicken Ukkad': 249,
  'Egg Curry': 199,
  'Egg Masala': 199,

  // Breads
  'Chapati': 30,
  'Jwari Bhakri': 50,
  'Jwari Bhakari': 50,
  'Bajri Bhakri': 40,
  'Bajari Bhakari': 40,
  'Roti': 40,
  'Butter Roti': 50,
  'Naan': 50,
  'Butter Naan': 70,
  'Garlic Butter Naan': 90,
  'Garlic Naan': 90
};

async function syncZomatoPrices() {
  console.log('=== SYNCING ZOMATO / SWIGGY PRICES TO MENU_ITEMS ===');
  const { data: items, error } = await sb.from('menu_items').select('*');
  if (error) {
    console.error('Error fetching menu items:', error.message);
    return;
  }

  console.log(`Fetched ${items.length} menu items from database.`);

  let updated = 0;
  for (const item of items) {
    let zomatoPrice = ZOMATO_PRICES[item.name];

    if (!zomatoPrice) {
      // Intelligent fallback matching
      const cleanName = item.name.toLowerCase();
      if (cleanName.includes('chapati')) zomatoPrice = 30;
      else if (cleanName.includes('jwari') || cleanName.includes('jawari')) zomatoPrice = 50;
      else if (cleanName.includes('bajri') || cleanName.includes('bajari')) zomatoPrice = 40;
      else if (cleanName.includes('garlic') && cleanName.includes('naan')) zomatoPrice = 90;
      else if (cleanName.includes('butter') && cleanName.includes('naan')) zomatoPrice = 70;
      else if (cleanName.includes('naan')) zomatoPrice = 50;
      else if (cleanName.includes('butter') && cleanName.includes('roti')) zomatoPrice = 50;
      else if (cleanName.includes('roti')) zomatoPrice = 40;
      else if (cleanName.includes('special mutton thali')) zomatoPrice = 559;
      else if (cleanName.includes('mutton fry thali')) zomatoPrice = 559;
      else if (cleanName.includes('special chicken thali')) zomatoPrice = 519;
      else if (cleanName.includes('chicken masala thali')) zomatoPrice = 449;
      else if (cleanName.includes('chicken fry thali')) zomatoPrice = 449;
      else if (cleanName.includes('chicken rassa thali')) zomatoPrice = 399;
      else if (cleanName.includes('chilapi')) zomatoPrice = 449;
      else if (cleanName.includes('veg thali')) zomatoPrice = 379;
      else {
        // Default to ~35% markup over App price for Zomato reference
        zomatoPrice = Math.round(item.price * 1.35);
      }
    }

    const { error: updateErr } = await sb
      .from('menu_items')
      .update({ zomato_price: zomatoPrice })
      .eq('id', item.id);

    if (updateErr) {
      console.warn(`Failed to update ${item.name}:`, updateErr.message);
    } else {
      updated++;
    }
  }

  console.log(`✓ Successfully updated ${updated} menu items with Zomato prices!`);
}

syncZomatoPrices();
