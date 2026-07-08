const STORAGE_KEY = "rdc:last-open-page";
let restoreTimer = null;
let restoreDone = false;

function normalizePageName(value) {
  return String(value || "")
    .replace(/[€]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function displayPageName(button) {
  return normalizePageName(button?.textContent || "");
}

function saveCurrentPage(button) {
  const page = displayPageName(button);
  if (!page) return;
  window.localStorage.setItem(STORAGE_KEY, page);
}

function currentTitle() {
  return normalizePageName(document.querySelector(".topbar h1")?.textContent || "");
}

function isAppReady() {
  return Boolean(document.querySelector(".app-shell .sidebar nav") && document.querySelector("main.workspace .topbar h1"));
}

function isAuthScreen() {
  return Boolean(document.querySelector(".login-page"));
}

function findTargetNavButton(savedPage) {
  const buttons = [...document.querySelectorAll(".sidebar nav button")];
  return buttons.find((button) => displayPageName(button) === savedPage);
}

function restoreSavedPage() {
  if (restoreDone || isAuthScreen() || !isAppReady()) return;

  const savedPage = normalizePageName(window.localStorage.getItem(STORAGE_KEY));
  if (!savedPage || savedPage === "home") {
    restoreDone = true;
    return;
  }

  const title = currentTitle();
  if (title === savedPage || (savedPage === "financial projects" && document.body.classList.contains("external-financial-view"))) {
    restoreDone = true;
    return;
  }

  const targetButton = findTargetNavButton(savedPage);
  if (!targetButton) return;

  restoreDone = true;
  window.setTimeout(() => targetButton.click(), 120);
}

function scheduleRestore() {
  if (restoreTimer) window.clearTimeout(restoreTimer);
  restoreTimer = window.setTimeout(() => {
    restoreTimer = null;
    restoreSavedPage();
  }, 180);
}

function startPagePersistence() {
  document.addEventListener(
    "click",
    (event) => {
      const navButton = event.target.closest?.(".sidebar nav button");
      if (navButton) saveCurrentPage(navButton);

      const logoutButton = event.target.closest?.("button");
      if (logoutButton && normalizePageName(logoutButton.textContent) === "logout") {
        restoreDone = false;
      }
    },
    true,
  );

  scheduleRestore();
  window.setTimeout(scheduleRestore, 700);
  window.setTimeout(scheduleRestore, 1400);
  window.setTimeout(scheduleRestore, 2500);

  const observer = new MutationObserver(() => scheduleRestore());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startPagePersistence);
} else {
  startPagePersistence();
}
