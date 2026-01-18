import { renderHome } from "../pages/home.js";
import { renderMealDetails } from "../pages/mealDetails.js";
import { renderFoodLog } from "../pages/foodLog.js";
import { renderScanner } from "../pages/scanner.js";

const routes = {
  "/": renderHome,
  "/home": renderHome,
  "/meal": renderMealDetails,
  "/foodlog": renderFoodLog,
  "/scanner": renderScanner,
};

export function router() {
  const path = window.location.pathname;
  const render = routes[path] || renderHome;
  render();
}

export function navigateTo(path) {
  history.pushState({}, "", path);
  router();
}

window.addEventListener("popstate", router);
