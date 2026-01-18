export default class Meal {
  constructor(data) {
    this.id = data.idMeal;
    this.name = data.strMeal;
    this.image = data.strMealThumb;
    this.instructions = data.strInstructions || "";
    this.youtube = data.strYoutube || "";
    this.category = data.strCategory || "";
    this.area = data.strArea || "";
    this.ingredients = this.extractIngredients(data);

    // Nutrition (will be filled later from API)
    this.calories = data.calories || 0;
    this.protein = data.protein || 0;
    this.carbs = data.carbs || 0;
    this.fats = data.fats || 0;
  }

  extractIngredients(data) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = data[`strIngredient${i}`];
      const measure = data[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        ingredients.push(`${measure} ${ingredient}`.trim());
      }
    }
    return ingredients;
  }

  toFoodLog() {
    return {
      id: this.id,
      name: this.name,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fats: this.fats,
      date: new Date().toISOString(),
      type: "meal",
    };
  }
}
