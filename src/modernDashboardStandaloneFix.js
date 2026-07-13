let modernStandaloneTimer = null;

const MODERN_HASH = "#modern-impact-dashboard";

function installModernStandaloneStyles() {
  if (document.getElementById("modern-dashboard-standalone-style")) return;
  const style = document.createElement("style");
  style.id = "modern-dashboard-standalone-style";
  style.textContent = `
    body:not(.external-modern-dashboard-view) .modern-command-center {
      display: none !important;
    }

    body.external-modern-dashboard-view main.workspace > *:not(.topbar):not(.modern-command-center):not(.modern-dashboard-standalone-loading) {
      display: none !important;
    }

    body.external-modern-dashboard-view .modern-command-center {
      display: block !important;
      margin-top: 0;
    }

    .modern-dashboard-nav-button {
      position: relative;
    }

    .modern-dashboard-nav-icon {
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      font-size: 16px;
      line-height: 1;
    }

    .modern-route-bridge {
      display: none !important;
    }

    .modern-dashboard-standalone-loading {
      padding: 18px;
      border: 1px dashed rgba(36, 43, 120, 0.2);
      border-radius: 18px;
      background: #fff;
      color: #64748b;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);
}

function clearModernHash() {
  if (window.location.hash !== MODERN_HASH) return;
  const cleanUrl = `${window.location.pathname}${window.location.search || ""}`;
  window.history.replaceState(window.history.state, "", cleanUrl);
}

function removeLoadingWhenReady() {
  const workspace = document.querySelector("main.workspace");
  if (!workspace) return;
  if (workspace.querySelector(".modern-command-center")) {
    workspace.querySelector(".modern-dashboard-standalone-loading")?.remove();
  }
}

function forceModernEnhancerRefresh() {
  const workspace = document.querySelector("main.workspace");
  if (!workspace) return;
  const marker = document.createElement("span");
  marker.hidden = true;
  marker.dataset.modernStandaloneRefresh = String(Date.now());
  workspace.appendChild(marker);
  window.setTimeout(() => marker.remove(), 20);
}

function openModernDashboard({ updateAddress = true } = {}) {
  const workspace = document.querySelector("main.workspace");
  const topbar = workspace?.querySelector(".topbar");
  const nav = document.querySelector(".sidebar nav");
  if (!workspace || !topbar || !nav) return false;

  document.body.classList.remove("external-financial-view");
  document.querySelector(".financial-projects-page")?.remove();
  document.body.classList.add("external-modern-dashboard-view");

  nav.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
  nav.querySelector(".modern-dashboard-nav-button")?.classList.add("active");

  const title = topbar.querySelector("h1");
  const subtitle = topbar.querySelector("p");
  if (title) {
    title.innerHTML = `Modern Impact Dashboard<span class="modern-route-bridge" aria-hidden="true"> Admin Dashboard</span>`;
  }
  if (subtitle) {
    subtitle.textContent = "Executive impact, field coverage, and data-quality insights in one dedicated dashboard.";
  }

  if (!workspace.querySelector(".modern-command-center") && !workspace.querySelector(".modern-dashboard-standalone-loading")) {
    const loading = document.createElement("section");
    loading.className = "modern-dashboard-standalone-loading";
    loading.textContent = "Loading the modern impact dashboard...";
    topbar.after(loading);
  }

  if (updateAddress) {
    const nextUrl = `/dashboard${window.location.search || ""}${MODERN_HASH}`;
    window.history.pushState({ modernImpactDashboard: true }, "", nextUrl);
  }
  document.title = "Modern Impact Dashboard | RDC Impact";

  forceModernEnhancerRefresh();
  window.setTimeout(forceModernEnhancerRefresh, 180);
  window.setTimeout(removeLoadingWhenReady, 650);
  window.setTimeout(removeLoadingWhenReady, 1200);
  document.querySelector(".app-shell")?.classList.remove("sidebar-open");
  return true;
}

function closeModernDashboard({ clearHash = true } = {}) {
  if (!document.body.classList.contains("external-modern-dashboard-view")) return;
  document.body.classList.remove("external-modern-dashboard-view");
  document.querySelector(".modern-dashboard-standalone-loading")?.remove();
  document.querySelector(".modern-dashboard-nav-button")?.classList.remove("active");
  if (clearHash) window.setTimeout(clearModernHash, 0);
}

function addModernDashboardNavButton() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || nav.querySelector(".modern-dashboard-nav-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "modern-dashboard-nav-button";
  button.innerHTML = `<span class="modern-dashboard-nav-icon" aria-hidden="true">▦</span>Modern Impact Dashboard`;
  button.addEventListener("click", () => openModernDashboard());

  const adminButton = [...nav.querySelectorAll("button")].find((item) => item.textContent.trim() === "Admin Dashboard");
  if (adminButton) adminButton.after(button);
  else nav.prepend(button);
}

function applyModernStandalone() {
  installModernStandaloneStyles();
  addModernDashboardNavButton();
  removeLoadingWhenReady();

  if (window.location.hash === MODERN_HASH && !document.body.classList.contains("external-modern-dashboard-view")) {
    openModernDashboard({ updateAddress: false });
  }
}

function scheduleModernStandalone() {
  if (modernStandaloneTimer) window.clearTimeout(modernStandaloneTimer);
  modernStandaloneTimer = window.setTimeout(() => {
    modernStandaloneTimer = null;
    applyModernStandalone();
  }, 100);
}

function startModernStandalone() {
  installModernStandaloneStyles();
  scheduleModernStandalone();

  document.addEventListener("click", (event) => {
    const navButton = event.target.closest?.(".sidebar nav button");
    if (!navButton || navButton.classList.contains("modern-dashboard-nav-button")) return;
    closeModernDashboard({ clearHash: true });
  }, true);

  window.addEventListener("popstate", () => {
    if (window.location.hash === MODERN_HASH) {
      window.setTimeout(() => openModernDashboard({ updateAddress: false }), 80);
    } else {
      closeModernDashboard({ clearHash: false });
    }
  });

  const observer = new MutationObserver(scheduleModernStandalone);
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startModernStandalone);
} else {
  startModernStandalone();
}
