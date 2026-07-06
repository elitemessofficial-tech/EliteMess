import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available?: boolean;
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
  { id: '1', name: 'Truffle Arancini', description: 'Crisp saffron rice, black truffle, parmesan cream', price: 1200, category: 'Starters' },
  { id: '2', name: 'Wagyu Sliders', description: 'Aged cheddar, caramelized onion, brioche bun', price: 1600, category: 'Starters' },
  { id: '3', name: 'Miso Black Cod', description: 'Silky glaze, charred baby bok choy, citrus', price: 2400, category: 'Mains' },
  { id: '4', name: 'Valrhona Chocolate Tart', description: 'Salted caramel, vanilla bean, gold leaf', price: 900, category: 'Desserts' },
  { id: '5', name: 'Gourmet Truffle Burger', description: 'Double Angus beef patty, Swiss cheese, truffle aioli, brioche bun.', price: 1500, category: 'Mains' },
  { id: '6', name: 'Iced Caramel Macchiato', description: 'Freshly brewed espresso, steamed milk, vanilla syrup, caramel drizzle.', price: 450, category: 'Beverages' },
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
