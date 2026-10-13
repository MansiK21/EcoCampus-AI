// Import Firebase SDK functions via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your Firebase Web App configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxurq9VltGgSpIKj8SotXiQiQTy9R8Nf0",
  authDomain: "ecocampusai-3287.firebaseapp.com",
  databaseURL: "https://ecocampusai-3287-default-rtdb.firebaseio.com",
  projectId: "ecocampusai-3287",
  storageBucket: "ecocampusai-3287.firebasestorage.app",
  messagingSenderId: "605528730201",
  appId: "1:605528730201:web:98b25eb744a83f0404df48",
  measurementId: "G-XDKYLT959F"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Persist user data to Firestore under 'users/{uid}'
 */
async function saveUserToFirestore(user, role, extraData = {}) {
  const userRef = doc(db, "users", user.uid);
  
  const payload = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || extraData.displayName || "",
    role: role || extraData.role || "student",
    lastLoginAt: serverTimestamp(),
    ...extraData
  };

  // Merge creates the document or updates without overwriting untouched fields
  await setDoc(userRef, payload, { merge: true });
}

/**
 * Retrieve user's assigned role from Firestore
 */
async function getUserRole(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data().role;
    }
  } catch (err) {
    console.error("Error reading role from Firestore:", err);
  }
  return null;
}

// Listen to Auth changes and sync with script.js UI helpers
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const role = await getUserRole(user.uid);
    updateAuthUI(user, role);
  } else {
    updateAuthUI(null, null);
  }
});

// Handle Sign-Up & Sign-In Form Submissions
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mode = getAuthMode();
    const role = getSelectedRole();
    const email = document.getElementById("modalUserEmail").value.trim();
    const pass = document.getElementById("modalUserPass").value;
    const submitBtn = document.getElementById("modalSubmitBtn");

    clearAuthMessage();
    submitBtn.disabled = true;

    try {
      if (mode === "signup") {
        const pass2 = document.getElementById("modalUserPass2").value;
        const name = document.getElementById("modalUserName").value.trim();

        if (pass !== pass2) {
          showAuthMessage("Passwords do not match.", "error");
          submitBtn.disabled = false;
          return;
        }

        // 1. Create account in Firebase Authentication
        const cred = await createUserWithEmailAndPassword(auth, email, pass);

        // 2. Attach name to Auth profile
        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }

        // 3. Store record in Firestore
        await saveUserToFirestore(cred.user, role, {
          displayName: name,
          createdAt: serverTimestamp(),
          authProvider: "password"
        });

        showToast(`Account registered as ${roleLabels[role]}!`);
        closeAuthModal();
      } else {
        // 1. Authenticate with Firebase Authentication
        const cred = await signInWithEmailAndPassword(auth, email, pass);

        // 2. Update sign-in timestamp in Firestore
        await saveUserToFirestore(cred.user, role, {
          lastLoginAt: serverTimestamp()
        });

        showToast("Signed in successfully!");
        closeAuthModal();
      }
    } catch (err) {
      showAuthMessage(err.message.replace("Firebase: ", ""), "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Google Authentication
const googleBtn = document.getElementById("googleBtn");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      clearAuthMessage();
      const role = getSelectedRole();
      const result = await signInWithPopup(auth, googleProvider);

      // Save or update Google profile in Firestore
      await saveUserToFirestore(result.user, role, {
        createdAt: serverTimestamp(),
        authProvider: "google"
      });

      showToast("Signed in via Google!");
      closeAuthModal();
    } catch (err) {
      showAuthMessage(err.message.replace("Firebase: ", ""), "error");
    }
  });
}

// Password Reset Request
const forgotBtn = document.getElementById("forgotBtn");
if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("modalUserEmail").value.trim();
    if (!email) {
      showAuthMessage("Please enter your institutional email first.", "warn");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showAuthMessage("Password reset link sent to your email.", "info");
    } catch (err) {
      showAuthMessage(err.message.replace("Firebase: ", ""), "error");
    }
  });
}

// Sign-Out function wired into script.js handleAuthNavClick()
window.ecoSignOut = async () => {
  try {
    await signOut(auth);
    showToast("Signed out successfully.");
  } catch (err) {
    showToast("Error signing out.", "warn");
  }
};
