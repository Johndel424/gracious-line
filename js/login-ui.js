// ==========================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCt1gXAwOE7P8a5YxyWnQzZDAvV0NYNW0",
  authDomain: "cengage-ticketing.firebaseapp.com",
  databaseURL: "https://cengage-ticketing-default-rtdb.firebaseio.com",
  projectId: "cengage-ticketing",
  storageBucket: "cengage-ticketing.firebasestorage.app",
  messagingSenderId: "1036801461486",
  appId: "1:1036801461486:web:36c90e8ddf6b155cca37ff"
};


// Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ==========================================================================
// 2. DOM ELEMENTS
// ==========================================================================
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('loginEmail');
const passwordInput = document.getElementById('loginPassword');
const btnSubmit = document.getElementById('btnLoginSubmit');
const btnSpinner = document.getElementById('btnLoginSpinner');
const btnText = document.getElementById('btnLoginText');
const offlineBar = document.getElementById('offlineBar');

// ==========================================================================
// 3. UI HELPER FUNCTIONS
// ==========================================================================

// Toggle Password Visibility
window.togglePasswordVisibility = function(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btnEl.textContent = '🙈';
  } else {
    input.type = 'password';
    btnEl.textContent = '👁️';
  }
};

// Set Loading State
function setLoading(isLoading) {
  if (isLoading) {
    btnSubmit.disabled = true;
    btnSpinner.style.display = 'inline-block';
    btnText.textContent = 'VERIFYING...';
  } else {
    btnSubmit.disabled = false;
    btnSpinner.style.display = 'none';
    btnText.textContent = 'SIGN IN TO SYSTEM';
  }
}

// Show Alert / Feedback Message
function showMessage(message) {
  alert(message);
}

// ==========================================================================
// 4. NETWORK & AUTH MONITORING
// ==========================================================================

// Network Connection Check
function checkNetworkStatus() {
  if (!navigator.onLine) {
    offlineBar.style.display = 'block';
    btnSubmit.disabled = true;
  } else {
    offlineBar.style.display = 'none';
    btnSubmit.disabled = false;
  }
}

window.addEventListener('online', checkNetworkStatus);
window.addEventListener('offline', checkNetworkStatus);
checkNetworkStatus();

// Check if user is already logged in (Session Persistence)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Active user session found:", user.uid);
    // Redirect to Main Dashboard
    // window.location.href = 'dashboard.html';
  }
});

// ==========================================================================
// 5. LOGIN FORM SUBMISSION LOGIC
// ==========================================================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please enter both email and password.");
    return;
  }

  setLoading(true);

  try {
    // A. Firebase Auth Sign-in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // B. Realtime Database User Validation
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();

      // Check if account is active
      if (userData.status === 'disabled') {
        showMessage("This account has been disabled. Please contact the administrator.");
        setLoading(false);
        return;
      }

      // Save user session locally
      localStorage.setItem('gl_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        role: userData.role || 'user',
        name: userData.name || 'User'
      }));

      // Successful Login Redirect
      window.location.href = 'dashboard.html';

    } else {
      // Fallback if no database profile entry exists
      localStorage.setItem('gl_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        role: 'user'
      }));
      
      window.location.href = '../overview/overview.html';
    }

  } catch (error) {
    console.error("Login Error:", error);
    setLoading(false);

    // Error Messages
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        showMessage("Invalid email or password.");
        break;
      case 'auth/too-many-requests':
        showMessage("Too many failed attempts. Please try again later.");
        break;
      default:
        showMessage("Authentication failed. Please try again.");
        break;
    }
  }
});

// Security: Disable Context Menu & Developer Shortcuts
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (
    e.keyCode === 123 || 
    (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || 
    (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83))
  ) {
    e.preventDefault();
  }
});
