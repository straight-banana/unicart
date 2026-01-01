You are fixing a Chrome Extension (Manifest v3) called “UniCart”.

Current situation:
- Content script already detects “Add to Cart” clicks and sends product data.
- Toast notification works.
- Manifest v3 is used.
- Firebase Firestore is used with rules:
  users/{uid}/cartItems/{itemId} requires request.auth.uid == uid.
- No products are being written to Firestore.
- Firebase CDN scripts are blocked due to extension CSP.
- There is NO serverless function and we do NOT want one.
- Auto-auth sync from website is intentionally NOT used.

What MUST be done:
1. Implement authentication INSIDE the extension using Firebase Auth REST API (signInWithPassword).
2. Login/logout UI must live in popup.html + popup.js.
3. Firebase SDK must NOT be used anywhere (no CDN, no npm bundle).
4. After login, store { uid, idToken } in chrome.storage.local.
5. background.js must:
   - Restore auth from chrome.storage on startup
   - Reject Add-to-Cart events if user is not logged in
   - Write products to Firestore using Firestore REST API
6. Firestore write path must be:
   users/{uid}/cartItems (subcollection)
7. Add createdAt timestamp, favorite=false, name, link, image, price.
8. manifest.json must include correct permissions and host_permissions.
9. Use clean logging in background.js so failures are visible.
10. Do NOT introduce Cloud Functions, OAuth redirects, or auto website auth.

Deliverables required:
- Full manifest.json
- Full background.js (MV3 compatible)
- popup.html
- popup.js (REST auth only)
- Clear explanation of how auth + Firestore write works in this setup

Constraints:
- Chrome Extension CSP must not be violated
- Manifest v3 service worker only
- No server backend
- No Firebase SDK

Fix everything so:
- User logs in via popup
- Add to Cart writes to Firestore
- Items appear under users/{uid}/cartItems
