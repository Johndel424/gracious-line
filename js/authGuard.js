import { auth } from "../firebase.js"; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// 1. HARD SECURITY: ITAGO AGAD ANG BODY
const hideStyle = document.createElement("style");
hideStyle.id = "authGuardHideStyle";
hideStyle.innerHTML = "body { display: none !important; }";
document.head.appendChild(hideStyle);

// 2. ISASAKSAK ANG MODAL UI SA DULO NG <body>
(function injectAuthModalUI() {
  const modalHTML = `
    <div id="authCheckModal" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(6px); z-index: 99999; align-items: center; justify-content: center; padding: 15px;">
    </div>
  `;

  if (document.body) {
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    attachBtnListener();
    checkFastAccess(); // I-check agad kung may local session
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      attachBtnListener();
      checkFastAccess(); // I-check agad kung may local session
    });
  }
})();

function attachBtnListener() {
  const btn = document.getElementById("btnAuthRedirect");
  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }
}

// 3. FAST ACCESS: Kung nakita ng browser na naka-login ka na dati, alisin agad ang tago
function checkFastAccess() {
  if (localStorage.getItem("isLoggedIn") === "true") {
    const styleTag = document.getElementById("authGuardHideStyle");
    if (styleTag) styleTag.remove();
    document.body.style.display = "block";
  }
}

// 4. FIREBASE BACKGROUND VERIFICATION (Ang totoong source of truth)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 🟢 TOTOONG NAKA-LOGIN: I-refresh ang local storage para sigurado
    localStorage.setItem("isLoggedIn", "true");
    
    // Alisin ang tago (kung sakaling hindi nakuha ng fast access)
    const styleTag = document.getElementById("authGuardHideStyle");
    if (styleTag) styleTag.remove();
    document.body.style.display = "block";

  } else {
    // 🔴 TOTOONG HINDI NAKA-LOGIN (o na-expire na)
    localStorage.removeItem("isLoggedIn");
    
    const modal = document.getElementById("authCheckModal");
    if (modal) {
      modal.style.display = "flex";
      document.body.style.display = "block";
    }

    setTimeout(() => {
      window.location.href = "../index.html";
    }, 2000);
  }
});

// 5. SECURITY: DISABLE RIGHT CLICK & INSPECT ELEMENT
// document.addEventListener('contextmenu', e => e.preventDefault());
// document.addEventListener('keydown', function (e) {
//   if (
//     e.keyCode === 123 || 
//     (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || 
//     (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83))
//   ) {
//     e.preventDefault();
//     return false;
//   }
// });