import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'hotelbet_favorite_dishes_v1';

export async function getFavoriteDishIds(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
}

export async function toggleFavoriteDishId(dishId: string): Promise<string[]> {
  try {
    const current = await getFavoriteDishIds();
    let updated: string[];
    if (current.includes(dishId)) {
      updated = current.filter(id => id !== dishId);
    } else {
      updated = [...current, dishId];
    }
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}
