import { getCategories, getMeals, getMealDetails, getNutrition, searchProducts, getProductByBarcode } from "./core/api.js";
import { DAILY_LIMITS } from "./utils/constants.js";
import Meal from "./models/Meal.js";
import Product from "./models/Product.js";

// =================== STATE ===================
let currentPage = "meals";
let currentMeals = [];
let currentMealDetail = null;
let currentProducts = [];
let foodLog = [];

// =================== UTIL FUNCTIONS ===================
function hideAllSections() {
  document.getElementById("search-filters-section").style.display = "none";
  document.getElementById("meal-categories-section").style.display = "none";
  document.getElementById("all-recipes-section").style.display = "none";
  document.getElementById("meal-details").style.display = "none";
  document.getElementById("products-section").style.display = "none";
  document.getElementById("foodlog-section").style.display = "none";
}

function showLoadingOverlay() {
  document.getElementById("app-loading-overlay").style.opacity = "1";
  document.getElementById("app-loading-overlay").style.pointerEvents = "auto";
}

function hideLoadingOverlay() {
  setTimeout(() => {
    document.getElementById("app-loading-overlay").style.opacity = "0";
    document.getElementById("app-loading-overlay").style.pointerEvents = "none";
  }, 300);
}

function formatDate(date = new Date()) {
  const options = { weekday: "long", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

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
}

// =================== RENDER MEALS PAGE ===================
async function renderMealsPage() {
  hideAllSections();
  document.getElementById("search-filters-section").style.display = "block";
  document.getElementById("meal-categories-section").style.display = "block";
  document.getElementById("all-recipes-section").style.display = "block";
  
  document.getElementById("page-title").textContent = "Meals & Recipes";
  document.getElementById("page-subtitle").textContent = "Discover delicious and nutritious recipes tailored for you";
  
  showLoadingOverlay();
  
  try {
    // Fetch meals and categories
    const [mealsData, categoriesData] = await Promise.all([
      getMeals(),
      getCategories()
    ]);
    
    // Handle null or undefined meals response
    if (!mealsData || !mealsData.meals || !Array.isArray(mealsData.meals)) {
      throw new Error("Invalid meals data received from API");
    }
    
    currentMeals = mealsData.meals.map(m => new Meal(m));
    
    // Render categories
    renderCategories(categoriesData.meals || []);
    
    // Render meals
    renderMealsGrid();
    
    // Update recipe count
    document.getElementById("recipes-count").textContent = `Showing ${currentMeals.length} recipes`;
    
  } catch (error) {
    console.error("Error loading meals:", error);
    if (typeof Swal !== 'undefined') {
      Swal.fire("Error", "Failed to load meals. Please try again.", "error");
    }
  } finally {
    hideLoadingOverlay();
  }
}

function renderCategories(categories) {
  const grid = document.getElementById("categories-grid");
  grid.innerHTML = "";
  
  // Sample categories from TheMealDB
  const sampleCategories = ["Beef", "Chicken", "Seafood", "Pasta", "Dessert", "Vegan"];
  
  sampleCategories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "category-card bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all group";
    div.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="text-white w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
          <i class="fa-solid fa-utensils"></i>
        </div>
        <h3 class="text-sm font-bold text-gray-900">${cat}</h3>
      </div>
    `;
    div.addEventListener("click", () => filterByCategory(cat));
    grid.appendChild(div);
  });
}

function renderMealsGrid() {
  const grid = document.getElementById("recipes-grid");
  grid.innerHTML = "";
  
  currentMeals.slice(0, 20).forEach(meal => {
    const div = document.createElement("div");
    div.className = "recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group";
    div.innerHTML = `
      <div class="relative h-48 overflow-hidden">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${meal.image}" alt="${meal.name}" loading="lazy" />
        <div class="absolute bottom-3 left-3 flex gap-2">
          <span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700">Meal</span>
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${meal.name}</h3>
        <p class="text-xs text-gray-600 mb-3 line-clamp-2">Delicious recipe to try!</p>
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-gray-900"><i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>${meal.category || "Meal"}</span>
        </div>
      </div>
    `;
    div.addEventListener("click", () => showMealDetails(meal.id));
    grid.appendChild(div);
  });
}

async function filterByCategory(category) {
  showLoadingOverlay();
  try {
    const data = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`).then(r => r.json());
    currentMeals = data.meals.map(m => new Meal(m));
    renderMealsGrid();
    document.getElementById("recipes-count").textContent = `Showing ${currentMeals.length} recipes`;
  } catch (error) {
    console.error("Error filtering by category:", error);
  } finally {
    hideLoadingOverlay();
  }
}

// =================== RENDER MEAL DETAILS PAGE ===================
async function showMealDetails(mealId) {
  hideAllSections();
  document.getElementById("meal-details").style.display = "block";
  
  showLoadingOverlay();
  
  try {
    const data = await getMealDetails(mealId);
    currentMealDetail = new Meal(data.meals[0]);
    
    // Try to fetch nutrition
    try {
      const nutritionData = await getNutrition(currentMealDetail.name);
      if (nutritionData && nutritionData.foods && nutritionData.foods[0]) {
        const nut = nutritionData.foods[0].foodNutrients || [];
        currentMealDetail.calories = nut.find(n => n.nutrientName === "Energy")?.value || 0;
        currentMealDetail.protein = nut.find(n => n.nutrientName === "Protein")?.value || 0;
        currentMealDetail.carbs = nut.find(n => n.nutrientName === "Carbohydrate")?.value || 0;
        currentMealDetail.fats = nut.find(n => n.nutrientName === "Total lipid (fat)")?.value || 0;
      }
    } catch (e) {
      console.log("Nutrition data not available");
    }
    
    renderMealDetailsPage();
    
  } catch (error) {
    console.error("Error loading meal details:", error);
    if (typeof Swal !== 'undefined') {
      Swal.fire("Error", "Failed to load meal details.", "error");
    }
  } finally {
    hideLoadingOverlay();
  }
}

function renderMealDetailsPage() {
  const meal = currentMealDetail;
  
  // Hero
  const hero = document.getElementById("meal-hero");
  hero.innerHTML = `
    <div class="relative h-80 md:h-96">
      <img src="${meal.image}" alt="${meal.name}" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
      <div class="absolute bottom-0 left-0 right-0 p-8">
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${meal.name}</h1>
        <div class="flex items-center gap-6 text-white/90">
          <span class="flex items-center gap-2"><i class="fa-solid fa-fire"></i> ${meal.calories || "N/A"} cal</span>
        </div>
      </div>
    </div>
  `;
  
  // Actions
  const actions = document.getElementById("meal-actions");
  actions.innerHTML = `
    <button class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all" onclick="window.logMeal()">
      <i class="fa-solid fa-clipboard-list"></i>
      <span>Log This Meal</span>
    </button>
  `;
  
  // Ingredients
  const ingredients = document.getElementById("meal-ingredients");
  ingredients.innerHTML = `
    <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
      <i class="fa-solid fa-list-check text-emerald-600"></i>
      Ingredients
      <span class="text-sm font-normal text-gray-500 ml-auto">${meal.ingredients.length} items</span>
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${meal.ingredients.map((ing, i) => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
          <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300" />
          <span class="text-gray-700">${ing}</span>
        </div>
      `).join("")}
    </div>
  `;
  
  // Instructions
  const instructions = document.getElementById("meal-instructions");
  const steps = meal.instructions.split("\r\n").filter(s => s.trim());
  instructions.innerHTML = `
    <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
      <i class="fa-solid fa-shoe-prints text-emerald-600"></i>
      Instructions
    </h2>
    <div class="space-y-4">
      ${steps.map((step, i) => `
        <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
          <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${i + 1}</div>
          <p class="text-gray-700 leading-relaxed pt-2">${step}</p>
        </div>
      `).join("")}
    </div>
  `;
  
  // Video
  const video = document.getElementById("meal-video");
  video.innerHTML = `
    <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
      <i class="fa-solid fa-video text-red-500"></i>
      Video Tutorial
    </h2>
    <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
      ${meal.youtube ? `<iframe src="${meal.youtube.replace("watch?v=", "embed/")}" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : "<p class='p-4 text-gray-500'>No video available</p>"}
    </div>
  `;
  
  // Nutrition
  const nutrition = document.getElementById("meal-nutrition");
  nutrition.innerHTML = `
    <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
      <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <i class="fa-solid fa-chart-pie text-emerald-600"></i>
        Nutrition Facts
      </h2>
      <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
        <p class="text-sm text-gray-600">Calories per serving</p>
        <p class="text-4xl font-bold text-emerald-600">${meal.calories || 0}</p>
      </div>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-gray-700">Protein</span>
          <span class="font-bold text-gray-900">${meal.protein || 0}g</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-700">Carbs</span>
          <span class="font-bold text-gray-900">${meal.carbs || 0}g</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-gray-700">Fat</span>
          <span class="font-bold text-gray-900">${meal.fats || 0}g</span>
        </div>
      </div>
    </div>
  `;
}

// =================== LOG MEAL ===================
window.logMeal = function() {
  if (currentMealDetail) {
    foodLog.push({
      id: currentMealDetail.id,
      name: currentMealDetail.name,
      type: "meal",
      calories: currentMealDetail.calories || 0,
      protein: currentMealDetail.protein || 0,
      carbs: currentMealDetail.carbs || 0,
      fats: currentMealDetail.fats || 0,
      timestamp: new Date().toISOString()
    });
    saveFoodLog();
    if (typeof Swal !== 'undefined') {
      Swal.fire("Success", "Meal logged!", "success");
    }
  };
};

// =================== RENDER PRODUCTS PAGE ===================
async function renderProductsPage() {
  hideAllSections();
  document.getElementById("products-section").style.display = "block";
  
  document.getElementById("page-title").textContent = "Product Scanner";
  document.getElementById("page-subtitle").textContent = "Search and scan food products";
}

// =================== RENDER FOOD LOG PAGE ===================
function renderFoodLogPage() {
  hideAllSections();
  document.getElementById("foodlog-section").style.display = "block";
  
  document.getElementById("page-title").textContent = "Daily Food Log";
  document.getElementById("page-subtitle").textContent = "Track your daily nutrition";
  
  loadFoodLog();
  updateFoodLogDisplay();
}

function updateFoodLogDisplay() {
  const dateEl = document.getElementById("foodlog-date");
  dateEl.textContent = formatDate();
  
  const itemsCount = document.getElementById("logged-items-count");
  itemsCount.textContent = foodLog.length;
  
  const itemsList = document.getElementById("logged-items-list");
  
  if (foodLog.length === 0) {
    itemsList.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">No meals logged today</p>
        <p class="text-sm">Add meals from the Meals page or scan products</p>
      </div>
    `;
    document.getElementById("clear-foodlog").style.display = "none";
  } else {
    itemsList.innerHTML = foodLog.map((item, idx) => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p class="font-medium text-gray-900">${item.name}</p>
          <p class="text-sm text-gray-500">${item.calories} cal | P: ${item.protein}g | C: ${item.carbs}g | F: ${item.fats}g</p>
        </div>
        <button onclick="window.removeLogItem(${idx})" class="text-red-500 hover:text-red-700">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join("");
    document.getElementById("clear-foodlog").style.display = "block";
  }
  
  // Update nutrition progress
  const totals = foodLog.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fats: acc.fats + item.fats
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  
  const progress = document.getElementById("nutrition-progress");
  progress.innerHTML = `
    <div class="bg-emerald-50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold text-gray-700">Calories</span>
        <span class="text-sm text-gray-500">${Math.round(totals.calories)} / ${DAILY_LIMITS.calories} kcal</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-emerald-500 h-2.5 rounded-full" style="width: ${Math.min(100, (totals.calories / DAILY_LIMITS.calories) * 100)}%"></div>
      </div>
    </div>
    <div class="bg-blue-50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold text-gray-700">Protein</span>
        <span class="text-sm text-gray-500">${Math.round(totals.protein)} / ${DAILY_LIMITS.protein} g</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-blue-500 h-2.5 rounded-full" style="width: ${Math.min(100, (totals.protein / DAILY_LIMITS.protein) * 100)}%"></div>
      </div>
    </div>
    <div class="bg-amber-50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold text-gray-700">Carbs</span>
        <span class="text-sm text-gray-500">${Math.round(totals.carbs)} / ${DAILY_LIMITS.carbs} g</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-amber-500 h-2.5 rounded-full" style="width: ${Math.min(100, (totals.carbs / DAILY_LIMITS.carbs) * 100)}%"></div>
      </div>
    </div>
    <div class="bg-purple-50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-semibold text-gray-700">Fat</span>
        <span class="text-sm text-gray-500">${Math.round(totals.fats)} / ${DAILY_LIMITS.fats} g</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-purple-500 h-2.5 rounded-full" style="width: ${Math.min(100, (totals.fats / DAILY_LIMITS.fats) * 100)}%"></div>
      </div>
    </div>
  `;
}

window.removeLogItem = function(idx) {
  foodLog.splice(idx, 1);
  saveFoodLog();
  updateFoodLogDisplay();
};

window.clearFoodLog = function() {
  if (confirm("Are you sure?")) {
    foodLog = [];
    saveFoodLog();
    updateFoodLogDisplay();
  }
};

// =================== NAVIGATION ===================
function navigate(page) {
  currentPage = page;
  
  // Update nav active state
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.remove("bg-emerald-50", "text-emerald-700");
    link.classList.add("text-gray-600");
  });
  
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.remove("text-gray-600");
    activeLink.classList.add("bg-emerald-50", "text-emerald-700");
  }
  
  // Close sidebar
  document.getElementById("sidebar").style.transform = "translateX(-100%)";
  document.getElementById("sidebar-overlay").style.display = "none";
  
  switch (page) {
    case "meals":
      renderMealsPage();
      break;
    case "scanner":
      renderProductsPage();
      break;
    case "foodlog":
      renderFoodLogPage();
      break;
  }
}

// =================== EVENT LISTENERS ===================
function setupEventListeners() {
  // Sidebar toggle
  document.getElementById("header-menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").style.transform = "translateX(0)";
    document.getElementById("sidebar-overlay").style.display = "block";
  });
  
  document.getElementById("sidebar-close-btn").addEventListener("click", () => {
    document.getElementById("sidebar").style.transform = "translateX(-100%)";
    document.getElementById("sidebar-overlay").style.display = "none";
  });
  
  document.getElementById("sidebar-overlay").addEventListener("click", () => {
    document.getElementById("sidebar").style.transform = "translateX(-100%)";
    document.getElementById("sidebar-overlay").style.display = "none";
  });
  
  // Navigation links
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigate(page);
    });
  });
  
  // Back button
  document.getElementById("back-to-meals-btn").addEventListener("click", () => {
    navigate("meals");
  });
  
  // Food log clear button
  document.getElementById("clear-foodlog").addEventListener("click", () => {
    window.clearFoodLog();
  });
  
  // Search
  document.getElementById("search-input").addEventListener("keyup", async (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const query = e.target.value;
      showLoadingOverlay();
      try {
        const data = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`).then(r => r.json());
        currentMeals = data.meals ? data.meals.map(m => new Meal(m)) : [];
        renderMealsGrid();
        document.getElementById("recipes-count").textContent = `Showing ${currentMeals.length} recipes`;
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        hideLoadingOverlay();
      }
    }
  });
}

// =================== INIT ===================
async function init() {
  showLoadingOverlay();
  
  try {
    // Set sidebar styles
    document.getElementById("sidebar").style.transform = "translateX(0)";
    document.getElementById("sidebar-overlay").style.display = "none";
    
    setupEventListeners();
    navigate("meals");
    
  } catch (error) {
    console.error("Initialization error:", error);
  } finally {
    hideLoadingOverlay();
  }
}

// Start app
document.addEventListener("DOMContentLoaded", init);

