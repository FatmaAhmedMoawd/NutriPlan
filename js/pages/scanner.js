import { searchProducts, getProductByBarcode } from "../core/api.js";
import Product from "../models/Product.js";
import { addToFoodLog } from "../core/storage.js";

export function renderScanner() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <h2>Product Scanner</h2>

    <input id="search" placeholder="Product name"/>
    <button id="searchBtn">Search</button>

    <input id="barcode" placeholder="Barcode"/>
    <button id="barcodeBtn">Scan</button>

    <div id="results"></div>
  `;

  document.getElementById("searchBtn").onclick = async () => {
    const q = document.getElementById("search").value;
    const data = await searchProducts(q);
    renderProducts(data.products);
  };

  document.getElementById("barcodeBtn").onclick = async () => {
    const code = document.getElementById("barcode").value;
    const data = await getProductByBarcode(code);
    renderProducts([data.product]);
  };
}

function renderProducts(products) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  products.forEach(p => {
    const product = new Product(p);

    const div = document.createElement("div");
    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>${product.calories} kcal</p>
      <button>Add</button>
    `;

    div.querySelector("button").onclick = () => {
      addToFoodLog(product.toFoodLog());
      alert("Product added ✅");
    };

    results.appendChild(div);
  });
}
