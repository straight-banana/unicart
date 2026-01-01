// ================= HELPER FUNCTIONS =================
function looksLikeAddToCart(text) {
  if (!text) return false;
  text = text.toLowerCase();
  return (
    text.includes("add to cart") ||
    text.includes("add to bag") ||
    text.includes("buy now") ||
    text.includes("add") 
  );
}

function getBestImage() {
  const imgs = [...document.images]
    .filter(img => img.width > 100 && img.height > 100);

  return imgs.length ? imgs[0].src : "";
}

function getPrice() {
  const priceRegex = /([$€£₹]\s?\d+(?:[\.,]\d+)?)/;
  const bodyText = document.body.innerText;
  const match = bodyText.match(priceRegex);
  return match ? match[1] : "";
}

function showToast() {
  const toast = document.createElement("div");
  toast.innerText = "🛒 Add to cart detected";
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #7c3aed;
    color: white;
    padding: 12px 16px;
    border-radius: 12px;
    font-weight: bold;
    z-index: 999999;
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}

// ================= CLICK LISTENER =================
document.addEventListener("click", (e) => {
  const el = e.target.closest("button, a, input");

  if (!el) return;

  const text =
    el.innerText ||
    el.value ||
    el.getAttribute("aria-label");

  if (!looksLikeAddToCart(text)) return;

  const product = {
    name: document.title,
    link: window.location.href,
    image: getBestImage(),
    price: getPrice(),
    favorite: false,
    createdAt: Date.now()
  };

  showToast();

  chrome.runtime.sendMessage({
    type: "ADD_TO_CART",
    payload: product
  });
});
