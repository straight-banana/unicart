import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "DOMAIN",
  projectId: "PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ADD_TO_CART") {
    if (!currentUser) {
      console.warn("User not logged in");
      return;
    }

    const ref = collection(db, "users", currentUser.uid, "cartItems");
    addDoc(ref, msg.payload)
      .then(() => console.log("Saved to user cart"))
      .catch(console.error);
  }
});
