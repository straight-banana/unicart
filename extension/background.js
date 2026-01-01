/**
 * UniCart background (MV3 service worker)
 * - Auth via Firebase Auth REST (handled in popup)
 * - Firestore writes via Firestore REST
 * - No Firebase SDK
 */

const FIREBASE_PROJECT_ID = "unicart-c9cc2";

/**
 * Stored under chrome.storage.local key "auth" as:
 * { uid: string, idToken: string }
 */
let authState = {
  uid: null,
  idToken: null
};

function log(...args) {
  console.log("[UniCart]", ...args);
}

function warn(...args) {
  console.warn("[UniCart]", ...args);
}

function error(...args) {
  console.error("[UniCart]", ...args);
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

function storageRemove(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

async function restoreAuthFromStorage() {
  const res = await storageGet(["auth"]);
  const stored = res.auth;

  if (stored && typeof stored.uid === "string" && typeof stored.idToken === "string") {
    authState = { uid: stored.uid, idToken: stored.idToken };
    log("Auth restored", { uid: authState.uid });
  } else {
    authState = { uid: null, idToken: null };
    log("No auth in storage");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  restoreAuthFromStorage().catch((e) => error("restoreAuthFromStorage onInstalled failed", e));
});

chrome.runtime.onStartup.addListener(() => {
  restoreAuthFromStorage().catch((e) => error("restoreAuthFromStorage onStartup failed", e));
});

// Service worker can be started without onStartup firing (e.g., message wake). Restore immediately too.
restoreAuthFromStorage().catch((e) => error("restoreAuthFromStorage on load failed", e));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (!changes.auth) return;

  const next = changes.auth.newValue;
  if (next && typeof next.uid === "string" && typeof next.idToken === "string") {
    authState = { uid: next.uid, idToken: next.idToken };
    log("Auth updated from storage", { uid: authState.uid });
  } else {
    authState = { uid: null, idToken: null };
    log("Auth cleared from storage");
  }
});

function asString(value, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

async function writeCartItemToFirestore(item) {
  if (!authState.uid || !authState.idToken) {
    const message = "Not logged in";
    warn("Rejecting ADD_TO_CART:", message);
    return { ok: false, code: "NOT_LOGGED_IN", message };
  }

  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(
    authState.uid
  )}/cartItems`;

  const fields = {
    createdAt: { timestampValue: new Date().toISOString() },
    favorite: { booleanValue: false },
    name: { stringValue: asString(item?.name, "Unknown") },
    link: { stringValue: asString(item?.link, "") },
    image: { stringValue: asString(item?.image, "") },
    price: { stringValue: asString(item?.price, "") }
  };

  const requestBody = { fields };

  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authState.idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
  } catch (e) {
    error("Network error talking to Firestore", e);
    return { ok: false, code: "NETWORK_ERROR", message: String(e?.message || e) };
  }

  const text = await res.text();
  if (!res.ok) {
    error("Firestore write failed", {
      status: res.status,
      statusText: res.statusText,
      response: text
    });

    // If token is expired/invalid, Firestore returns 401/403; we keep auth as-is
    // (user can re-login via popup) but we surface a clear error.
    return { ok: false, code: "FIRESTORE_ERROR", message: text || res.statusText, status: res.status };
  }

  log("Firestore write OK", text ? JSON.parse(text) : {});
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || typeof msg.type !== "string") {
      sendResponse({ ok: false, code: "BAD_MESSAGE" });
      return;
    }

    if (msg.type === "AUTH_LOGIN") {
      const uid = msg?.payload?.uid;
      const idToken = msg?.payload?.idToken;
      if (typeof uid !== "string" || typeof idToken !== "string") {
        sendResponse({ ok: false, code: "BAD_AUTH_PAYLOAD" });
        return;
      }

      authState = { uid, idToken };
      await storageSet({ auth: authState });
      log("Logged in", { uid });
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "AUTH_LOGOUT") {
      authState = { uid: null, idToken: null };
      await storageRemove(["auth"]);
      log("Logged out");
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "ADD_TO_CART") {
      const result = await writeCartItemToFirestore(msg.payload);
      sendResponse(result);
      return;
    }

    sendResponse({ ok: false, code: "UNKNOWN_MESSAGE_TYPE" });
  })().catch((e) => {
    error("Unhandled background error", e);
    sendResponse({ ok: false, code: "UNHANDLED_ERROR", message: String(e?.message || e) });
  });

  // IMPORTANT: keep the service worker alive until sendResponse is called.
  return true;
});
