import { auth, db } from "../firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { ref, get, push, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// ==========================================
// 1. MODAL FUNCTIONS
// ==========================================

// Function para buksan ang Pop-up Modal at i-set ang default date to TODAY
export function openAddProductModal() {
  const modal = document.getElementById('addProductModal');
  const dateInput = document.getElementById('prodDate');

  if (modal) modal.style.display = 'flex';

  // Otomatikong ilagay ang petsa ngayong araw sa date picker
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// Function para isara ang Pop-up Modal at i-clear ang form
export function closeAddProductModal() {
  const modal = document.getElementById('addProductModal');
  const form = document.getElementById('addProductForm');
  if (modal) modal.style.display = 'none';
  if (form) form.reset();
}

// ==========================================
// 1. CUSTOM TOAST NOTIFICATION FUNCTION
// ==========================================
export function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  
  // Kung wala pa ang container sa HTML, kusa itong lilikhain
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' ? '✨' : '⚠️';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  // Trigger smooth enter animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Otomatikong mawawala pagkalipas ng 3.5 segundo
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 2. UPDATED SAVE FUNCTION (Gamit ang Toast)
// ==========================================
export async function handleProductSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('prodName');
  const priceInput = document.getElementById('prodPrice');
  const dateInput = document.getElementById('prodDate');

  const name = nameInput ? nameInput.value.trim() : '';
  const price = priceInput ? Number(priceInput.value) : 0;
  
  const today = new Date().toISOString().split('T')[0];
  const selectedDate = (dateInput && dateInput.value) ? dateInput.value : today;

  try {
    const productsRef = ref(db, 'products');
    const newProductRef = push(productsRef);

    await set(newProductRef, {
      productName: name,
      price: price,
      datePurchase: selectedDate,
      status: "Available",

      dateSold: null,
      sellingPrice: null,
      profit: null,
      expenses: null,
      johndel: null,
      geremie: null,
      clicky: null,
      buyerName: null,
      buyerFbLink: null,
      buyerContactNumber: null
    });

    // 🚀 SA HALIP NA ALERT, TOAST ANIMATION ANG LALABAS!
    showToast(`Product "${name}" saved successfully!`, 'success');

    closeAddProductModal();

  } catch (error) {
    console.error("Error saving product to Firebase:", error);
    showToast(`Failed to save: ${error.message}`, 'error');
  }
}

// Window scope binding
window.showToast = showToast;

// ==========================================
// 3. WINDOW SCOPE BINDING (Para sa HTML onclick/onsubmit)
// ==========================================
window.openAddProductModal = openAddProductModal;
window.closeAddProductModal = closeAddProductModal;
window.handleProductSubmit = handleProductSubmit;