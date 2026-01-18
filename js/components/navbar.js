import { navigateTo } from "../core/router.js";

export function renderNavbar() {
  const nav = document.getElementById("navbar");

  nav.innerHTML = `
    <button data-link="/home">Home</button>
    <button data-link="/foodlog">Food Log</button>
    <button data-link="/scanner">Scanner</button>
  `;

  nav.addEventListener("click", (e) => {
    if (e.target.dataset.link) {
      navigateTo(e.target.dataset.link);
    }
  });
}
