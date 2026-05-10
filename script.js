if (window.SITE) {
  document.querySelectorAll("[data-site]").forEach((el) => {
    const value = window.SITE[el.dataset.site];
    if (value !== undefined) el.textContent = value;
  });

  document.querySelectorAll("[data-site-mailto]").forEach((el) => {
    const value = window.SITE[el.dataset.siteMailto];
    if (value !== undefined) el.setAttribute("href", `mailto:${value}`);
  });
}

const menuToggleButton = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

const setMenuState = (isOpen) => {
  if (!menuToggleButton || !mobileMenu) return;
  mobileMenu.classList.toggle("is-open", isOpen);
  menuToggleButton.setAttribute("aria-expanded", String(isOpen));
  menuToggleButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
};

if (menuToggleButton && mobileMenu) {
  menuToggleButton.addEventListener("click", () => {
    const isOpen = !mobileMenu.classList.contains("is-open");
    setMenuState(isOpen);
  });

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      setMenuState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileMenu.classList.contains("is-open")) {
      setMenuState(false);
      menuToggleButton.focus();
    }
  });
}
