import { BASE_URL, USDA_API_KEY } from "../utils/constants.js";

/**
 * ====================================================================
 * NUTRIPLAN API ABSTRACTION LAYER
 * ====================================================================
 * 
 * Purpose:
 *   - Centralize all API logic
 *   - Handle fallbacks internally (UI never knows about failures)
 *   - Return consistent response format: { data: ..., error: null|string }
 *   - Never throw errors to the UI layer
 * 
 * Philosophy:
 *   - Graceful degradation (fallback to TheMealDB when Proxy fails)
 *   - Client-side pagination when backend doesn't support it
 *   - Handle response shape variations from different APIs
 * ====================================================================
 */

/**
 * Internal fetch wrapper with error handling
 * Never throws - always returns { success: bool, data: object|null }
 */
async function fetchSafe(url, options = {}) {
  try {
    const res = await fetch(url, options);
    
    if (!res.ok) {
      console.warn(`[API] ${res.status} from ${url}`);
      return { success: false, data: null };
    }
    
    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.warn(`[API] Fetch failed: ${url}`, error.message);
    return { success: false, data: null };
  }
}

/**
 * Normalize meal object from different API sources
 * Ensures consistent shape regardless of source
 */
function normalizeMeal(meal) {
  if (!meal) return null;
  
  // Handle instructions - can be array or string
  let normalizedInstructions = meal.instructions || meal.strInstructions || "";
  
  // If it's a string, keep it as is (will be split in UI)
  // If it's an array, keep it as is (will be used directly in UI)
  
  return {
    // IDs (handle both formats)
    id: meal.id || meal.idMeal,
    
    // Basic info
    name: meal.name || meal.strMeal,
    category: meal.category || meal.strCategory,
    area: meal.area || meal.strArea,
    thumbnail: meal.thumbnail || meal.strMealThumb,
    
    // Instructions (can be array or string)
    instructions: normalizedInstructions,
    
    // Ingredients (handle both formats)
    ingredients: meal.ingredients || (
      Array.from({ length: 20 }, (_, i) => {
        const ingredient = meal[`strIngredient${i + 1}`];
        const measure = meal[`strMeasure${i + 1}`];
        return (ingredient && ingredient.trim()) ? { ingredient, measure } : null;
      }).filter(Boolean)
    ),
    
    // Video
    youtube: meal.youtube || meal.strYoutube,
    
    // Tags (can be array or string)
    tags: Array.isArray(meal.tags) ? meal.tags : (meal.strTags ? meal.strTags.split(',').map(t => t.trim()) : []),
  };
}

/**
 * ====================================================================
 * MEALS ENDPOINTS
 * ====================================================================
 */

/**
 * Get initial meals list (starting with letter 'a')
 * 
 * NOTE: TheMealDB returns ALL meals starting with 'a' in one response
 * There's no pagination parameter, so we fetch all and slice in the UI
 * 
 * Returns: { meals: [...], error: null }
 */
export async function getMeals(page = 1, limit = 25) {
  // Try Proxy API first
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/search?f=a`);
  
  if (proxyRes.success && proxyRes.data?.results?.length) {
    // Proxy returns paginated results in "results" field
    const normalized = proxyRes.data.results
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  // Fallback to TheMealDB (always available)
  console.log("[API] Proxy failed, using TheMealDB fallback");
  const fallbackRes = await fetchSafe("https://www.themealdb.com/api/json/v1/1/search.php?f=a");
  
  if (fallbackRes.success && fallbackRes.data?.meals?.length) {
    const normalized = fallbackRes.data.meals
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  // Both failed - return safe default
  console.error("[API] Both Proxy and TheMealDB failed for getMeals");
  return { meals: [], error: "Unable to load meals. Please try again." };
}

/**
 * Get meal details by ID
 * 
 * Handles response structure differences:
 * - Proxy: returns single meal object directly
 * - TheMealDB: returns { meals: [...] }
 * 
 * Returns: { meal: {...}|null, error: null }
 */
export async function getMealDetails(id) {
  // Try Proxy API first
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/${id}`);
  
  if (proxyRes.success && proxyRes.data) {
    const meal = normalizeMeal(proxyRes.data);
    if (meal?.id) {
      return { meal, error: null };
    }
  }
  
  // Fallback to TheMealDB
  console.log("[API] Proxy failed, using TheMealDB fallback for meal details");
  const fallbackRes = await fetchSafe(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
  
  if (fallbackRes.success && fallbackRes.data?.meals?.length) {
    const meal = normalizeMeal(fallbackRes.data.meals[0]);
    if (meal?.id) {
      return { meal, error: null };
    }
  }
  
  // Both failed
  console.error("[API] Both Proxy and TheMealDB failed for meal details");
  return { meal: null, error: "Meal not found" };
}

/**
 * Get all available meal categories
 * 
 * Returns: { categories: [...], error: null }
 */
export async function getCategories() {
  // Try Proxy API first (returns from: https://nutriplan-api.vercel.app/api/meals/categories)
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/categories`);
  
  if (proxyRes.success && proxyRes.data?.results?.length) {
    // Proxy returns data in "results" field
    const normalized = proxyRes.data.results.map(cat => ({
      id: cat.id,
      name: cat.name,
      thumbnail: cat.thumbnail,
      description: cat.description,
    }));
    return { categories: normalized, error: null };
  }
  
  // Fallback to TheMealDB
  console.log("[API] Proxy failed, using TheMealDB fallback for categories");
  const fallbackRes = await fetchSafe("https://www.themealdb.com/api/json/v1/1/categories.php");
  
  if (fallbackRes.success && fallbackRes.data?.categories?.length) {
    // Normalize field names for consistency
    const normalized = fallbackRes.data.categories.map(cat => ({
      id: cat.idCategory,
      name: cat.strCategory,
      thumbnail: cat.strCategoryThumb,
      description: cat.strCategoryDescription,
    }));
    return { categories: normalized, error: null };
  }
  
  console.error("[API] Both Proxy and TheMealDB failed for categories");
  return { categories: [], error: "Unable to load categories" };
}

/**
 * Get all available meal areas (cuisines/countries)
 * 
 * Returns: { areas: [...], error: null }
 */
export async function getAreas() {
  // Try Proxy API first
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/areas`);
  
  if (proxyRes.success && proxyRes.data?.results?.length) {
    const areas = proxyRes.data.results.map(a => a.name || a);
    return { areas, error: null };
  }
  
  // Fallback to TheMealDB
  console.log("[API] Proxy failed, using TheMealDB fallback for areas");
  const fallbackRes = await fetchSafe("https://www.themealdb.com/api/json/v1/1/list.php?a=list");
  
  if (fallbackRes.success && fallbackRes.data?.meals?.length) {
    const areas = fallbackRes.data.meals
      .map(m => m.strArea)
      .filter(Boolean);
    return { areas, error: null };
  }
  
  console.error("[API] Both Proxy and TheMealDB failed for areas");
  return { areas: [], error: "Unable to load areas" };
}

/**
 * Filter meals by category
 * 
 * NOTE: TheMealDB returns all results at once (no pagination)
 * Backend should handle pagination if available, UI slices locally if needed
 * 
 * Returns: { meals: [...], error: null }
 */
export async function filterMealsByCategory(category, page = 1, limit = 25) {
  // Try Proxy API first
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/filter?category=${encodeURIComponent(category)}`);
  
  if (proxyRes.success && proxyRes.data?.results?.length) {
    const normalized = proxyRes.data.results
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  // Fallback to TheMealDB (doesn't paginate)
  console.log("[API] Proxy failed, using TheMealDB fallback for category filter");
  const fallbackRes = await fetchSafe(
    `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
  );
  
  if (fallbackRes.success && fallbackRes.data?.meals?.length) {
    const normalized = fallbackRes.data.meals
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  console.error("[API] Both Proxy and TheMealDB failed for category filter");
  return { meals: [], error: "No meals found in this category" };
}

/**
 * Filter meals by area (cuisine/country)
 * 
 * NOTE: Same pagination caveat as filterMealsByCategory
 * 
 * Returns: { meals: [...], error: null }
 */
export async function filterMealsByArea(area, page = 1, limit = 25) {
  // Try Proxy API first
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/filter?area=${encodeURIComponent(area)}`);
  
  if (proxyRes.success && proxyRes.data?.results?.length) {
    const normalized = proxyRes.data.results
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  // Fallback to TheMealDB (doesn't paginate)
  console.log("[API] Proxy failed, using TheMealDB fallback for area filter");
  const fallbackRes = await fetchSafe(
    `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`
  );
  
  if (fallbackRes.success && fallbackRes.data?.meals?.length) {
    const normalized = fallbackRes.data.meals
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  console.error("[API] Both Proxy and TheMealDB failed for area filter");
  return { meals: [], error: "No meals found in this area" };
}

/**
 * Search meals by query string
 * 
 * NOTE: Used only if you want server-side search
 * Currently app.js does client-side filtering (more efficient)
 * This function is kept for future use or exam requirements
 * 
 * Returns: { meals: [...], error: null }
 */
export async function searchMeals(query) {
  if (!query || query.length < 2) {
    return { meals: [], error: "Search term too short" };
  }
  
  // Try Proxy API first
  const proxyRes = await fetchSafe(`${BASE_URL}/meals/search?q=${encodeURIComponent(query)}`);
  
  if (proxyRes.success && proxyRes.data?.results?.length) {
    const normalized = proxyRes.data.results
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  // Fallback to TheMealDB
  console.log("[API] Proxy failed, using TheMealDB fallback for search");
  const fallbackRes = await fetchSafe(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
  );
  
  if (fallbackRes.success && fallbackRes.data?.meals?.length) {
    const normalized = fallbackRes.data.meals
      .map(normalizeMeal)
      .filter(Boolean);
    return { meals: normalized, error: null };
  }
  
  console.warn("[API] Both APIs returned no results for:", query);
  return { meals: [], error: "No meals found" };
}

/**
 * ====================================================================
 * PRODUCTS ENDPOINTS
 * ====================================================================
 * 
 * NOTE: Products API is OPTIONAL for exam scenarios
 * It depends on external USDA API key which may not be available
 * UI should gracefully handle product endpoint failures
 * ====================================================================
 */

/**
 * Search for products/nutrition data by name
 * 
 * LIMITATION: Requires valid USDA API Key
 * If key is missing or API unavailable, returns empty results
 * 
 * Returns: { products: [...], error: null }
 */
export async function searchProducts(query, page = 1, limit = 24) {
  if (!query || query.length < 2) {
    return { products: [], error: "Search term too short" };
  }
  
  // Check if API key is configured
  if (!USDA_API_KEY) {
    console.warn("[API] No USDA API Key configured - products search unavailable");
    return { products: [], error: "Products API not configured" };
  }
  
  // Try Proxy API with USDA credentials
  const res = await fetchSafe(
    `${BASE_URL}/nutrition/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    {
      headers: {
        "x-api-key": USDA_API_KEY,
      },
    }
  );
  
  if (res.success && res.data?.results?.length) {
    return { products: res.data.results, error: null };
  }
  
  if (res.success && res.data?.products?.length) {
    return { products: res.data.products, error: null };
  }
  
  console.warn("[API] Product search returned no results for:", query);
  return { products: [], error: "No products found" };
}

/**
 * Get product by barcode (EAN, UPC, etc.)
 * 
 * LIMITATION: Requires valid USDA API Key
 * 
 * Returns: { product: {...}|null, error: null }
 */
export async function getProductByBarcode(barcode) {
  if (!barcode || barcode.length < 8) {
    return { product: null, error: "Invalid barcode" };
  }
  
  // Check if API key is configured
  if (!USDA_API_KEY) {
    console.warn("[API] No USDA API Key configured - barcode lookup unavailable");
    return { product: null, error: "Barcode API not configured" };
  }
  
  // Try Proxy API with USDA credentials
  const res = await fetchSafe(
    `${BASE_URL}/nutrition/barcode?code=${encodeURIComponent(barcode)}`,
    {
      headers: {
        "x-api-key": USDA_API_KEY,
      },
    }
  );
  
  if (res.success && res.data?.product) {
    return { product: res.data.product, error: null };
  }
  
  if (res.success && res.data) {
    return { product: res.data, error: null };
  }
  
  console.warn("[API] Barcode lookup found nothing for:", barcode);
  return { product: null, error: "Product not found" };
}

/**
 * Get nutrition facts for a food item
 * 
 * LIMITATION: Requires valid USDA API Key
 * 
 * Returns: { nutrition: {...}|null, error: null }
 */
export async function getNutrition(foodName) {
  if (!foodName || foodName.length < 2) {
    return { nutrition: null, error: "Food name too short" };
  }
  
  if (!USDA_API_KEY) {
    console.warn("[API] No USDA API Key configured - nutrition lookup unavailable");
    return { nutrition: null, error: "Nutrition API not configured" };
  }
  
  const res = await fetchSafe(
    `${BASE_URL}/nutrition?query=${encodeURIComponent(foodName)}`,
    {
      headers: {
        "x-api-key": USDA_API_KEY,
      },
    }
  );
  
  if (res.success && res.data?.foods?.length) {
    return { nutrition: res.data.foods[0], error: null };
  }
  
  if (res.success && res.data) {
    return { nutrition: res.data, error: null };
  }
  
  console.warn("[API] Nutrition lookup found nothing for:", foodName);
  return { nutrition: null, error: "Nutrition data not found" };
}
