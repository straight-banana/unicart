/* ========= AUTH STATE ========= */

let authState = {
  uid: null,
  token: null
};

/* ========= LOAD AUTH FROM STORAGE ========= */
chrome.storage.local.get(["authState"], (res) => {
  if (res.authState) {
    authState = res.authState;
    console.log("🔁 Auth restored:", authState.uid);
  }
});

/* ========= MESSAGE HANDLER ========= */
chrome.runtime.onMessage.addListener(async (msg, sender) => {

  /* ---- LOGIN ---- */
  if (msg.type === "AUTH_LOGIN") {
    authState = msg.payload;

    chrome.storage.local.set({ authState });

    console.log("✅ Logged in:", authState.uid);
    return;
  }

  /* ---- LOGOUT ---- */
  if (msg.type === "AUTH_LOGOUT") {
    authState = { uid: null, token: null };

    chrome.storage.local.remove("authState");

    console.log("👋 Logged out");
    return;
  }

  /* ---- ADD TO CART ---- */
  if (msg.type === "ADD_TO_CART") {

    if (!authState.uid || !authState.token) {
      console.warn("❌ Add to Cart ignored (not logged in)");
      return;
    }

    const item = msg.payload;

    const endpoint =
      `https://firestore.googleapis.com/v1/projects/unicart-c9cc2/databases/(default)/documents/users/${authState.uid}/cartItems`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authState.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            name: { stringValue: item.name || "Unknown" },
            link: { stringValue: item.link },
            image: { stringValue: item.image || "" },
            price: { doubleValue: Number(item.price) || 0 },
            favorite: { booleanValue: false },
            createdAt: { timestampValue: new Date().toISOString() }
          }
        })
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("🔥 Firestore error:", err);
        return;
      }

      console.log("✅ Product saved to Firestore");

    } catch (e) {
      console.error("🔥 Network error:", e);
    }
  }
});
