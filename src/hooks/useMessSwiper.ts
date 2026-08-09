import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useToken } from '../context/TokenContext';
import { SEED_RESTAURANT_MESSES } from '../services/dbSeedSync';

export interface MessSwiperCard {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  cutoffTime: string;
  image: string;
  starDish: string;
  highlights: string[];
  type: 'Veg' | 'Non-Veg & Veg';
}

const FALLBACK_MES_DECK: MessSwiperCard[] = SEED_RESTAURANT_MESSES.map((m) => ({
  id: m.id,
  name: m.name,
  address: m.address,
  distance: m.distance,
  rating: m.rating,
  cutoffTime: m.cutoff_time,
  image: m.image_url,
  starDish: m.star_dish,
  highlights: m.highlights,
  type: m.type.includes('Non-Veg') ? 'Non-Veg & Veg' : 'Veg',
}));

export function useMessSwiper() {
  const { shortlistedMessIds } = useToken();
  const [deck, setDeck] = useState<MessSwiperCard[]>(FALLBACK_MES_DECK);
  const [swipedIds, setSwipedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMessDeck = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('messes')
        .select('*')
        .eq('is_active', true);

      if (error || !data || data.length === 0) {
        setDeck(FALLBACK_MES_DECK);
      } else {
        const mappedDeck: MessSwiperCard[] = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          address: m.address,
          distance: m.distance || '300m (4 min walk)',
          rating: parseFloat(m.rating || '4.8'),
          cutoffTime: m.cutoff_time || '2:15 PM',
          image: m.image_url || FALLBACK_MES_DECK[0].image,
          starDish: m.star_dish || 'Daily Special Thali',
          highlights: m.highlights || ['Daily Special', 'Rice', 'Roti'],
          type: (m.highlights && m.highlights.some((h: string) => h.toLowerCase().includes('chicken') || h.toLowerCase().includes('biryani')))
            ? 'Non-Veg & Veg'
            : 'Veg',
        }));

        setDeck(mappedDeck);
      }
    } catch (e) {
      setDeck(FALLBACK_MES_DECK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessDeck();
  }, [fetchMessDeck]);

  const markSwiped = (id: string) => {
    setSwipedIds((prev) => [...prev, id]);
  };

  const resetSwiped = () => {
    setSwipedIds([]);
  };

  const remainingDeck = deck.filter((mess) => !swipedIds.includes(mess.id));

  return {
    deck: remainingDeck,
    allMesses: deck,
    totalCount: deck.length,
    loading,
    markSwiped,
    resetSwiped,
    refetch: fetchMessDeck,
  };
}
