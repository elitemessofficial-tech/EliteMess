// Zomato & Swiggy competitor price list provided by Owner
export const ZOMATO_PRICE_MAP: Record<string, number> = {
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
  'Chicken Masala Handi Half': 550,
  'Chicken Masala Handi Full': 849,
  'Chicken Masala Handi (Half)': 550,
  'Chicken Masala Handi (Full)': 849,
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

export function getZomatoPriceForItem(name: string, appPrice: number, customZomatoPrice?: number | null): number {
  if (customZomatoPrice && customZomatoPrice > 0) {
    return customZomatoPrice;
  }
  if (ZOMATO_PRICE_MAP[name]) {
    return ZOMATO_PRICE_MAP[name];
  }
  const clean = name.toLowerCase();
  if (clean.includes('chapati')) return 30;
  if (clean.includes('jwari') || clean.includes('jawari')) return 50;
  if (clean.includes('bajri') || clean.includes('bajari')) return 40;
  if (clean.includes('garlic') && clean.includes('naan')) return 90;
  if (clean.includes('butter') && clean.includes('naan')) return 70;
  if (clean.includes('naan')) return 50;
  if (clean.includes('butter') && clean.includes('roti')) return 50;
  if (clean.includes('roti')) return 40;
  if (clean.includes('special mutton thali')) return 559;
  if (clean.includes('mutton fry thali')) return 559;
  if (clean.includes('special chicken thali')) return 519;
  if (clean.includes('chicken masala thali')) return 449;
  if (clean.includes('chicken fry thali')) return 449;
  if (clean.includes('chicken rassa thali')) return 399;
  if (clean.includes('chilapi')) return 449;
  if (clean.includes('veg thali')) return 379;

  return Math.round(appPrice * 1.35);
}
