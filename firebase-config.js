/* =====================================================
   SMART ATTENDANCE — Firebase Configuration (Modular SDK v10+)
   Replace with your own Firebase project credentials.
   Get them from: https://console.firebase.google.com
   Project Settings → General → Your apps → Firebase SDK snippet
   ===================================================== */

import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  validatePassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── Your Firebase project config ────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDd_iEvnz2kpzx9rnFRdTu95fNkb7Bc73s",
  authDomain:        "smart-attendance-ad81d.firebaseapp.com",
  projectId:         "smart-attendance-ad81d",
  storageBucket:     "smart-attendance-ad81d.firebasestorage.app",
  messagingSenderId: "899705558435",
  appId:             "1:899705558435:web:c1ae6a5c82f0988c98b616",
  measurementId:     "G-46PJNG2PJT"
};

// ── Initialize Firebase ──────────────────────────────
const firebaseApp = initializeApp(firebaseConfig);
const analytics   = getAnalytics(firebaseApp);
const auth        = getAuth(firebaseApp);

// ── Email-Link (passwordless) settings ──────────────
// ⚠️  Update this URL to wherever login.html is hosted.
const emailLinkActionCodeSettings = {
  url: window.location.origin + "/login.html",  // redirect back here after click
  handleCodeInApp: true                         // must be true for email-link sign-in
};

// ══════════════════════════════════════════════════════
//  AUTH HELPERS — call these from login.html / app.js
// ══════════════════════════════════════════════════════

/**
 * REGISTER — Create a new user with email + password,
 * then immediately send a verification email.
 * @param {string} email
 * @param {string} password
 * @param {string} [displayName]  Optional name stored in Firebase profile
 * @returns {Promise<import("firebase/auth").UserCredential>}
 */
async function firebaseRegister(email, password, displayName = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // Set display name on the Firebase profile
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  // Send verification email immediately after account creation
  await sendEmailVerification(userCredential.user, {
    url: window.location.origin + '/login.html',
    handleCodeInApp: false
  });
  return userCredential;
}

/**
 * SIGN IN — Email + Password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>}
 */
async function firebaseSignIn(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential;
}

/**
 * SIGN OUT — clears the Firebase session.
 * @returns {Promise<void>}
 */
async function firebaseSignOut() {
  await signOut(auth);
}

/**
 * VALIDATE PASSWORD — checks against your Firebase password policy.
 * Enable the policy first in Firebase Console → Authentication → Settings → Password policy.
 * @param {string} password  Raw password typed by the user
 * @returns {Promise<{isValid,needsLowerCase,needsUpperCase,needsNumeric,needsNonAlphanumeric,meetsMinLength}>}
 */
async function firebaseValidatePassword(password) {
  const status = await validatePassword(auth, password);
  return {
    isValid:              status.isValid,
    needsLowerCase:       status.containsLowercaseLetter         !== true,
    needsUpperCase:       status.containsUppercaseLetter         !== true,
    needsNumeric:         status.containsNumericCharacter        !== true,
    needsNonAlphanumeric: status.containsNonAlphanumericCharacter !== true,
    meetsMinLength:       status.meetsMinPasswordLength          !== false
  };
}

/**
 * SEND EMAIL SIGN-IN LINK (passwordless).
 * Saves the email to localStorage so we can retrieve it after the redirect.
 * @param {string} email
 * @returns {Promise<void>}
 */
async function firebaseSendEmailLink(email) {
  await sendSignInLinkToEmail(auth, email, emailLinkActionCodeSettings);
  localStorage.setItem("sa_emailForSignIn", email);
}

/**
 * COMPLETE EMAIL LINK SIGN-IN.
 * Call on page load to finish the flow when Firebase redirects back with the magic link.
 * @returns {Promise<UserCredential|null>}
 */
async function firebaseCompleteEmailLinkSignIn() {
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;

  let email = localStorage.getItem("sa_emailForSignIn");
  if (!email) {
    // User may have opened the link on a different device
    email = window.prompt("Please confirm your email to complete sign-in:");
  }
  if (!email) return null;

  const userCredential = await signInWithEmailLink(auth, email, window.location.href);
  localStorage.removeItem("sa_emailForSignIn");                         // clean up
  window.history.replaceState({}, document.title, window.location.pathname); // strip token
  return userCredential;
}

/**
 * RESEND VERIFICATION EMAIL — for users who haven't verified yet.
 * @returns {Promise<void>}
 */
async function firebaseResendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  if (user.emailVerified) throw new Error('Email already verified');
  await sendEmailVerification(user, {
    url: window.location.origin + '/login.html',
    handleCodeInApp: false
  });
}

/**
 * FORGOT PASSWORD — sends a password-reset email via Firebase.
 * @param {string} email
 * @returns {Promise<void>}
 */
async function firebaseForgotPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * AUTH STATE OBSERVER — fires whenever the user signs in or out.
 * @param {function(User|null):void} callback
 */
function onFirebaseAuthStateChanged(callback) {
  onAuthStateChanged(auth, callback);
}

// ── Export helpers ───────────────────────────────────
export {
  auth,
  firebaseRegister,
  firebaseSignIn,
  firebaseSignOut,
  firebaseValidatePassword,
  firebaseSendEmailLink,
  firebaseCompleteEmailLinkSignIn,
  firebaseResendVerificationEmail,
  firebaseForgotPassword,
  onFirebaseAuthStateChanged
};

const emailInput = document.getElementById("email");
const sendLinkBtn = document.getElementById("sendLinkBtn");
const message = document.getElementById("message");

sendLinkBtn.addEventListener("click", async () => {

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        message.textContent = "Please enter your email address.";
        return;
    }

    if (!email.includes("@")) {
        message.textContent = "Please enter a valid email address.";
        return;
    }

    try {

        const actionCodeSettings = {
            url: "https://yourwebsite.com/login",
            handleCodeInApp: true
        };

        await sendSignInLinkToEmail(
            auth,
            email,
            actionCodeSettings
        );

        // Save email locally
        localStorage.setItem(
            "emailForSignIn",
            email
        );

        message.textContent =
            "Login link sent! Check your email.";

    } catch (error) {

        console.error(error);

        message.textContent =
            "Unable to send login link. Please try again.";
    }
});
if (email === "abc@gmail.com") {
    // account exists
}