// js/pages/foodLog.js

import { getFoodLog, clearFoodLog } from "../core/storage.js";

export function renderFoodLog() {
  const app = document.getElementById("app");
  const log = getFoodLog();

  let totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  };

  log.forEach(item => {
    totals.calories += item.calories;
    totals.protein += item.protein;
    totals.carbs += item.carbs;
    totals.fats += item.fats;
  });

  app.innerHTML = `
    <h2>Food Log</h2>

    <ul>
      ${log.map(i => `<li>${i.name} - ${i.calories} kcal</li>`).join("")}
    </ul>

    <h3>Totals</h3>
    <p>Calories: ${totals.calories}</p>
    <p>Protein: ${totals.protein}</p>
    <p>Carbs: ${totals.carbs}</p>
    <p>Fats: ${totals.fats}</p>

    <button id="clear">Clear Log</button>
  `;

  document.getElementById("clear").onclick = () => {
    clearFoodLog();
    renderFoodLog();
  };
}
