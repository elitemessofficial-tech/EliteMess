import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { useToken } from '../context/TokenContext';
import { SEED_RESTAURANT_MESSES } from '../services/dbSeedSync';
import { getMessesFromNeon } from '../services/neon';

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
      const data = await getMessesFromNeon();

      if (!data || data.length === 0) {
        setDeck(FALLBACK_MES_DECK);
      } else {
        const mappedDeck: MessSwiperCard[] = data.map((m) => ({
          id: m.id,
          name: m.name,
          address: m.address,
          distance: m.distance || '300m (4 min walk)',
          rating: Number(m.rating || 4.8),
          cutoffTime: m.cutoff_time || '2:15 PM',
          image: m.image_url || FALLBACK_MES_DECK[0].image,
          starDish: m.star_dish || 'Daily Special Thali',
          highlights: m.highlights || ['Daily Special', 'Rice', 'Roti'],
          type: m.type.includes('Non-Veg') ? 'Non-Veg & Veg' : 'Veg',
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

  // LIVE EVENT LISTENER: Instantly updates deck without requiring any reload!
  useEffect(() => {
    const handleMenuUpdate = (detail: any) => {
      if (!detail || !detail.messId) return;
      setDeck((prevDeck) =>
        prevDeck.map((mess) => {
          if (mess.id === detail.messId) {
            return {
              ...mess,
              starDish: detail.starDish || mess.starDish,
              cutoffTime: detail.cutoffTime || mess.cutoffTime,
              highlights:
                detail.highlights && detail.highlights.length > 0
                  ? detail.highlights
                  : mess.highlights,
            };
          }
          return mess;
        })
      );
    };

    const sub = DeviceEventEmitter.addListener('ELITEMESS_MENU_UPDATED', handleMenuUpdate);

    const handleWebEvent = (e: any) => {
      if (e && e.detail) {
        handleMenuUpdate(e.detail);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'ELITEMESS_LAST_MENU_UPDATE' && e.newValue) {
        try {
          handleMenuUpdate(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('ELITEMESS_MENU_UPDATED', handleWebEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('ELITEMESS_MENU_UPDATED', handleWebEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  }, []);

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
