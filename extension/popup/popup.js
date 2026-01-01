import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "DOMAIN",
  projectId: "PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authBox = document.getElementById("auth");
const appBox = document.getElementById("app");
const cart = document.getElementById("cart");

document.getElementById("login").onclick = async () => {
  const email = email.value;
  const password = password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch(e) { alert(e.message); }
};

document.getElementById("logout").onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    authBox.style.display = "block";
    appBox.style.display = "none";
    return;
  }

  authBox.style.display = "none";
  appBox.style.display = "block";
  cart.innerHTML = "";

  const ref = collection(db, "users", user.uid, "cartItems");
  const snap = await getDocs(ref);

  snap.forEach(d => {
    const p = d.data();
    cart.innerHTML += `
      <tr>
        <td><img src="${p.image}"></td>
        <td>${p.price}</td>
        <td><a href="${p.link}" target="_blank">Open</a></td>
      </tr>
    `;
  });
});
