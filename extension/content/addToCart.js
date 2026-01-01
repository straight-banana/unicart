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

function normalizeWhitespace(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function parsePriceCandidate(raw) {
  const text = normalizeWhitespace(raw);
  if (!text) return null;

  // Common patterns:
  // $1,299.99 | ₹1,23,456 | 1.299,99 € | AED 1,299.00
  const currencyMatch = text.match(/(?:\b([A-Z]{3})\b)|([$€£₹¥₩₺₫₽])/);
  const currency = currencyMatch ? (currencyMatch[1] || currencyMatch[2] || "") : "";

  // Find a number-like token (allow thousand separators and decimals)
  const numberMatch = text.match(/(\d{1,3}(?:[\s,\.']\d{3})*(?:[\.,]\d{2})?|\d+(?:[\.,]\d{2})?)/);
  if (!numberMatch) return null;

  let num = numberMatch[1];
  num = num.replace(/\s/g, "").replace(/'/g, "");

  // Decide decimal separator:
  // If both '.' and ',' exist, assume last separator is decimal.
  const lastDot = num.lastIndexOf('.');
  const lastComma = num.lastIndexOf(',');
  let decimalSep = null;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalSep = lastDot > lastComma ? '.' : ',';
  } else if (lastComma !== -1) {
    // If comma has 2 trailing digits, treat as decimal, else thousands.
    decimalSep = /,\d{2}$/.test(num) ? ',' : null;
  } else if (lastDot !== -1) {
    decimalSep = /\.\d{2}$/.test(num) ? '.' : null;
  }

  let normalized = num;
  if (decimalSep === ',') {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else if (decimalSep === '.') {
    normalized = normalized.replace(/,/g, "");
  } else {
    // No clear decimal separator; remove all grouping separators.
    normalized = normalized.replace(/[\.,]/g, "");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // Keep original currency if we detected it; otherwise return amount only.
  const formattedAmount = decimalSep ? amount.toFixed(2) : String(amount);
  return {
    currency,
    amount,
    display: currency ? `${currency} ${formattedAmount}` : formattedAmount
  };
}

function getMetaContent(selector) {
  const el = document.querySelector(selector);
  return el ? el.getAttribute("content") : "";
}

function getPriceFromMeta() {
  const amount =
    getMetaContent('meta[property="product:price:amount"]') ||
    getMetaContent('meta[property="og:price:amount"]') ||
    getMetaContent('meta[name="product:price:amount"]') ||
    getMetaContent('meta[itemprop="price"]');

  const currency =
    getMetaContent('meta[property="product:price:currency"]') ||
    getMetaContent('meta[property="og:price:currency"]') ||
    getMetaContent('meta[name="product:price:currency"]') ||
    getMetaContent('meta[itemprop="priceCurrency"]');

  if (!amount) return null;
  const parsed = parsePriceCandidate(`${currency} ${amount}`);
  return parsed;
}

function findPriceInJsonLdObject(obj) {
  if (!obj || typeof obj !== "object") return null;

  // Common schema forms: { offers: { price, priceCurrency } } or arrays.
  const offers = obj.offers;
  if (offers) {
    const offerArray = Array.isArray(offers) ? offers : [offers];
    for (const offer of offerArray) {
      const price = offer?.price;
      const currency = offer?.priceCurrency;
      const parsed = parsePriceCandidate(`${currency || ""} ${price || ""}`);
      if (parsed) return parsed;
    }
  }

  // Recurse into nested objects/arrays (lightweight)
  for (const v of Object.values(obj)) {
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const x of v) {
        const parsed = findPriceInJsonLdObject(x);
        if (parsed) return parsed;
      }
    } else if (typeof v === "object") {
      const parsed = findPriceInJsonLdObject(v);
      if (parsed) return parsed;
    }
  }

  return null;
}

function getPriceFromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const raw = script.textContent;
    if (!raw) continue;
    try {
      const json = JSON.parse(raw);
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        const parsed = findPriceInJsonLdObject(node);
        if (parsed) return parsed;
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return null;
}

function isProbablyVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 20 || rect.height < 10) return false;
  if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) return false;
  return true;
}

function getPriceFromDom() {
  const selectors = [
    "[itemprop='price']",
    "[data-testid*='price']",
    "[class*='price']",
    "[id*='price']",
    "[class*='ProductPrice']",
    "[class*='product-price']",
    "[class*='sale-price']"
  ];

  const seen = new Set();
  const maxChecks = 80;
  let checks = 0;

  for (const sel of selectors) {
    const nodes = document.querySelectorAll(sel);
    for (const el of nodes) {
      if (checks++ > maxChecks) return null;
      if (!isProbablyVisible(el)) continue;
      const text = normalizeWhitespace(el.getAttribute("content") || el.textContent);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      const parsed = parsePriceCandidate(text);
      if (parsed) return parsed;
    }
  }

  return null;
}

function getPrice() {
  // Best signals first
  const fromMeta = getPriceFromMeta();
  if (fromMeta) return fromMeta.display;

  const fromJsonLd = getPriceFromJsonLd();
  if (fromJsonLd) return fromJsonLd.display;

  const fromDom = getPriceFromDom();
  if (fromDom) return fromDom.display;

  // Fallback: scan a limited slice of body text
  const bodyText = normalizeWhitespace(document.body?.innerText || "").slice(0, 8000);
  const fallbackMatch = bodyText.match(/(?:\b[A-Z]{3}\b|[$€£₹¥₩₺₫₽])\s*\d{1,3}(?:[\s,\.']\d{3})*(?:[\.,]\d{2})?/);
  if (fallbackMatch) {
    const parsed = parsePriceCandidate(fallbackMatch[0]);
    return parsed ? parsed.display : "";
  }

  return "";
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

function showErrorToast(message) {
  const toast = document.createElement("div");
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #111827;
    color: white;
    padding: 12px 16px;
    border-radius: 12px;
    font-weight: bold;
    z-index: 999999;
  `;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
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

  chrome.runtime.sendMessage(
    {
      type: "ADD_TO_CART",
      payload: product
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn("UniCart message error:", chrome.runtime.lastError.message);
        return;
      }

      if (!response?.ok) {
        console.warn("UniCart write failed:", response);
        if (response?.code === "NOT_LOGGED_IN") {
          showErrorToast("🔒 UniCart: Please log in via extension popup");
        } else {
          showErrorToast("⚠️ UniCart: Save failed (check extension logs)");
        }
      }
    }
  );
});
