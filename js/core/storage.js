import { getFoodLogStorageKey } from "../utils/helpers.js";

// Storage management for NutriPlan
export class AppStorage {
  static KEYS = {
    FAVORITES: "nutriplan-favorites",
    USER_PREFERENCES: "nutriplan-prefs",
    FOOD_LOG_PREFIX: "nutriplan-log-"
  };

  // Favorites
  static addToFavorites(mealId) {
    const favorites = this.getFavorites();
    if (!favorites.includes(mealId)) {
      favorites.push(mealId);
      localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
    }
  }

  static removeFromFavorites(mealId) {
    let favorites = this.getFavorites();
    favorites = favorites.filter(id => id !== mealId);
    localStorage.setItem(this.KEYS.FAVORITES, JSON.stringify(favorites));
  }

  static getFavorites() {
    const data = localStorage.getItem(this.KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  }

  static isFavorited(mealId) {
    return this.getFavorites().includes(mealId);
  }

  // Food Log
  static saveFoodLog(items, date = new Date()) {
    const key = getFoodLogStorageKey(date);
    localStorage.setItem(key, JSON.stringify(items));
  }

  static getFoodLog(date = new Date()) {
    const key = getFoodLogStorageKey(date);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static clearFoodLog(date = new Date()) {
    const key = getFoodLogStorageKey(date);
    localStorage.removeItem(key);
  }

  static addToFoodLog(item, date = new Date()) {
    const items = this.getFoodLog(date);
    items.push({
      ...item,
      id: `${Date.now()}-${Math.random()}`, // Unique ID for each log entry
      addedAt: new Date().toISOString()
    });
    this.saveFoodLog(items, date);
    return items;
  }

  static removeFromFoodLog(itemId, date = new Date()) {
    const items = this.getFoodLog(date);
    const filtered = items.filter(item => item.id !== itemId);
    this.saveFoodLog(filtered, date);
    return filtered;
  }

  // Preferences
  static setPreference(key, value) {
    const prefs = this.getPreferences();
    prefs[key] = value;
    localStorage.setItem(this.KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  }

  static getPreference(key, defaultValue = null) {
    const prefs = this.getPreferences();
    return prefs[key] || defaultValue;
  }

  static getPreferences() {
    const data = localStorage.getItem(this.KEYS.USER_PREFERENCES);
    return data ? JSON.parse(data) : {};
  }

  static clearAll() {
    localStorage.clear();
  }
}

// Legacy exports for compatibility
export function getFoodLog() {
  return AppStorage.getFoodLog();
}

export function addToFoodLog(item) {
  return AppStorage.addToFoodLog(item);
}

export function clearFoodLog() {
  return AppStorage.clearFoodLog();
}
