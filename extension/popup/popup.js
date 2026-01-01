const API_KEY = "AIzaSyAyJ9h60-ZKlLXoD061u5PJvcTddLK_958";

/* DOM */
const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const status = document.getElementById("status");

/* LOGIN */
loginBtn.onclick = async () => {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          returnSecureToken: true
        })
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data.error.message);

    chrome.runtime.sendMessage({
      type: "AUTH_LOGIN",
      payload: {
        uid: data.localId,
        token: data.idToken
      }
    });

    status.textContent = "✅ Logged in";
  } catch (e) {
    status.textContent = e.message;
  }
};

/* LOGOUT */
logoutBtn.onclick = () => {
  chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" });
  status.textContent = "Logged out";
};
