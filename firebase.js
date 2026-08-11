import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// 🔥 Firebase Config (dito lahat)
const firebaseConfig = {
  apiKey: "AIzaSyBCt1gXAwOE7P8a5YxyWnQzZDAvV0NYNW0",
  authDomain: "cengage-ticketing.firebaseapp.com",
  databaseURL: "https://cengage-ticketing-default-rtdb.firebaseio.com",
  projectId: "cengage-ticketing",
  storageBucket: "cengage-ticketing.firebasestorage.app",
  messagingSenderId: "1036801461486",
  appId: "1:1036801461486:web:36c90e8ddf6b155cca37ff"
};

// 🔥 Init App
const app = initializeApp(firebaseConfig);

// 🔥 Export services
export const auth = getAuth(app);
export const db = getDatabase(app);

