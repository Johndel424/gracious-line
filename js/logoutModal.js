import { auth } from "../firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// 1. DULO NG <body>
(function injectLogoutModalUI() {
  const modalHTML = `
    <div id="logoutModal" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 15px;">
      <div style="background: #1e1e1e; border: 1px solid rgba(226, 178, 88, 0.4); border-radius: 12px; padding: 20px; width: 100%; max-width: 280px; text-align: center; color: #fff; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.7); animation: logoutModalFadeIn 0.2s ease-out;">
        
        <div style="width: 42px; height: 42px; background: rgba(226, 178, 88, 0.15); border: 1px solid #e2b258; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #e2b258; font-size: 1.2rem; font-weight: bold;">
          🚪
        </div>

        <h3 style="margin: 0 0 6px 0; font-size: 0.95rem; color: #e2b258; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">LOGOUT CONFIRMATION</h3>
        <p style="margin: 0 0 16px 0; font-size: 0.72rem; color: #ccc; line-height: 1.4;">
          Are you sure you want to log out of your account?
        </p>

        <div style="display: flex; gap: 8px;">
          <button id="btnCancelLogout" style="flex: 1; padding: 8px; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-weight: 600; font-size: 0.72rem; cursor: pointer;">
            CANCEL
          </button>
          <button id="btnConfirmLogout" style="flex: 1; padding: 8px; background: #ef4444; border: none; border-radius: 4px; color: #fff; font-weight: bold; font-size: 0.72rem; cursor: pointer;">
            LOGOUT
          </button>
        </div>

      </div>
    </div>

    <style>
      @keyframes logoutModalFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    </style>
  `;

  if (document.body) {
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    attachEventListeners();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      attachEventListeners();
    });
  }
})();

// 2. MGA EVENT LISTENERS PARA SA BUTTONS
function attachEventListeners() {
  const cancelBtn = document.getElementById("btnCancelLogout");
  const confirmBtn = document.getElementById("btnConfirmLogout");

  if (cancelBtn) cancelBtn.addEventListener("click", closeLogoutModal);
  if (confirmBtn) confirmBtn.addEventListener("click", executeLogout);
}

// 3. EXPORTED / GLOBAL FUNCTIONS
export function openLogoutModal() {
  const modal = document.getElementById("logoutModal");
  if (modal) modal.style.display = "flex";
}

export function closeLogoutModal() {
  const modal = document.getElementById("logoutModal");
  if (modal) modal.style.display = "none";
}

async function executeLogout() {
  const btn = document.getElementById("btnConfirmLogout");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "LOGGING OUT...";
  }

  try {
    // 🔥 LINISIN ANG LAHAT NG SESSION FLAGS PARA HINDI MAG-AUTO LOGIN ULIT
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    sessionStorage.clear();

    // Firebase SignOut
    await signOut(auth);
  } catch (error) {
    console.warn("⚠️ Firebase SignOut Notice:", error);
  } finally {
    // 🔥 REDIRECT DIREKTA SA LOGIN PAGE
    window.location.href = "../index.html";
  }
}

// Ginagawang available sa window scope para sa mga inline onclick="..."
window.logout = openLogoutModal;
window.closeLogoutModal = closeLogoutModal;