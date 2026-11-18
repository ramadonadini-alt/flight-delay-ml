const HISTORY_KEY = "flight-risk-history-v1";
const SIDEBAR_ITEMS = [
  { href: "/", icon: "layout-dashboard", label: "Dashboard", paths: ["/"] },
  { href: "/prediction.html", icon: "radar", label: "Prediksi Penerbangan", paths: ["/prediction.html", "/result.html"] },
  { href: "/history.html", icon: "history", label: "Riwayat Prediksi", paths: ["/history.html"] },
  { href: "/analytics.html", icon: "chart-no-axes-combined", label: "Analisis Penerbangan", paths: ["/analytics.html"] },
];

const UI_VALUE_LABELS = {
  "Mobile App": "Aplikasi seluler", "Website": "Situs web", "Travel Agent": "Agen perjalanan", "Call Center": "Pusat panggilan",
  "Economy": "Ekonomi", "Business": "Bisnis", "First": "Kelas utama",
  "Dry Season": "Musim kemarau", "Rainy Season": "Musim hujan", "Transition Season": "Musim peralihan",
};

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function riskClass(level = "") {
  return level.toLowerCase().replace(" risk", "") || "unavailable";
}

function translateRisk(level = "") {
  return ({ "Low Risk": "Risiko Rendah", "Medium Risk": "Risiko Menengah", "High Risk": "Risiko Tinggi" })[level] || "Tidak tersedia";
}

function translateUiValue(value = "") {
  return UI_VALUE_LABELS[value] || value;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function showToast(message, kind = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3500);
}

function initShell() {
  const path = window.location.pathname;
  document.querySelectorAll(".sidebar-nav").forEach((nav) => {
    nav.innerHTML = SIDEBAR_ITEMS.map((item) => {
      const active = item.paths.includes(path);
      return `<a class="nav-link${active ? " active" : ""}" href="${item.href}"${active ? ' aria-current="page"' : ""}><i data-lucide="${item.icon}"></i><span>${item.label}</span></a>`;
    }).join("");
  });
  const toggle = document.querySelector("[data-sidebar-toggle]");
  const shell = document.querySelector(".app-shell");
  let setMobileOpen = () => {};
  if (shell && !document.querySelector(".mobile-menu-button")) {
    const mobileMenu = document.createElement("button");
    const mobileOverlay = document.createElement("button");
    mobileMenu.className = "mobile-menu-button";
    mobileMenu.type = "button";
    mobileMenu.setAttribute("aria-label", "Buka menu navigasi");
    mobileMenu.setAttribute("aria-expanded", "false");
    mobileMenu.textContent = "\u2630";
    mobileMenu.style.cssText = "position:fixed;z-index:60;left:12px;top:11px;width:44px;height:44px;padding:0;border:1px solid #e6edf5;border-radius:10px;background:#fff;color:#172b4d;font:700 22px/1 system-ui;box-shadow:0 6px 16px #0b1f3a18;cursor:pointer;";
    mobileOverlay.className = "mobile-menu-overlay";
    mobileOverlay.type = "button";
    mobileOverlay.setAttribute("aria-label", "Tutup menu navigasi");
    mobileOverlay.hidden = true;
    mobileOverlay.style.cssText = "position:fixed;z-index:19;inset:0;border:0;background:#0b1f3a66;";
    setMobileOpen = (open) => {
      const enabled = window.matchMedia("(max-width: 760px)").matches;
      shell.classList.toggle("mobile-open", enabled && open);
      mobileOverlay.hidden = !enabled || !open;
      mobileMenu.hidden = !enabled;
      mobileMenu.textContent = open ? "\u00d7" : "\u2630";
      mobileMenu.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
      mobileMenu.setAttribute("aria-expanded", String(enabled && open));
    };
    mobileMenu.addEventListener("click", () => setMobileOpen(!shell.classList.contains("mobile-open")));
    mobileOverlay.addEventListener("click", () => setMobileOpen(false));
    window.matchMedia("(max-width: 760px)").addEventListener("change", () => setMobileOpen(false));
    document.querySelectorAll(".sidebar-nav a").forEach((link) => link.addEventListener("click", () => setMobileOpen(false)));
    document.body.append(mobileOverlay, mobileMenu);
    setMobileOpen(false);
  }
  const storedState = localStorage.getItem("flight-risk-sidebar");
  if (storedState === "collapsed") shell?.classList.add("sidebar-collapsed");
  toggle?.addEventListener("click", () => {
    shell?.classList.toggle("sidebar-collapsed");
    localStorage.setItem("flight-risk-sidebar", shell?.classList.contains("sidebar-collapsed") ? "collapsed" : "open");
  });
  document.querySelectorAll("[data-mobile-toggle]").forEach((button) => {
    button.addEventListener("click", () => setMobileOpen(!shell?.classList.contains("mobile-open")));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileOpen(false);
  });
  const dateTarget = document.querySelector("[data-today]");
  if (dateTarget) dateTarget.textContent = new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date());
  window.lucide?.createIcons();
}

document.addEventListener("DOMContentLoaded", initShell);
