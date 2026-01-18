// Utility functions for NutriPlan

export function formatDate(date = new Date()) {
  const options = { weekday: "long", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

export function getFoodLogStorageKey(date = new Date()) {
  return `nutriplan-log-${date.toISOString().split("T")[0]}`;
}

export function calculateNutritionTotals(foodLog) {
  return foodLog.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein: acc.protein + (item.protein || 0),
    carbs: acc.carbs + (item.carbs || 0),
    fats: acc.fats + (item.fats || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

export function getProgressPercentage(current, limit) {
  return Math.min(100, (current / limit) * 100);
}

export function formatNutritionValue(value) {
  return Math.round(value * 10) / 10;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function showNotification(title, message, type = "success") {
  if (typeof Swal !== "undefined") {
    Swal.fire(title, message, type);
  } else {
    console.log(`${type}: ${title} - ${message}`);
  }
}

export function hideElement(element) {
  if (element) {
    element.style.display = "none";
  }
}

export function showElement(element, display = "block") {
  if (element) {
    element.style.display = display;
  }
}

export function toggleElement(element) {
  if (element) {
    element.style.display = element.style.display === "none" ? "block" : "none";
  }
}

export function getURLParam(param) {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

export function setURLParam(param, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(param, value);
  window.history.replaceState({}, "", `?${params.toString()}`);
}
