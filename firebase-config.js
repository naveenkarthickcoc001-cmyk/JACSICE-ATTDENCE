/* =====================================================
   SMART ATTENDANCE — Firebase Configuration
   Replace with your own Firebase project credentials.
   Get them from: https://console.firebase.google.com
   Project Settings → General → Your apps → Firebase SDK snippet
   ===================================================== */

// ⚠️ REPLACE THESE VALUES WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase will be initialized in app.js if not in demo mode
// This file is a placeholder — when DEMO_MODE = false in demo-data.js,
// uncomment the code below and install Firebase SDK:
//
//   <script type="module">
//     import { initializeApp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
//     import { getAuth } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";
//     import { getFirestore } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";
//     const app = initializeApp(firebaseConfig);
//     const auth = getAuth(app);
//     const db = getFirestore(app);
//   </script>
