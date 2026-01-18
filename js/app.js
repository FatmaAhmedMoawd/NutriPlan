import { 
  getCategories, 
  getAreas,
  getMeals, 
  getMealDetails, 
  searchProducts, 
  getProductByBarcode,
  searchMeals,
  filterMealsByCategory,
  filterMealsByArea
} from "./core/api.js";
import { DAILY_LIMITS } from "./utils/constants.js";

// =================== STATE ===================
let currentPage = "meals";
let currentMeals = [];
let currentMealDetail = null;
let currentProducts = [];
let foodLog = [];
let currentFilterArea = null;
let currentFilterCategory = null;
let filteredMeals = [];
let allCategories = []; // Cache categories
let allAreas = []; // Cache areas

// =================== INITIALIZATION ===================
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  loadFoodLog();
  updateFoodLogDate();
  
  // Load initial page based on hash or default to meals
  const hash = window.location.hash.slice(1) || "meals";
  if (hash.startsWith("meal/")) {
    const mealId = hash.split("/")[1];
    await showMealDetails(mealId);
  } else {
    await navigateToPage(hash);
  }
});

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
  // Navigation
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateToPage(page);
    });
  });

  // Search
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      performSearch(e.target.value);
    });
  }

  // Meal recipe cards
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".recipe-card");
    if (card) {
      const mealId = card.dataset.mealId;
      showMealDetails(mealId);
    }
  });

  // Back to meals
  const backBtn = document.getElementById("back-to-meals-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateToPage("meals");
    });
  }

  // Products
  const searchProductBtn = document.getElementById("search-product-btn");
  if (searchProductBtn) {
    searchProductBtn.addEventListener("click", () => {
      searchProductsByName();
    });
  }

  const barcodeBtn = document.getElementById("lookup-barcode-btn");
  if (barcodeBtn) {
    barcodeBtn.addEventListener("click", () => {
      searchProductByBarcode();
    });
  }

  const productSearch = document.getElementById("product-search-input");
  if (productSearch) {
    productSearch.addEventListener("keyup", (e) => {
      if (e.key === "Enter") searchProductsByName();
    });
  }

  const barcodeInput = document.getElementById("barcode-input");
  if (barcodeInput) {
    barcodeInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") searchProductByBarcode();
    });
  }

  // Sidebar toggle
  const headerMenuBtn = document.getElementById("header-menu-btn");
  if (headerMenuBtn) {
    headerMenuBtn.addEventListener("click", () => {
      document.getElementById("sidebar").style.transform = "translateX(0)";
      document.getElementById("sidebar-overlay").style.display = "block";
    });
  }

  const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", () => {
      document.getElementById("sidebar").style.transform = "translateX(-100%)";
      document.getElementById("sidebar-overlay").style.display = "none";
    });
  }

  const sidebarOverlay = document.getElementById("sidebar-overlay");
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      document.getElementById("sidebar").style.transform = "translateX(-100%)";
      document.getElementById("sidebar-overlay").style.display = "none";
    });
  }

  // Quick log buttons
  document.querySelectorAll(".quick-log-btn").forEach((btn, index) => {
    btn.addEventListener("click", () => {
      if (index === 0) navigateToPage("meals");
      if (index === 1) navigateToPage("scanner");
      if (index === 2) showCustomEntryModal();
    });
  });

  // Clear foodlog
  const clearBtn = document.getElementById("clear-foodlog");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all logged items?")) {
        foodLog = [];
        saveFoodLog();
        renderFoodLogPage();
      }
    });
  }

  // Category buttons - using event delegation (buttons are rendered dynamically)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".meal-category-btn")) {
      const category = e.target.closest(".meal-category-btn").dataset.category;
      filterByCategory(category);
    }
  });

  // Cuisine filter - using event delegation (buttons are rendered dynamically)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".cuisine-filter")) {
      const area = e.target.closest(".cuisine-filter").dataset.area;
      filterByArea(area);
    }
  });
}

// =================== NAVIGATION ===================
async function navigateToPage(page) {
  currentPage = page;
  window.location.hash = page;
  
  // Update sidebar active state
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("bg-emerald-50", "text-emerald-700");
    link.classList.add("text-gray-600", "hover:bg-gray-50");
  });
  
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.remove("text-gray-600", "hover:bg-gray-50");
    activeLink.classList.add("bg-emerald-50", "text-emerald-700");
  }

  hideAllSections();

  if (page === "meals") await renderMealsPage();
  else if (page === "scanner") renderProductsPage();
  else if (page === "foodlog") renderFoodLogPage();
}

function hideAllSections() {
  const sections = [
    "search-filters-section",
    "meal-categories-section",
    "all-recipes-section",
    "meal-details",
    "products-section",
    "foodlog-section"
  ];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

// =================== LOADING OVERLAY ===================
function showLoadingOverlay() {
  const overlay = document.getElementById("app-loading-overlay");
  if (overlay) {
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("app-loading-overlay");
  if (overlay) {
    setTimeout(() => {
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
    }, 300);
  }
}

// =================== MEALS PAGE ===================
async function renderMealsPage() {
  showLoadingOverlay();
  
  // Reset filters
  currentFilterArea = null;
  currentFilterCategory = null;
  
  document.getElementById("page-title").textContent = "Meals & Recipes";
  document.getElementById("page-subtitle").textContent = "Discover delicious and nutritious recipes tailored for you";
  
  try {
    const [mealsData, categoriesData, areasData] = await Promise.all([
      getMeals(),
      getCategories(),
      getAreas()
    ]);

    if (!mealsData || !mealsData.meals || !Array.isArray(mealsData.meals)) {
      throw new Error("Invalid meals data");
    }

    currentMeals = mealsData.meals.filter(meal => meal && (meal.id || meal.idMeal));
    filteredMeals = currentMeals;
    
    // Cache categories and areas for later use
    allCategories = categoriesData.categories || [];
    allAreas = areasData.areas || [];
    
    document.getElementById("search-filters-section").style.display = "block";
    document.getElementById("meal-categories-section").style.display = "block";
    document.getElementById("all-recipes-section").style.display = "block";

    // Render cuisines
    renderCuisines(allAreas);
    
    // Render ALL categories (all 14 categories at once)
    console.log('Categories fetched:', allCategories.length);
    renderCategories(allCategories);
    
    // Render meals grid
    renderMealsGrid(currentMeals);
    updateMealsCount();

  } catch (error) {
    console.error("Error loading meals:", error);
    showNotification("Error", "Failed to load meals. Please try again.", "error");
  } finally {
    hideLoadingOverlay();
  }
}

function renderCuisines(areas) {
  const container = document.getElementById("cuisines-list");
  if (!container) return;
  
  container.innerHTML = '';
  
  // Add "All Recipes" button - active if no area is selected or area is empty
  const allBtn = document.createElement("button");
  const isAllActive = !currentFilterArea || currentFilterArea === "";
  allBtn.className = `cuisine-filter px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
    isAllActive 
      ? "bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-lg" 
      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  }`;
  allBtn.textContent = "All Recipes";
  allBtn.dataset.area = "";
  container.appendChild(allBtn);
  
  // Add dynamic areas from API
  (areas || []).forEach(area => {
    const btn = document.createElement("button");
    // area can be a string or an object with name/strArea
    const areaName = typeof area === "string" ? area : (area.name || area.strArea || area);
    const isActive = currentFilterArea === areaName;
    btn.className = `cuisine-filter px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
      isActive 
        ? "bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-lg" 
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;
    btn.textContent = areaName;
    btn.dataset.area = areaName;
    container.appendChild(btn);
  });
}

function renderCategories(categories) {
  const container = document.getElementById("categories-grid");
  if (!container || !categories) return;
  
  container.innerHTML = '';
  
  // Hide the View All button since we're showing all categories
  const viewAllBtn = document.querySelector('#meal-categories-section button');
  if (viewAllBtn) {
    viewAllBtn.style.display = 'none';
  }
  
  // Show ALL categories (all 14)
  categories.forEach(cat => {
    const card = document.createElement("div");
    const categoryName = cat.name || cat.strCategory;
    const isActive = currentFilterCategory === categoryName;
    card.className = `meal-category-btn p-3 bg-white rounded-xl text-center cursor-pointer hover:shadow-md transition-all ${
      isActive ? "ring-2 ring-emerald-500 shadow-lg" : ""
    }`;
    const thumbnail = cat.thumbnail || cat.strCategoryThumb || "https://via.placeholder.com/80";
    card.dataset.category = categoryName;
    card.innerHTML = `
      <img src="${thumbnail}" alt="${categoryName}" class="w-12 h-12 rounded-lg mx-auto mb-2 object-cover">
      <p class="text-xs font-semibold text-gray-900">${categoryName}</p>
    `;
    container.appendChild(card);
  });
}

function renderMealsGrid(meals) {
  const container = document.getElementById("recipes-grid");
  if (!container) return;
  
  container.innerHTML = '';
  
  const mealsToRender = meals || currentMeals;
  
  if (!mealsToRender || mealsToRender.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-search text-4xl text-gray-300 mb-4 block"></i>
        <p class="text-gray-500 font-medium">No meals found</p>
        <p class="text-sm text-gray-400 mt-2">Try adjusting your filters or search</p>
      </div>
    `;
    return;
  }
  
  mealsToRender.forEach(meal => {
    if (!meal) return;
    
    // Handle both API response formats
    const mealId = meal.id || meal.idMeal;
    const mealName = meal.name || meal.strMeal || "Unknown Meal";
    const mealInstructions = meal.instructions || meal.strInstructions || "No instructions available";
    const mealThumb = meal.thumbnail || meal.strMealThumb || "https://via.placeholder.com/200";
    const mealCategory = meal.category || meal.strCategory || "N/A";
    const mealArea = meal.area || meal.strArea || "N/A";
    const mealTags = meal.tags || [];
    
    if (!mealId) return;
    
    const card = document.createElement("div");
    card.className = "recipe-card bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group";
    card.dataset.mealId = mealId;
    card.innerHTML = `
      <div class="relative overflow-hidden">
        <img src="${mealThumb}" alt="${mealName}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300">
        ${mealTags.length > 0 ? `
          <div class="absolute top-2 left-2">
            <span class="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow">
              ${mealTags[0]}
            </span>
          </div>
        ` : ''}
      </div>
      <div class="p-4">
        <h3 class="font-bold text-gray-900 mb-2 truncate">${mealName}</h3>
      <div class="mb-4" style="display: -webkit-box; /* For WebKit browsers */
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 3; /* Limit to 3 lines */
            overflow: hidden; /* Hide overflow */
            text-overflow: ellipsis; /* Add ellipsis */
            max-width: 400px; /* Adjust width as needed to control line wrapping */
            font-size: 16px;
            line-height: 1.5;">
          <p class="text-gray-500 text-sm mb-2">${mealInstructions}</p>
      </div>
        <div class="flex gap-2 text-xs flex-wrap">
          <span class="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-medium">
            <i class="fa-solid fa-utensils mr-1"></i>${mealCategory}
          </span>
          <span class="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-medium">
            <i class="fa-solid fa-globe mr-1"></i>${mealArea}
          </span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateMealsCount() {
  const countEl = document.getElementById("recipes-count");
  if (countEl) {
    countEl.textContent = `Showing ${filteredMeals.length || currentMeals.length} recipes`;
  }
}

// =================== SEARCH & FILTERING ===================
function performSearch(query) {
  if (!query) {
    filteredMeals = currentMeals;
  } else {
    filteredMeals = currentMeals.filter(meal => {
      const query_lower = query.toLowerCase();
      const name = (meal.name || meal.strMeal || "").toLowerCase();
      const category = (meal.category || meal.strCategory || "").toLowerCase();
      const area = (meal.area || meal.strArea || "").toLowerCase();
      return name.includes(query_lower) || category.includes(query_lower) || area.includes(query_lower);
    });
  }
  
  renderMealsGrid(filteredMeals);
  updateMealsCount();
}

async function filterByCategory(category) {
  showLoadingOverlay();
  try {
    // Update current filter
    currentFilterCategory = category;
    
    // Re-render categories to show active state (using cached data)
    renderCategories(allCategories);
    
    // Filter meals by category
    const data = await filterMealsByCategory(category);
    filteredMeals = data.meals || [];
    
    // Update UI
    renderMealsGrid(filteredMeals);
    updateMealsCount();
  } catch (error) {
    console.error("Error filtering by category:", error);
    showNotification("Error", "Failed to filter meals", "error");
  } finally {
    hideLoadingOverlay();
  }
}

async function filterByArea(area) {
  showLoadingOverlay();
  try {
    // Update current filter
    currentFilterArea = area;
    
    // Re-render cuisines to show active state (using cached data)
    renderCuisines(allAreas);
    
    // Filter meals
    if (!area || area === "") {
      // Show all meals if "All Recipes" is selected
      filteredMeals = currentMeals;
    } else {
      // Filter by specific area
      const data = await filterMealsByArea(area);
      filteredMeals = data.meals || [];
    }
    
    // Update UI
    renderMealsGrid(filteredMeals);
    updateMealsCount();
  } catch (error) {
    console.error("Error filtering by area:", error);
    showNotification("Error", "Failed to filter meals", "error");
  } finally {
    hideLoadingOverlay();
  }
}

// =================== MEAL DETAILS ===================
async function showMealDetails(mealId) {
  showLoadingOverlay();
  window.location.hash = `meal/${mealId}`;
  
  try {
    // Consume the unified API response format { meal, error }
    const { meal, error } = await getMealDetails(mealId);
    
    // Check for errors from API layer
    if (error || !meal) {
      throw new Error(error || "Meal not found");
    }
    
    // meal is now a normalized object with consistent field names
    currentMealDetail = meal;
    
    hideAllSections();
    document.getElementById("meal-details").style.display = "block";
    
    renderMealDetailContent();
    
  } catch (error) {
    console.error("Error loading meal details:", error);
    showNotification("Error", "Failed to load meal details", "error");
    navigateToPage("meals");
  } finally {
    hideLoadingOverlay();
  }
}

function renderMealDetailContent() {
  const meal = currentMealDetail;
  if (!meal) return;
  
  // meal is already normalized from API, use field names directly
  const mealName = meal.name || "Unknown Meal";
  const mealThumb = meal.thumbnail || "https://via.placeholder.com/500";
  const mealCategory = meal.category || "N/A";
  const mealArea = meal.area || "N/A";
  const mealInstructions = meal.instructions || "";
  const mealYoutube = meal.youtube || "";
  
  // Hero section
  const heroEl = document.getElementById("meal-hero");
  if (heroEl) {
    // Get tags from meal
    const mealTags = meal.tags || [];
    
    heroEl.innerHTML = `
      <img src="${mealThumb}" alt="${mealName}" class="w-full h-96 object-cover rounded-t-2xl">
      <div class="p-6 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-gray-900 mb-3">${mealName}</h1>
            <div class="flex gap-2 flex-wrap">
              <span class="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                <i class="fa-solid fa-utensils mr-1"></i>${mealCategory}
              </span>
              <span class="bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                <i class="fa-solid fa-globe mr-1"></i>${mealArea}
              </span>
              ${mealTags.length > 0 ? mealTags.map(tag => `
                <span class="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <i class="fa-solid fa-tag mr-1"></i>${tag}
                </span>
              `).join('') : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Action buttons
  const actionsEl = document.getElementById("meal-actions");
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button id="log-meal-btn" class="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-all">
        <i class="fa-solid fa-plus mr-2"></i> Log This Meal
      </button>
      <button id="save-meal-btn" class="flex-1 bg-gray-200 text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all">
        <i class="fa-solid fa-bookmark mr-2"></i> Save
      </button>
    `;
    
    document.getElementById("log-meal-btn").addEventListener("click", () => {
      addMealToFoodLog(meal);
    });
  }
  
  // Ingredients
  const ingredientsEl = document.getElementById("meal-ingredients");
  if (ingredientsEl) {
    // meal.ingredients is already normalized from API
    const ingredients = meal.ingredients || [];
    
    ingredientsEl.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        <i class="fa-solid fa-list text-emerald-600 mr-2"></i> Ingredients
      </h2>
      <div class="space-y-2">
        ${ingredients.map(item => `
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" class="w-4 h-4 text-emerald-600 rounded">
            <span class="text-gray-900 font-medium">${item.ingredient}</span>
            <span class="text-gray-500 text-sm ml-auto">${item.measure || ""}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Instructions
  const instructionsEl = document.getElementById("meal-instructions");
  if (instructionsEl) {
    // Handle both array (from new API) and string (from old API)
    let steps = [];
    
    if (Array.isArray(mealInstructions)) {
      // If instructions is already an array, use it directly
      steps = mealInstructions.filter(s => s && s.trim());
    } else if (typeof mealInstructions === 'string') {
      // If instructions is a string, split it
      steps = mealInstructions.split(/\r\n|\n/).filter(s => s && s.trim());
    }
    
    instructionsEl.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        <i class="fa-solid fa-book text-emerald-600 mr-2"></i> Instructions
        <span class="text-sm font-normal text-gray-500 ml-2">${steps.length} steps</span>
      </h2>
      <div class="space-y-4">
        ${steps.map((step, idx) => `
          <div class="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors group">
            <div class="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm group-hover:scale-110 transition-transform">${idx + 1}</div>
            <p class="text-gray-700 leading-relaxed pt-2">${step}</p>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // Video
  const videoEl = document.getElementById("meal-video");
  if (videoEl) {
    if (mealYoutube) {
      const videoId = extractYoutubeId(mealYoutube);
      videoEl.innerHTML = `
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          <i class="fa-solid fa-video text-emerald-600 mr-2"></i> Video Tutorial
        </h2>
        <iframe 
          width="100%" 
          height="400" 
          src="https://www.youtube.com/embed/${videoId}" 
          class="rounded-xl"
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    } else {
      videoEl.style.display = "none";
    }
  }
  
  // Nutrition (placeholder)
  const nutritionEl = document.getElementById("meal-nutrition");
  if (nutritionEl) {
    nutritionEl.innerHTML = `
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          <i class="fa-solid fa-chart-pie text-emerald-600 mr-2"></i> Nutrition Info
        </h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <span class="font-medium text-gray-900">Calories</span>
            <span class="text-lg font-bold text-emerald-600">~500 kcal</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span class="font-medium text-gray-900">Protein</span>
            <span class="text-lg font-bold text-blue-600">~25g</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
            <span class="font-medium text-gray-900">Carbs</span>
            <span class="text-lg font-bold text-amber-600">~60g</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span class="font-medium text-gray-900">Fat</span>
            <span class="text-lg font-bold text-purple-600">~15g</span>
          </div>
        </div>
      </div>
    `;
  }
}

function extractYoutubeId(url) {
  if (!url) return "";
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : "";
}

// =================== PRODUCTS PAGE ===================
function renderProductsPage() {
  document.getElementById("page-title").textContent = "Product Scanner";
  document.getElementById("page-subtitle").textContent = "Search for nutritional information";
  
  document.getElementById("search-filters-section").style.display = "none";
  document.getElementById("meal-categories-section").style.display = "none";
  document.getElementById("all-recipes-section").style.display = "none";
  document.getElementById("products-section").style.display = "block";
}

async function searchProductsByName() {
  const query = document.getElementById("product-search-input").value.trim();
  
  if (!query) {
    showNotification("Info", "Please enter a product name", "info");
    return;
  }

  showLoadingOverlay();

  try {
    const data = await searchProducts(query, 1, 24);
    currentProducts = data.products || data || [];
    renderProductsGrid(currentProducts);
    document.getElementById("products-count").textContent = `Found ${currentProducts.length} products`;
    
    if (currentProducts.length === 0) {
      showNotification("Info", "No products found", "info");
    }
  } catch (error) {
    console.error("Error searching products:", error);
    currentProducts = [];
    renderProductsGrid([]);
    showNotification("Error", "Failed to search products", "error");
  } finally {
    hideLoadingOverlay();
  }
}

async function searchProductByBarcode() {
  const barcode = document.getElementById("barcode-input").value.trim();
  
  if (!barcode) {
    showNotification("Info", "Please enter a barcode", "info");
    return;
  }

  showLoadingOverlay();

  try {
    const data = await getProductByBarcode(barcode);
    
    if (data && (data.product || data)) {
      currentProducts = [data.product || data];
      renderProductsGrid(currentProducts);
      document.getElementById("products-count").textContent = "1 product found";
    } else {
      currentProducts = [];
      renderProductsGrid([]);
      showNotification("Info", "Product not found", "info");
    }
  } catch (error) {
    console.error("Error looking up barcode:", error);
    currentProducts = [];
    renderProductsGrid([]);
    showNotification("Error", "Product not found", "error");
  } finally {
    hideLoadingOverlay();
  }
}

function renderProductsGrid(products) {
  const container = document.getElementById("products-grid");
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!products || products.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-box text-4xl text-gray-300 mb-4 block"></i>
        <p class="text-gray-500">No products found</p>
      </div>
    `;
    return;
  }
  
  products.forEach(product => {
    if (!product) return;
    
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden";
    card.innerHTML = `
      <img src="${product.image_url || product.strMealThumb || "https://via.placeholder.com/200"}" alt="${product.name}" class="w-full h-40 object-cover">
      <div class="p-4">
        <h3 class="font-bold text-gray-900 mb-1 truncate">${product.name}</h3>
        <p class="text-sm text-gray-500 mb-2">${product.brand || "Unknown Brand"}</p>
        <div class="flex items-center justify-between mb-3">
          <span class="text-lg font-bold text-emerald-600">${product.calories || "N/A"} cal</span>
          ${product.nutri_score ? `<span class="px-2 py-1 rounded font-bold text-white" style="background-color: ${getNutriScoreColor(product.nutri_score)}">${product.nutri_score.toUpperCase()}</span>` : ""}
        </div>
        <button class="add-product-btn w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-all" data-product='${JSON.stringify(product)}'>
          Add to Log
        </button>
      </div>
    `;
    
    card.querySelector(".add-product-btn").addEventListener("click", (e) => {
      const prod = JSON.parse(e.target.dataset.product);
      addProductToFoodLog(prod);
    });
    
    container.appendChild(card);
  });
}

function getNutriScoreColor(grade) {
  const colors = {
    a: "#10b981",
    b: "#84cc16",
    c: "#eab308",
    d: "#f97316",
    e: "#ef4444"
  };
  return colors[grade?.toLowerCase()] || "#6b7280";
}

// =================== FOOD LOG ===================
function renderFoodLogPage() {
  document.getElementById("page-title").textContent = "Daily Food Log";
  document.getElementById("page-subtitle").textContent = "Track and monitor your daily nutrition intake";
  
  hideAllSections();
  document.getElementById("foodlog-section").style.display = "block";
  
  renderNutritionProgress();
  renderLoggedItems();
}

function updateFoodLogDate() {
  const today = new Date();
  const options = { weekday: "long", month: "short", day: "numeric" };
  const dateEl = document.getElementById("foodlog-date");
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString("en-US", options);
  }
}

function renderNutritionProgress() {
  const totals = calculateNutritionTotals();
  const progressContainer = document.querySelector("#foodlog-today-section .grid");
  
  if (progressContainer) {
    const progressBars = progressContainer.querySelectorAll('[class*="bg-"][class*="500"]');
    const progressStats = progressContainer.querySelectorAll('.text-sm.text-gray-500');
    
    if (progressBars[0]) {
      progressBars[0].style.width = Math.min((totals.calories / DAILY_LIMITS.calories) * 100, 100) + '%';
    }
    if (progressStats[0]) {
      progressStats[0].textContent = `${Math.round(totals.calories)} / ${DAILY_LIMITS.calories} kcal`;
    }
    
    if (progressBars[1]) {
      progressBars[1].style.width = Math.min((totals.protein / DAILY_LIMITS.protein) * 100, 100) + '%';
    }
    if (progressStats[1]) {
      progressStats[1].textContent = `${Math.round(totals.protein)} / ${DAILY_LIMITS.protein} g`;
    }
    
    if (progressBars[2]) {
      progressBars[2].style.width = Math.min((totals.carbs / DAILY_LIMITS.carbs) * 100, 100) + '%';
    }
    if (progressStats[2]) {
      progressStats[2].textContent = `${Math.round(totals.carbs)} / ${DAILY_LIMITS.carbs} g`;
    }
    
    if (progressBars[3]) {
      progressBars[3].style.width = Math.min((totals.fats / DAILY_LIMITS.fats) * 100, 100) + '%';
    }
    if (progressStats[3]) {
      progressStats[3].textContent = `${Math.round(totals.fats)} / ${DAILY_LIMITS.fats} g`;
    }
  }
}

function renderLoggedItems() {
  const list = document.getElementById("logged-items-list");
  const count = document.getElementById("logged-items-count");
  const clearBtn = document.getElementById("clear-foodlog");

  if (count) count.textContent = foodLog.length;
  if (clearBtn) clearBtn.style.display = foodLog.length > 0 ? "block" : "none";

  if (!list) return;

  if (foodLog.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">No meals logged today</p>
        <p class="text-sm">Add meals from the Meals page or scan products</p>
      </div>
    `;
    return;
  }

  list.innerHTML = foodLog.map(item => `
    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
      <div>
        <p class="font-semibold text-gray-900">${item.name}</p>
        <p class="text-xs text-gray-500">${item.type === 'meal' ? 'Meal' : item.type === 'product' ? 'Product' : 'Custom'} • ${Math.round(item.calories)} cal</p>
      </div>
      <button class="remove-item-btn text-red-500 hover:text-red-600 text-sm" data-id="${item.id}">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
  
  // Add remove event listeners
  document.querySelectorAll(".remove-item-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      removeFromFoodLog(id);
    });
  });
}

function calculateNutritionTotals() {
  return foodLog.reduce((totals, item) => ({
    calories: totals.calories + (item.calories || 0),
    protein: totals.protein + (item.protein || 0),
    carbs: totals.carbs + (item.carbs || 0),
    fats: totals.fats + (item.fats || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

// =================== FOOD LOG STORAGE ===================
function getFoodLogStorageKey() {
  const today = new Date().toISOString().split("T")[0];
  return `nutriplan-log-${today}`;
}

function loadFoodLog() {
  const key = getFoodLogStorageKey();
  const data = localStorage.getItem(key);
  foodLog = data ? JSON.parse(data) : [];
}

function saveFoodLog() {
  const key = getFoodLogStorageKey();
  localStorage.setItem(key, JSON.stringify(foodLog));
  renderFoodLogPage();
}

function addMealToFoodLog(meal) {
  if (!meal) return;
  
  // Use normalized field names from API (meal is already normalized)
  foodLog.push({
    id: `meal_${meal.id}_${Date.now()}`,
    name: meal.name,
    type: "meal",
    calories: 500,
    protein: 25,
    carbs: 60,
    fats: 15,
    timestamp: new Date().toISOString()
  });
  
  saveFoodLog();
  showNotification("Success", `${meal.name} added to food log!`, "success");
}

function addProductToFoodLog(product) {
  if (!product) return;
  
  foodLog.push({
    id: `product_${product.id || Date.now()}`,
    name: product.name,
    type: "product",
    calories: product.calories || 0,
    protein: product.protein || 0,
    carbs: product.carbs || 0,
    fats: product.fats || 0,
    timestamp: new Date().toISOString()
  });
  
  saveFoodLog();
  showNotification("Success", `${product.name} added to food log!`, "success");
}

function removeFromFoodLog(id) {
  foodLog = foodLog.filter(item => item.id !== id);
  saveFoodLog();
}

function showCustomEntryModal() {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Add Custom Food',
      html: `
        <input type="text" id="customFoodName" class="swal2-input" placeholder="Food name">
        <input type="number" id="customCalories" class="swal2-input" placeholder="Calories" value="0">
        <input type="number" id="customProtein" class="swal2-input" placeholder="Protein (g)" value="0">
        <input type="number" id="customCarbs" class="swal2-input" placeholder="Carbs (g)" value="0">
        <input type="number" id="customFats" class="swal2-input" placeholder="Fats (g)" value="0">
      `,
      confirmButtonText: 'Add',
      preConfirm: () => {
        const name = document.getElementById('customFoodName').value;
        const calories = parseInt(document.getElementById('customCalories').value) || 0;
        const protein = parseInt(document.getElementById('customProtein').value) || 0;
        const carbs = parseInt(document.getElementById('customCarbs').value) || 0;
        const fats = parseInt(document.getElementById('customFats').value) || 0;
        
        if (!name) {
          Swal.showValidationMessage('Please enter a food name');
          return false;
        }

        foodLog.push({
          id: `custom_${Date.now()}`,
          name,
          type: 'custom',
          calories,
          protein,
          carbs,
          fats,
          timestamp: new Date().toISOString()
        });

        saveFoodLog();
        navigateToPage("foodlog");
        return true;
      }
    });
  }
}

// =================== UTILITIES ===================
function showNotification(title, message, type = "info") {
  if (typeof Swal !== 'undefined') {
    Swal.fire(title, message, type);
  } else {
    console.log(`[${type}] ${title}: ${message}`);
  }
}

// =================== HASH ROUTING ===================
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  
  if (hash.startsWith('meal/')) {
    const mealId = hash.split('/')[1];
    showMealDetails(mealId);
  } else if (hash === 'scanner') {
    navigateToPage('scanner');
  } else if (hash === 'foodlog') {
    navigateToPage('foodlog');
  } else {
    navigateToPage('meals');
  }
});
