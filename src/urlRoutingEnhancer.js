const routeDefinitions = [
  { path: "/", label: "Home", title: "RDC Impact" },
  { path: "/activities/new", label: "Submit Data", title: "Submit Activity" },
  { path: "/dashboard", label: "Admin Dashboard", title: "Admin Dashboard" },
  { path: "/villages", label: "Village Dashboard", title: "Village Dashboard" },
  { path: "/projects", label: "Project Dashboard", title: "Project Dashboard" },
  { path: "/pillars", label: "Pillar Dashboard", title: "Pillar Dashboard" },
  { path: "/sdgs", label: "SDG Dashboard", title: "SDG Dashboard" },
  { path: "/social-transformation", label: "Social Transformation", title: "Social Transformation" },
  { path: "/reports", label: "Reports / Export", title: "Reports" },
  { path: "/activities", label: "Data Management", title: "Activities" },
  { path: "/users", label: "Users", title: "Users" },
  { path: "/financial-projects", label: "Financial Projects", title: "Financial Projects" },
];

const routeAliases = {
  "/home": "/",
  "/submit": "/activities/new",
  "/submit-data": "/activities/new",
  "/admin": "/dashboard",
  "/village-dashboard": "/villages",
  "/project-dashboard": "/projects",
  "/pillar-dashboard": "/pillars",
  "/sdg-dashboard": "/sdgs",
  "/transformation": "/social-transformation",
  "/data": "/activities",
  "/data-management": "/activities",
  "/financial": "/financial-projects",
};

let applyingRoute = false;
let routeTimer = null;
let lastAppliedPath = "";

function normalize(value) {
  return String(value || "")
    .replace(/[€]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanPath(pathname = window.location.pathname) {
  const withoutTrailingSlash = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return routeAliases[withoutTrailingSlash] || withoutTrailingSlash || "/";
}

function definitionForPath(pathname = window.location.pathname) {
  const path = cleanPath(pathname);
  return routeDefinitions.find((route) => route.path === path) || null;
}

function definitionForLabel(label) {
  const normalizedLabel = normalize(label);
  return routeDefinitions.find((route) => normalize(route.label) === normalizedLabel) || null;
}

function navButtons() {
  return [...document.querySelectorAll(".sidebar nav button")];
}

function findRouteButton(route) {
  if (!route) return null;
  return navButtons().find((button) => normalize(button.textContent) === normalize(route.label)) || null;
}

function setDocumentTitle(route) {
  document.title = route ? `${route.title} | RDC Impact` : "RDC Impact Dashboard";
}

function updateAddress(path, mode = "push") {
  const nextPath = cleanPath(path);
  const currentPath = cleanPath(window.location.pathname);
  if (currentPath === nextPath) return;
  const url = `${nextPath}${window.location.search || ""}`;
  if (mode === "replace") window.history.replaceState({ rdcRoute: nextPath }, "", url);
  else window.history.pushState({ rdcRoute: nextPath }, "", url);
}

function currentRouteFromPage() {
  if (document.body.classList.contains("external-financial-view")) {
    return definitionForPath("/financial-projects");
  }
  const title = normalize(document.querySelector(".topbar h1")?.textContent);
  if (!title) return null;
  return routeDefinitions.find((route) => normalize(route.label) === title || normalize(route.title) === title) || null;
}

function syncAddressFromRenderedPage() {
  if (applyingRoute || !document.querySelector(".app-shell")) return;
  const route = currentRouteFromPage();
  if (!route) return;
  const currentPath = cleanPath(window.location.pathname);
  if (currentPath !== route.path) updateAddress(route.path, "push");
  setDocumentTitle(route);
}

function applyCurrentRoute() {
  if (window.location.pathname === "/set-password") return;
  if (!document.querySelector(".app-shell .sidebar nav")) return;

  const canonicalPath = cleanPath(window.location.pathname);
  const route = definitionForPath(canonicalPath);
  if (!route) {
    window.history.replaceState({ rdcRoute: "/" }, "", "/");
    lastAppliedPath = "";
    scheduleRouteApply();
    return;
  }

  if (window.location.pathname !== canonicalPath) {
    window.history.replaceState({ rdcRoute: canonicalPath }, "", `${canonicalPath}${window.location.search || ""}`);
  }

  const currentRoute = currentRouteFromPage();
  if (currentRoute?.path === route.path) {
    lastAppliedPath = route.path;
    setDocumentTitle(route);
    return;
  }

  const button = findRouteButton(route);
  if (!button) return;

  applyingRoute = true;
  lastAppliedPath = route.path;
  setDocumentTitle(route);
  button.click();
  window.setTimeout(() => {
    applyingRoute = false;
    syncAddressFromRenderedPage();
  }, 60);
}

function scheduleRouteApply() {
  if (routeTimer) window.clearTimeout(routeTimer);
  routeTimer = window.setTimeout(() => {
    routeTimer = null;
    applyCurrentRoute();
  }, 120);
}

function handleNavigationClick(event) {
  const button = event.target.closest?.(".sidebar nav button");
  if (!button) return;
  const route = definitionForLabel(button.textContent);
  if (!route) return;
  if (!applyingRoute) updateAddress(route.path, "push");
  lastAppliedPath = route.path;
  setDocumentTitle(route);
}

function handleInternalPageButtons(event) {
  if (applyingRoute) return;
  const button = event.target.closest?.("button");
  if (!button || button.closest(".sidebar nav")) return;
  const label = normalize(button.textContent);
  const knownActions = {
    "submit stakeholder data": "/activities/new",
    "open analytics": "/dashboard",
    "add financial project data": "/financial-projects",
  };
  const path = knownActions[label];
  if (path) updateAddress(path, "push");
}

function startUrlRouting() {
  if (window.location.pathname !== cleanPath(window.location.pathname)) {
    window.history.replaceState({}, "", `${cleanPath(window.location.pathname)}${window.location.search || ""}`);
  }

  document.addEventListener("click", handleNavigationClick, true);
  document.addEventListener("click", handleInternalPageButtons, true);

  window.addEventListener("popstate", () => {
    lastAppliedPath = "";
    applyingRoute = false;
    scheduleRouteApply();
  });

  const observer = new MutationObserver(() => {
    const desiredPath = cleanPath(window.location.pathname);
    if (desiredPath !== lastAppliedPath) scheduleRouteApply();
    else window.setTimeout(syncAddressFromRenderedPage, 80);
  });
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });

  scheduleRouteApply();
  window.setTimeout(scheduleRouteApply, 500);
  window.setTimeout(scheduleRouteApply, 1200);
  window.setTimeout(scheduleRouteApply, 2500);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startUrlRouting);
} else {
  startUrlRouting();
}
