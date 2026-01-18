export default class Product {
  constructor(data) {
    this.name = data.product_name || "Unknown Product";
    this.image = data.image_url || "";
    this.calories = data.nutriments?.energy_kcal || 0;
    this.protein = data.nutriments?.proteins || 0;
    this.carbs = data.nutriments?.carbohydrates || 0;
    this.fats = data.nutriments?.fat || 0;
  }

  toFoodLog() {
    return {
      name: this.name,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fats: this.fats,
      date: new Date().toISOString(),
      type: "product",
    };
  }
}
