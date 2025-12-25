document.addEventListener("click", function (e) {
    const el = e.target;

    const text = (el.innerText || "").toLowerCase();
    const className = (el.className || "").toLowerCase();
    const id = (el.id || "").toLowerCase();

    if (
        text.includes("add to cart") ||
        text.includes("add to bag") ||
        className.includes("add-to-cart") ||
        id.includes("add-to-cart")
    ) {
        console.log("🛒 Add to Cart clicked");
        alert("Add to Cart detected!");
    }
});
