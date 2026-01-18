import { getMeals } from "../core/api.js";
import Meal from "../models/Meal.js";
import { navigateTo } from "../core/router.js";

export async function renderHome() {
  const app = document.getElementById("app");
  app.innerHTML = "<h2>Meals</h2><div id='meals'></div>";

  const data = await getMeals();
  const meals = data.meals.map(m => new Meal(m));

  const container = document.getElementById("meals");

  meals.forEach(meal => {
    const div = document.createElement("div");
    div.innerHTML = `
      <img src="${meal.image}" width="150"/>
      <h4>${meal.name}</h4>
    `;
    div.onclick = () => {
      sessionStorage.setItem("mealId", meal.id);
      navigateTo("/meal");
    };
    container.appendChild(div);
  });
}
