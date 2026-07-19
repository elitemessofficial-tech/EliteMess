import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available?: boolean;
  branch_id?: string;
  image_url?: string | null;
}

interface CartContextType {
  cart: Record<string, number>;
  menuItems: MenuItem[];
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotalItems: number;
  cartTotalPrice: number;
  getCartItemsList: () => Array<{ item: MenuItem; qty: number }>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Default seed list to fallback on
const SEED_MENU: MenuItem[] = [
  // Veg Starter
  { id: 'v1', name: "Crispy Paneer", price: 239, category: "Veg Starter", description: "Crisp fried paneer tossed in savory spices" },
  { id: 'v2', name: "Paneer Chilli", price: 239, category: "Veg Starter", description: "Paneer cubes tossed with bell peppers and chilli sauce" },
  { id: 'v3', name: "Veg Manchurian (Dry)", price: 219, category: "Veg Starter", description: "Mixed veg balls in dry Manchurian sauce" },

  // Papad
  { id: 'v4', name: "Masala Papad", price: 49, category: "Papad", description: "Fried or roasted papad topped with spicy onion tomato mix" },
  { id: 'v5', name: "Fry Papad", price: 39, category: "Papad", description: "Crispy deep-fried papad" },
  { id: 'v6', name: "Roasted Papad", price: 29, category: "Papad", description: "Crispy dry-roasted papad" },

  // Non-Veg Starter
  { id: 'v7', name: "Chicken Chilli", price: 239, category: "Non-Veg Starter", description: "Tender chicken chunks in spicy chilli glaze" },
  { id: 'v8', name: "Lollipop (Dry)", price: 239, category: "Non-Veg Starter", description: "Deep fried seasoned chicken lollipops" },
  { id: 'v9', name: "Lollipop Masala", price: 279, category: "Non-Veg Starter", description: "Chicken lollipops coated in rich spice masala" },
  { id: 'v10', name: "Chicken Crispy", price: 239, category: "Non-Veg Starter", description: "Crisp batter-fried chicken stripes in tangy sauce" },
  { id: 'v11', name: "Chicken Manchurian", price: 239, category: "Non-Veg Starter", description: "Chicken chunks tossed in Manchurian sauce" },

  // Fish Starter
  { id: 'v12', name: "Chilapi Masala", price: 179, category: "Fish Starter", description: "Chilapi fish cooked in spicy aromatic masala" },
  { id: 'v13', name: "Chilapi Fry", price: 179, category: "Fish Starter", description: "Crisp pan-fried marinated Chilapi fish" },
  { id: 'v14', name: "Chilapi Aalni", price: 179, category: "Fish Starter", description: "Mild, nourishing Chilapi fish soup preparation" },

  // Tandoor Veg Starter
  { id: 'v15', name: "Paneer Tikka", price: 239, category: "Tandoor Veg Starter", description: "Skewered char-grilled spiced paneer cubes" },
  { id: 'v16', name: "Paneer Malai Tikka", price: 249, category: "Tandoor Veg Starter", description: "Creamy, mild clay-oven grilled paneer" },

  // Tandoor Non-Veg Starter
  { id: 'v17', name: "Chicken Tandoor (Half)", price: 269, category: "Tandoor Non-Veg Starter", description: "Clay-oven roasted spiced chicken half portion" },
  { id: 'v18', name: "Chicken Tandoor (Full)", price: 449, category: "Tandoor Non-Veg Starter", description: "Clay-oven roasted spiced chicken full portion" },
  { id: 'v19', name: "Chicken Tikka", price: 279, category: "Tandoor Non-Veg Starter", description: "Skewered char-grilled chicken breast chunks" },
  { id: 'v20', name: "Chicken Malai Kebab", price: 289, category: "Tandoor Non-Veg Starter", description: "Skewered chicken in creamy cardamon marinade" },
  { id: 'v21', name: "Chicken Pahadi Kebab", price: 289, category: "Tandoor Non-Veg Starter", description: "Skewered chicken in fresh green herb marinade" },
  { id: 'v22', name: "Chicken Tangdi Kebab", price: 289, category: "Tandoor Non-Veg Starter", description: "Char-grilled marinated chicken drumsticks" },

  // Main Course Veg
  { id: 'v23', name: "Paneer Butter Masala", price: 259, category: "Main Course Veg", description: "Paneer in rich tomato, butter, and cashew gravy" },
  { id: 'v24', name: "Paneer Tikka Masala", price: 279, category: "Main Course Veg", description: "Grilled paneer tikka chunks in spicy masala gravy" },
  { id: 'v25', name: "Kaju Paneer Masala", price: 289, category: "Main Course Veg", description: "Rich gravy with paneer cubes and whole roasted cashews" },
  { id: 'v26', name: "Paneer Lababdar", price: 269, category: "Main Course Veg", description: "Paneer in creamy tomato-onion gravy with grated paneer" },
  { id: 'v27', name: "Kaju Masala", price: 259, category: "Main Course Veg", description: "Whole roasted cashews in spicy rich yellow-brown gravy" },
  { id: 'v28', name: "Mix Veg", price: 199, category: "Main Course Veg", description: "Seasonal farm-fresh vegetables cooked in traditional spices" },
  { id: 'v29', name: "Veg Maratha", price: 229, category: "Main Course Veg", description: "Spicy mixed vegetable cutlets in thick spicy gravy" },
  { id: 'v30', name: "Veg Bhuna", price: 229, category: "Main Course Veg", description: "Mixed veg dry-cooked in roasted hand-ground spices" },
  { id: 'v31', name: "Veg Kolhapuri", price: 219, category: "Main Course Veg", description: "Super spicy traditional Kolhapuri mixed vegetables" },
  { id: 'v32', name: "Veg Kadhai", price: 259, category: "Main Course Veg", description: "Bell peppers and mixed veg in freshly ground kadhai masala" },
  { id: 'v33', name: "Veg Handi", price: 309, category: "Main Course Veg", description: "Mixed vegetables slow-cooked in a clay handi gravy" },
  { id: 'v34', name: "Shev Bhaji", price: 189, category: "Main Course Veg", description: "Crisp sev noodles served in spicy aromatic local rassa" },
  { id: 'v35', name: "Dal Fry", price: 139, category: "Main Course Veg", description: "Yellow lentils tempered with ghee, cumin, onion, and garlic" },
  { id: 'v36', name: "Dal Tadka", price: 159, category: "Main Course Veg", description: "Lentils finished with a smoking double tempering of red chillies" },
  { id: 'v37', name: "Dal Kolhapuri", price: 149, category: "Main Course Veg", description: "Lentils cooked with spicy local Kolhapuri masala" },

  // Maharashtra Special Veg
  { id: 'v38', name: "Bharleli Vangi (Stuffed Eggplant)", price: 129, category: "Maharashtra Special Veg", description: "Traditional baby eggplants stuffed with peanut-coconut masala" },
  { id: 'v39', name: "Khar Vang", price: 129, category: "Maharashtra Special Veg", description: "Slightly salted, green baby eggplants stir fry" },
  { id: 'v40', name: "Vangi Bharit (Eggplant Bharta)", price: 129, category: "Maharashtra Special Veg", description: "Roasted eggplant mash cooked with green chillies, onion, and herbs" },
  { id: 'v41', name: "Shevga Fry (Drumstick Fry)", price: 129, category: "Maharashtra Special Veg", description: "Crisp seasoned drumstick pods pan-fried with local spices" },
  { id: 'v42', name: "Shevga Handi", price: 179, category: "Maharashtra Special Veg", description: "Slow-cooked drumsticks in spicy semi-dry coconut gravy" },
  { id: 'v43', name: "Pithla", price: 149, category: "Maharashtra Special Veg", description: "Gram flour seasoned paste served hot, typical local comfort food" },
  { id: 'v44', name: "Matki Fry", price: 129, category: "Maharashtra Special Veg", description: "Sprouted moth beans stir-fried with onion and green chillies" },
  { id: 'v45', name: "Matki Rassa", price: 139, category: "Maharashtra Special Veg", description: "Sprouted moth beans in thin spicy local gravy" },

  // Non-Veg Main Course (Chicken & Egg)
  { id: 'v46', name: "Butter Chicken (Half)", price: 349, category: "Non-Veg Main Course (Chicken & Egg)", description: "Rich butter chicken half portion" },
  { id: 'v47', name: "Butter Chicken (Full)", price: 549, category: "Non-Veg Main Course (Chicken & Egg)", description: "Rich butter chicken full portion" },
  { id: 'v48', name: "Murgh Musallam (Half)", price: 449, category: "Non-Veg Main Course (Chicken & Egg)", description: "Royal whole chicken in rich Mughlai gravy half portion" },
  { id: 'v49', name: "Murgh Musallam (Full)", price: 699, category: "Non-Veg Main Course (Chicken & Egg)", description: "Royal whole chicken in rich Mughlai gravy full portion" },
  { id: 'v50', name: "Chicken Kala Masala", price: 249, category: "Non-Veg Main Course (Chicken & Egg)", description: "Chicken cooked in local roasted black spice gravy" },
  { id: 'v51', name: "Chicken Kolhapuri", price: 239, category: "Non-Veg Main Course (Chicken & Egg)", description: "Fiery red gravy chicken prepared in Kolhapuri style" },
  { id: 'v52', name: "Chicken Masala", price: 229, category: "Non-Veg Main Course (Chicken & Egg)", description: "Classic spicy home-style chicken curry" },
  { id: 'v53', name: "Chicken Kala Masala Handi (Half)", price: 379, category: "Non-Veg Main Course (Chicken & Egg)", description: "Black gravy slow-cooked chicken half portion" },
  { id: 'v54', name: "Chicken Kala Masala Handi (Full)", price: 799, category: "Non-Veg Main Course (Chicken & Egg)", description: "Black gravy slow-cooked chicken full portion" },
  { id: 'v55', name: "Chicken Malvani Handi (Half)", price: 379, category: "Non-Veg Main Course (Chicken & Egg)", description: "Spicy coconut Malvani style chicken half portion" },
  { id: 'v56', name: "Chicken Malvani Handi (Full)", price: 649, category: "Non-Veg Main Course (Chicken & Egg)", description: "Spicy coconut Malvani style chicken full portion" },
  { id: 'v57', name: "Chicken Regular Handi (Half)", price: 379, category: "Non-Veg Main Course (Chicken & Egg)", description: "Traditional restaurant style chicken handi half portion" },
  { id: 'v58', name: "Chicken Regular Handi (Full)", price: 599, category: "Non-Veg Main Course (Chicken & Egg)", description: "Traditional restaurant style chicken handi full portion" },
  { id: 'v59', name: "Chicken Mughlai", price: 349, category: "Non-Veg Main Course (Chicken & Egg)", description: "Chicken in rich egg-based cashew Mughlai gravy" },
  { id: 'v60', name: "Chicken Tikka Masala", price: 379, category: "Non-Veg Main Course (Chicken & Egg)", description: "Tandoori chicken tikkas in spiced tomato butter gravy" },
  { id: 'v61', name: "Chicken Curry", price: 199, category: "Non-Veg Main Course (Chicken & Egg)", description: "Thin aromatic chicken gravy served hot" },
  { id: 'v62', name: "Chicken Fry", price: 229, category: "Non-Veg Main Course (Chicken & Egg)", description: "Dry pan-fried marinated chicken chunks" },
  { id: 'v63', name: "Chicken Kharda", price: 249, category: "Non-Veg Main Course (Chicken & Egg)", description: "Chicken tossed in super hot hand-crushed green chilli paste" },
  { id: 'v64', name: "Chicken Ukkad", price: 239, category: "Non-Veg Main Course (Chicken & Egg)", description: "Traditional mild, nourishing chicken soup-like dish" },
  { id: 'v65', name: "Egg Masala", price: 149, category: "Non-Veg Main Course (Chicken & Egg)", description: "Boiled eggs in thick onion-tomato spiced gravy" },
  { id: 'v66', name: "Egg Curry", price: 129, category: "Non-Veg Main Course (Chicken & Egg)", description: "Boiled eggs served in thin spicy curry" },
  { id: 'v67', name: "Egg Boil", price: 29, category: "Non-Veg Main Course (Chicken & Egg)", description: "Plain hard boiled egg" },

  // Non-Veg Main Course (Mutton)
  { id: 'v68', name: "Mutton Masala", price: 319, category: "Non-Veg Main Course (Mutton)", description: "Tender goat mutton cooked in rich spicy masala gravy" },
  { id: 'v69', name: "Mutton Curry", price: 299, category: "Non-Veg Main Course (Mutton)", description: "Traditional home-style goat mutton curry" },
  { id: 'v70', name: "Mutton Fry", price: 309, category: "Non-Veg Main Course (Mutton)", description: "Pan-fried dry mutton seasoned with local spices" },
  { id: 'v71', name: "Mutton Kharda", price: 299, category: "Non-Veg Main Course (Mutton)", description: "Spicy goat mutton cooked in hand-pounded green chilli paste" },
  { id: 'v72', name: "Mutton Ukkad", price: 349, category: "Non-Veg Main Course (Mutton)", description: "Nourishing, mild clear mutton broth with select spices" },
  { id: 'v73', name: "Mutton Ghee Roast", price: 379, category: "Non-Veg Main Course (Mutton)", description: "Rich goat mutton roasted in premium cow ghee and dry spices" },
  { id: 'v74', name: "Mutton Kolhapuri", price: 349, category: "Non-Veg Main Course (Mutton)", description: "Fiery red, super spicy traditional Kolhapuri mutton curry" },
  { id: 'v75', name: "Mutton Kala Masala Handi (Half)", price: 509, category: "Non-Veg Main Course (Mutton)", description: "Spicy black masala slow-cooked mutton half portion" },
  { id: 'v76', name: "Mutton Kala Masala Handi (Full)", price: 949, category: "Non-Veg Main Course (Mutton)", description: "Spicy black masala slow-cooked mutton full portion" },
  { id: 'v77', name: "Mutton Malvani Handi (Half)", price: 509, category: "Non-Veg Main Course (Mutton)", description: "Coastal Malvani coconut style mutton half portion" },
  { id: 'v78', name: "Mutton Malvani Handi (Full)", price: 949, category: "Non-Veg Main Course (Mutton)", description: "Coastal Malvani coconut style mutton full portion" },
  { id: 'v79', name: "Mutton Regular Handi (Half)", price: 479, category: "Non-Veg Main Course (Mutton)", description: "Standard restaurant style mutton handi half portion" },
  { id: 'v80', name: "Mutton Regular Handi (Full)", price: 909, category: "Non-Veg Main Course (Mutton)", description: "Standard restaurant style mutton handi full portion" },

  // Rice & Biryani
  { id: 'v81', name: "Dal Khichdi", price: 179, category: "Rice & Biryani", description: "Lentils and rice cooked together, comfort meal" },
  { id: 'v82', name: "Dal Khichdi Tadka", price: 199, category: "Rice & Biryani", description: "Dal khichdi finished with aromatic double tempering" },
  { id: 'v83', name: "Veg Pulao", price: 259, category: "Rice & Biryani", description: "Fragrant basmati rice cooked with mixed vegetables" },
  { id: 'v84', name: "Paneer Pulao", price: 279, category: "Rice & Biryani", description: "Pulao rice cooked with spiced grilled paneer cubes" },
  { id: 'v85', name: "Steam Rice (Half)", price: 69, category: "Rice & Biryani", description: "Plain steamed basmati rice half portion" },
  { id: 'v86', name: "Steam Rice (Full)", price: 129, category: "Rice & Biryani", description: "Plain steamed basmati rice full portion" },
  { id: 'v87', name: "Jeera Rice (Half)", price: 89, category: "Rice & Biryani", description: "Basmati rice tempered with cumin and ghee half portion" },
  { id: 'v88', name: "Jeera Rice (Full)", price: 149, category: "Rice & Biryani", description: "Basmati rice tempered with cumin and ghee full portion" },
  { id: 'v89', name: "Indrayani Rice (Half)", price: 79, category: "Rice & Biryani", description: "Sticky, highly fragrant local Indrayani rice half portion" },
  { id: 'v90', name: "Indrayani Rice (Full)", price: 129, category: "Rice & Biryani", description: "Sticky, highly fragrant local Indrayani rice full portion" },
  { id: 'v91', name: "Aalni Rice (Half)", price: 79, category: "Rice & Biryani", description: "Rice cooked in mild nourishing meat/veg stock half portion" },
  { id: 'v92', name: "Aalni Rice (Full)", price: 129, category: "Rice & Biryani", description: "Rice cooked in mild nourishing meat/veg stock full portion" },
  { id: 'v93', name: "Veg Biryani", price: 269, category: "Rice & Biryani", description: "Layered fragrant rice and vegetables, served with raita" },
  { id: 'v94', name: "Chicken Dum Biryani (Half)", price: 169, category: "Rice & Biryani", description: "Layered chicken and biryani rice half portion" },
  { id: 'v95', name: "Chicken Dum Biryani (Full)", price: 279, category: "Rice & Biryani", description: "Layered chicken and biryani rice full portion" },
  { id: 'v96', name: "Mutton Biryani", price: 349, category: "Rice & Biryani", description: "Premium layered basmati rice and tender goat mutton" },
  { id: 'v97', name: "Egg Dum Biryani", price: 179, category: "Rice & Biryani", description: "Layered rice cooked with hard boiled spiced eggs" },

  // Indian Breads
  { id: 'v98', name: "Roti", price: 20, category: "Indian Breads", description: "Whole wheat clay oven flatbread" },
  { id: 'v99', name: "Butter Roti", price: 30, category: "Indian Breads", description: "Whole wheat flatbread brushed with premium butter" },
  { id: 'v100', name: "Naan", price: 30, category: "Indian Breads", description: "Soft leavened refined flour clay oven bread" },
  { id: 'v101', name: "Butter Naan", price: 40, category: "Indian Breads", description: "Naan brushed with premium butter" },
  { id: 'v102', name: "Garlic Butter Naan", price: 60, category: "Indian Breads", description: "Butter naan topped with minced roasted garlic" },
  { id: 'v103', name: "Chapati", price: 15, category: "Indian Breads", description: "Thin home style pan-grilled whole wheat flatbread" },
  { id: 'v104', name: "Bajri Bhakri", price: 20, category: "Indian Breads", description: "Thick, rustic pearl millet flatbread" },
  { id: 'v105', name: "Jwari Bhakri", price: 30, category: "Indian Breads", description: "Thick, rustic sorghum flatbread" },

  // Maharashtrian Thali & Veg Thali
  { id: 'v106', name: "Bharleli Vangi Thali", price: 169, category: "Maharashtrian Thali & Veg Thali", description: "Includes Stuffed Eggplant, 2 Bhakris/Chapatis, dal, rice, salad" },
  { id: 'v107', name: "Pithla Bhakar Thali", price: 169, category: "Maharashtrian Thali & Veg Thali", description: "Includes hot Pithla, 2 Bajri Bhakris, onion, green chilli pickle" },
  { id: 'v108', name: "Special Maharashtrian Thali", price: 249, category: "Maharashtrian Thali & Veg Thali", description: "Platter with 2 veg mains, dal, rice, bhakri, sweet, papad" },
  { id: 'v109', name: "Maharashtrian Thali", price: 249, category: "Maharashtrian Thali & Veg Thali", description: "Platter containing authentic local vegetarian items" },
  { id: 'v110', name: "Special Veg Thali", price: 199, category: "Maharashtrian Thali & Veg Thali", description: "Standard vegetarian thali with paneer dish, roti, dal, rice" },

  // Kolhapuri Lal Masala Thali
  { id: 'v111', name: "Bokdachi Mutton Dhavara Thali (Goat Mutton White Thali)", price: 339, category: "Kolhapuri Lal Masala Thali", description: "Kolhapuri white mutton soup based thali" },
  { id: 'v112', name: "Mutton Fry Thali", price: 379, category: "Kolhapuri Lal Masala Thali", description: "Dry mutton thali with lal rassa, pandhra rassa, bhakri, rice" },
  { id: 'v113', name: "Special Mutton Thali", price: 499, category: "Kolhapuri Lal Masala Thali", description: "Loaded mutton thali with fry, rassa, egg curry, bhakris, rice" },
  { id: 'v114', name: "Chicken Rassa Thali", price: 199, category: "Kolhapuri Lal Masala Thali", description: "Chicken curry thali with tambda rassa, bhakri, rice" },
  { id: 'v115', name: "Chicken Fry Thali", price: 249, category: "Kolhapuri Lal Masala Thali", description: "Chicken dry fry thali with tambda rassa, bhakri, rice" },
  { id: 'v116', name: "Special Chicken Thali", price: 319, category: "Kolhapuri Lal Masala Thali", description: "Loaded chicken thali with fry, curry, tambda rassa, bhakri, rice" },
  { id: 'v117', name: "Anda Masala Thali", price: 179, category: "Kolhapuri Lal Masala Thali", description: "Egg masala curry served with bhakri/roti, rice, local soup" },
  { id: 'v118', name: "Anda Curry Thali", price: 159, category: "Kolhapuri Lal Masala Thali", description: "Egg thin curry served with bhakri/roti, rice, local soup" },

  // Chicken Dum Murgha & Maharaja Group Dishes
  { id: 'v119', name: "Chicken Dum Murgha Thali (For 2 Persons)", price: 699, category: "Chicken Dum Murgha & Maharaja Group Dishes", description: "Dum cooked chicken group thali sized for two" },
  { id: 'v120', name: "Chicken Dum Murgha Thali (For 3 Persons)", price: 999, category: "Chicken Dum Murgha & Maharaja Group Dishes", description: "Dum cooked chicken group thali sized for three" },
  { id: 'v121', name: "Chicken Dum Murgha Thali (For 4 Persons)", price: 1199, category: "Chicken Dum Murgha & Maharaja Group Dishes", description: "Dum cooked chicken group thali sized for four" },
  { id: 'v122', name: "Chicken Dum Murgha Dish (Only)", price: 499, category: "Chicken Dum Murgha & Maharaja Group Dishes", description: "Single chicken dum murgha main dish" },
  { id: 'v123', name: "Chicken Maharaja Thali", price: 1999, category: "Chicken Dum Murgha & Maharaja Group Dishes", description: "Grand royal chicken platter for group sharing" },

  // Special Kala Masala Thali (Black Gravy)
  { id: 'v124', name: "Bokdachi Mutton Dhavara Thali (Kala Masala)", price: 369, category: "Special Kala Masala Thali (Black Gravy)", description: "Mutton white soup thali accompanied with black masala gravy" },
  { id: 'v125', name: "Mutton Fry Thali (Kala Masala)", price: 419, category: "Special Kala Masala Thali (Black Gravy)", description: "Mutton fry in black masala rassa, bhakri, rice" },
  { id: 'v126', name: "Special Mutton Thali (Kala Masala)", price: 519, category: "Special Kala Masala Thali (Black Gravy)", description: "Rich mutton kala rassa feast platter" },
  { id: 'v127', name: "Chicken Rassa Thali (Kala Masala)", price: 219, category: "Special Kala Masala Thali (Black Gravy)", description: "Chicken kala rassa thali with bhakri/roti, rice" },
  { id: 'v128', name: "Chicken Fry Thali (Kala Masala)", price: 219, category: "Special Kala Masala Thali (Black Gravy)", description: "Dry chicken fry in black masala, rassa, bhakri, rice" },
  { id: 'v129', name: "Special Chicken Thali (Kala Masala)", price: 349, category: "Special Kala Masala Thali (Black Gravy)", description: "Loaded black gravy chicken feast thali" },
  { id: 'v130', name: "Anda Masala Thali (Kala Masala)", price: 189, category: "Special Kala Masala Thali (Black Gravy)", description: "Spiced egg in black gravy, bhakri, rice" },
  { id: 'v131', name: "Anda Curry Thali (Kala Masala)", price: 169, category: "Special Kala Masala Thali (Black Gravy)", description: "Egg thin black curry, bhakri, rice" },

  // Bhigwan Special Chilapi Thali (Fish)
  { id: 'v132', name: "Chilapi Fry Thali", price: 249, category: "Bhigwan Special Chilapi Thali (Fish)", description: "Chilapi fish fry served with thin fish rassa, bhakri, rice" },
  { id: 'v133', name: "Chilapi Masala Thali", price: 249, category: "Bhigwan Special Chilapi Thali (Fish)", description: "Chilapi fish masala served with bhakri/roti, rice" },
  { id: 'v134', name: "Chilapi Aalni Thali", price: 249, category: "Bhigwan Special Chilapi Thali (Fish)", description: "Nourishing mild fish stock soup served with bhakri, rice" },
  { id: 'v135', name: "Special Chilapi Thali", price: 299, category: "Bhigwan Special Chilapi Thali (Fish)", description: "Loaded Chilapi fish fry & masala double combination feast thali" }
];

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to reload menu items
  const fetchLatestMenu = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*');
      if (!error && data) {
        const loaded = data.map((item: any) => ({
          ...item,
          price: parseFloat(item.price),
          is_available: item.is_available ?? true
        }));
        setMenuItems(loaded);
      }
    } catch (err) {
      console.error('Realtime fetch failed in CartContext:', err);
    }
  };

  // Load menu items from Supabase on mount
  useEffect(() => {
    const loadMenu = async () => {
      try {
        let { data, error } = await supabase
          .from('menu_items')
          .select('*');
        
        if (error) throw error;
        
        let loadedItems = [];
        if (!data || data.length === 0) {
          // Wait a random delay (e.g. 0-500ms) to prevent concurrent inserts
          const delay = Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Re-query to see if another concurrent instance has seeded the database
          const reCheck = await supabase.from('menu_items').select('*');
          if (!reCheck.error && reCheck.data && reCheck.data.length > 0) {
            data = reCheck.data;
          } else {
            // Auto-seed database table public.menu_items
            const branchId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
            const seedToInsert = SEED_MENU.map(item => ({
              name: item.name,
              description: item.description,
              price: item.price,
              category: item.category,
              branch_id: branchId,
              is_available: true
            }));
            const { data: insertedData } = await supabase
              .from('menu_items')
              .insert(seedToInsert)
              .select();
            
            if (insertedData && insertedData.length > 0) {
              data = insertedData;
            }
          }
        }

        if (data && data.length > 0) {
          loadedItems = data.map((item: any) => ({
            ...item,
            price: parseFloat(item.price),
            is_available: item.is_available ?? true
          }));
        } else {
          loadedItems = SEED_MENU;
        }
        
        setMenuItems(loadedItems);

        // Initialize with empty cart
        setCart({});
      } catch (e) {
        console.error('Failed to load menu items in CartContext:', e);
        setMenuItems(SEED_MENU);
        setCart({});
      } finally {
        setLoading(false);
      }
    };
    loadMenu();

    // Subscribe to realtime changes in menu_items
    const channel = supabase
      .channel('menu_items_realtime_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          console.log('Realtime change detected in menu_items table!');
          fetchLatestMenu();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Monitor menu items availability to clean up the cart in realtime
  useEffect(() => {
    setCart(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        const item = menuItems.find(m => m.id === id);
        if (item && item.is_available === false) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [menuItems]);

  const addToCart = (id: string) => {
    const targetItem = menuItems.find(m => m.id === id);
    if (targetItem && targetItem.is_available === false) {
      return; // Do not add to cart if not available
    }
    setCart(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[id] > 1) {
        next[id] -= 1;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const getCartItemsList = () => {
    return Object.entries(cart).map(([id, qty]) => {
      const item = menuItems.find(m => m.id === id) || SEED_MENU.find(m => m.id === id);
      return {
        item: item as MenuItem,
        qty,
      };
    }).filter(i => i.item !== undefined);
  };

  const cartTotalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotalPrice = getCartItemsList().reduce((sum, entry) => {
    return sum + (entry.item ? entry.item.price * entry.qty : 0);
  }, 0);

  return (
    <CartContext.Provider value={{
      cart,
      menuItems,
      addToCart,
      removeFromCart,
      clearCart,
      cartTotalItems,
      cartTotalPrice,
      getCartItemsList,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
