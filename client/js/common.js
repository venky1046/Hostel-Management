// ==========================================================
// Shared helpers used by every page
// (dashboard.js, students.js, rooms.js, fees.js, etc.)
// ==========================================================

// ==========================================================
// BACKEND API URL
// ==========================================================
// Local development and deployed Vercel frontend both use
// the deployed Render backend.

const API_BASE = "https://hostel-management-backend-4nlg.onrender.com/api";

// ==========================================================
// API FETCH WRAPPER
// ==========================================================

async function api(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = null;

    try {
      data = await res.json();
    } catch (_) {
      // Response has no JSON body
    }

    if (!res.ok) {
      throw new Error(
        (data && data.message) || `Request failed (${res.status})`,
      );
    }

    return data;
  } catch (error) {
    // Give a clear error message for network/API problems
    if (error instanceof TypeError) {
      throw new Error(
        "Failed to connect to backend server. Please check the API URL or backend status.",
      );
    }

    throw error;
  }
}

// ==========================================================
// FORMAT CURRENCY
// ==========================================================

function formatCurrency(value) {
  const n = Number(value || 0);

  return (
    "₹" +
    n.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
}

// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDate(value) {
  if (!value) return "—";

  const d = new Date(value);

  if (isNaN(d)) {
    return value;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ==========================================================
// BOOTSTRAP TOAST
// ==========================================================

function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");

  if (!container) {
    container = document.createElement("div");

    container.id = "toastContainer";

    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "2000";

    document.body.appendChild(container);
  }

  const el = document.createElement("div");

  el.className = `alert alert-${type === "error" ? "danger" : type} shadow-sm`;

  el.style.minWidth = "260px";
  el.style.marginBottom = "10px";

  el.textContent = message;

  container.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3500);
}

// ==========================================================
// STATUS BADGE CLASS
// ==========================================================

function statusBadgeClass(status) {
  const map = {
    Available: "badge-available",

    Full: "badge-full",

    Maintenance: "badge-maintenance",

    Paid: "badge-paid",

    Partial: "badge-partial",

    Pending: "badge-pending",

    Active: "badge-active",

    Cancelled: "badge-cancelled",
  };

  return map[status] || "badge-available";
}

// ==========================================================
// SIDEBAR / MOBILE MENU / LOGOUT
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Get current page name
  const current = location.pathname.split("/").pop() || "dashboard.html";

  // ========================================================
  // Highlight current sidebar link
  // ========================================================

  document.querySelectorAll(".sidebar nav a").forEach((a) => {
    if (a.getAttribute("href") === current) {
      a.classList.add("active");
    }
  });

  // ========================================================
  // Mobile menu toggle
  // ========================================================

  const toggle = document.getElementById("menuToggle");

  const sidebar = document.getElementById("sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // ========================================================
  // Logout
  // ========================================================

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      localStorage.removeItem("hms_logged_in");

      window.location.href = "login.html";
    });
  }

  // ========================================================
  // Login protection
  // ========================================================

  if (
    !current.includes("login") &&
    localStorage.getItem("hms_logged_in") !== "true"
  ) {
    window.location.href = "login.html";
  }
});
