const API_KEY = "AIzaSyAyJ9h60-ZKlLXoD061u5PJvcTddLK_958";

/* DOM */
const loggedOutView = document.getElementById("loggedOutView");
const loggedInView = document.getElementById("loggedInView");
const uidEl = document.getElementById("uid");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text;
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

function setLoggedOutUI() {
  loggedOutView.style.display = "block";
  loggedInView.style.display = "none";
  uidEl.textContent = "";
}

function setLoggedInUI(uid) {
  loggedOutView.style.display = "none";
  loggedInView.style.display = "block";
  uidEl.textContent = uid;
}

async function restoreUIFromStorage() {
  const res = await storageGet(["auth"]);
  const auth = res.auth;
  if (auth && typeof auth.uid === "string" && typeof auth.idToken === "string") {
    setLoggedInUI(auth.uid);
    setStatus("✅ Logged in");
  } else {
    setLoggedOutUI();
    setStatus("Not logged in");
  }
}

async function signInWithPassword(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || res.statusText || "Login failed";
    throw new Error(message);
  }

  return {
    uid: data.localId,
    idToken: data.idToken
  };
}

loginBtn.addEventListener("click", async () => {
  const email = (emailEl.value || "").trim();
  const password = passwordEl.value || "";

  if (!email || !password) {
    setStatus("Email + password required");
    return;
  }

  setStatus("Logging in...");

  try {
    const auth = await signInWithPassword(email, password);

    // Requirement: store { uid, idToken } in chrome.storage.local
    await storageSet({ auth });

    // Let background sync immediately (it also restores from storage on wake).
    chrome.runtime.sendMessage({ type: "AUTH_LOGIN", payload: auth });

    setLoggedInUI(auth.uid);
    setStatus("✅ Logged in");
  } catch (e) {
    setStatus(String(e?.message || e));
  }
});

logoutBtn.addEventListener("click", async () => {
  await storageRemove(["auth"]);
  chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" });
  setLoggedOutUI();
  setStatus("Logged out");
});

restoreUIFromStorage().catch((e) => setStatus(String(e?.message || e)));
