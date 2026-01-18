import { getMealDetails, getNutrition } from "../core/api.js";
import Meal from "../models/Meal.js";
import { addToFoodLog } from "../core/storage.js";

export async function renderMealDetails() {
  const app = document.getElementById("app");
  const mealId = sessionStorage.getItem("mealId");

  const data = await getMealDetails(mealId);
  const meal = new Meal(data.meal);

  // Nutrition
  const nutrition = await getNutrition(meal.name);
  meal.calories = nutrition.calories || 0;
  meal.protein = nutrition.protein || 0;
  meal.carbs = nutrition.carbs || 0;
  meal.fats = nutrition.fats || 0;

  app.innerHTML = `
    <h2>${meal.name}</h2>
    <img src="${meal.image}" width="250"/>
    <p>${meal.instructions}</p>

    <h4>Ingredients</h4>
    <ul>
      ${meal.ingredients.map((i) => `<li>${i}</li>`).join("")}
    </ul>

    <button id="logMeal">Log This Meal</button>
  `;

  document.getElementById("logMeal").onclick = () => {
    addToFoodLog(meal.toFoodLog());
    alert("Meal added to Food Log ✅");
  };
}
