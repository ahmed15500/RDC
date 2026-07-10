const routeDefinitions = [
  { path: "/", label: "Home", title: "RDC Impact" },
  { path: "/activities/new", label: "Submit Data", title: "Submit Activity" },
  { path: "/dashboard", label: "Admin Dashboard", title: "Admin Dashboard" },
  { path: "/villages", label: "Village Dashboard", title: "Village Dashboard" },
  { path: "/projects", label: "Project Dashboard", title: "Project Dashboard" },
  { path: "/pillars", label: "Pillar Dashboard", title: "Pillar Dashboard" },
  { path: "/sdgs", label: "SDG Dashboard", title: "SDG Dashboard" },
  { path: "/social-transformation", label: "Social Transformation", title: "Social Transformation" },
  { path: "/reports", label: "Reports / Export", title: "Reports / Export" },
  { path: "/activities", label: "Data Management", title: "Data Management" },
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

let desiredPath = canonicalPath(window.location.pathname);
let applyingRoute = false;
let initialRoutePending = true;
let retryTimer = null;
let clearApplyingTimer = null;

function normalize(value) {
  return String(value || "")
    .replace(/[€]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalPath(pathname = window.location.pathname) {
  const raw = String(pathname || "/");
  const withoutTrailingSlash = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
  return routeAliases[withoutTrailingSlash] || withoutTrailingSlash || "/";
}

function routeForPath(pathname = window.location.pathname) {
  const path = canonicalPath(pathname);
  return routeDefinitions.find((route) => route.path === path) || null;
}

function routeForLabel(label) {
  const target = normalize(label);
  return routeDefinitions.find((route) => normalize(route.label) === target) || null;
}

function routeForButton(button) {
  return routeForLabel(button?.textContent || "");
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

function setAddress(path, mode = "push") {
  const route = routeForPath(path) || routeForPath("/");
  const nextPath = route.path;
  const currentPath = canonicalPath(window.location.pathname);
  if (currentPath === nextPath) {
    setDocumentTitle(route);
    return;
  }

  const url = `${nextPath}${window.location.search || ""}${window.location.hash || ""}`;
  if (mode === "replace") window.history.replaceState({ rdcRoute: nextPath }, "", url);
  else window.history.pushState({ rdcRoute: nextPath }, "", url);
  desiredPath = nextPath;
  setDocumentTitle(route);
}

function activeRenderedRoute() {
  if (document.body.classList.contains("external-financial-view")) {
    return routeForPath("/financial-projects");
  }

  const activeButton = document.querySelector(".sidebar nav button.active");
  if (activeButton) return routeForButton(activeButton);

  const title = normalize(document.querySelector(".topbar h1")?.textContent || "");
  return routeDefinitions.find((route) => normalize(route.label) === title || normalize(route.title) === title) || null;
}

function syncAddressFromRenderedPage() {
  if (initialRoutePending || applyingRoute || !document.querySelector(".app-shell")) return;
  const renderedRoute = activeRenderedRoute();
  if (!renderedRoute) return;

  if (canonicalPath(window.location.pathname) !== renderedRoute.path) {
    setAddress(renderedRoute.path, "replace");
  } else {
    setDocumentTitle(renderedRoute);
  }
}

function finishApplying(route) {
  if (clearApplyingTimer) window.clearTimeout(clearApplyingTimer);
  clearApplyingTimer = window.setTimeout(() => {
    applyingRoute = false;
    initialRoutePending = false;
    desiredPath = route.path;
    setAddress(route.path, "replace");
    syncAddressFromRenderedPage();
  }, 260);
}

function applyDesiredRoute() {
  if (window.location.pathname === "/set-password") return true;
  if (!document.querySelector(".app-shell .sidebar nav")) return false;

  let route = routeForPath(desiredPath);
  if (!route) {
    route = routeForPath("/");
    desiredPath = route.path;
    window.history.replaceState({ rdcRoute: route.path }, "", route.path);
  }

  const rendered = activeRenderedRoute();
  if (rendered?.path === route.path) {
    initialRoutePending = false;
    applyingRoute = false;
    setAddress(route.path, "replace");
    return true;
  }

  const button = findRouteButton(route);
  if (!button) return false;

  applyingRoute = true;
  setDocumentTitle(route);
  button.click();
  finishApplying(route);
  return true;
}

function scheduleRouteApply(delay = 80) {
  if (retryTimer) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    const applied = applyDesiredRoute();
    if (!applied) scheduleRouteApply(250);
  }, delay);
}

function handleNavigationClick(event) {
  const button = event.target.closest?.(".sidebar nav button");
  if (!button) return;
  const route = routeForButton(button);
  if (!route) return;

  if (!applyingRoute) {
    initialRoutePending = false;
    desiredPath = route.path;
    setAddress(route.path, "push");
  }

  window.setTimeout(syncAddressFromRenderedPage, 100);
  window.setTimeout(syncAddressFromRenderedPage, 350);
}

function handleInternalPageButtons(event) {
  if (applyingRoute) return;
  const button = event.target.closest?.("button");
  if (!button || button.closest(".sidebar nav")) return;

  const label = normalize(button.textContent);
  const knownActions = {
    "submit stakeholder data": "/activities/new",
    "open analytics": "/dashboard",
    "edit": "/activities/new",
  };

  const path = knownActions[label];
  if (!path) return;
  desiredPath = path;
  initialRoutePending = false;
  setAddress(path, "push");
}

function decorateNavigation() {
  navButtons().forEach((button) => {
    const route = routeForButton(button);
    if (!route) return;
    button.dataset.pageUrl = route.path;
    button.setAttribute("title", `${route.label} — ${route.path}`);
  });
}

function startUrlRouting() {
  if (window.location.pathname === "/set-password") return;

  const canonical = canonicalPath(window.location.pathname);
  const validRoute = routeForPath(canonical) || routeForPath("/");
  desiredPath = validRoute.path;
  if (window.location.pathname !== validRoute.path) {
    window.history.replaceState({ rdcRoute: validRoute.path }, "", `${validRoute.path}${window.location.search || ""}${window.location.hash || ""}`);
  }

  document.addEventListener("click", handleNavigationClick, true);
  document.addEventListener("click", handleInternalPageButtons, true);

  window.addEventListener("popstate", () => {
    desiredPath = canonicalPath(window.location.pathname);
    initialRoutePending = true;
    applyingRoute = false;
    scheduleRouteApply(20);
  });

  const observer = new MutationObserver(() => {
    decorateNavigation();
    if (initialRoutePending) scheduleRouteApply(60);
    else window.setTimeout(syncAddressFromRenderedPage, 80);
  });
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });

  decorateNavigation();
  scheduleRouteApply(20);
  window.setTimeout(() => scheduleRouteApply(20), 500);
  window.setTimeout(() => scheduleRouteApply(20), 1300);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startUrlRouting);
} else {
  startUrlRouting();
}
