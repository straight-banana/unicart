document.addEventListener("click", (e) => {
  const el = e.target.closest("button, a, input");
  if (!el) return;

  const text = el.innerText?.toLowerCase() || "";
  if (!text.includes("add to cart")) return;

  const product = {
    link: location.href,
    image: document.querySelector("img")?.src || "",
    price: document.body.innerText.match(/(৳|\$)\s?\d+/)?.[0] || "N/A",
    createdAt: Date.now()
  };

  chrome.runtime.sendMessage({
    type: "ADD_TO_CART",
    payload: product
  });

  alert("🛒 Add to cart detected!");
});
