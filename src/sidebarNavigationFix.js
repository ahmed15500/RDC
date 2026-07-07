function leaveFinancialView() {
  document.body.classList.remove("external-financial-view");
  document.querySelector(".financial-projects-page")?.remove();
  document.querySelector(".financial-projects-nav-button")?.classList.remove("active");
}

function isFinancialOnlyUser() {
  return document.body.classList.contains("financial-only-role");
}

function showSidebar() {
  const shell = document.querySelector(".app-shell");
  const sidebar = document.querySelector(".sidebar");
  const scrim = document.querySelector(".sidebar-scrim");

  shell?.classList.add("sidebar-open");
  sidebar?.setAttribute("data-open-fix", "true");
  scrim?.setAttribute("data-open-fix", "true");
}

function hideSidebar() {
  const shell = document.querySelector(".app-shell");
  const sidebar = document.querySelector(".sidebar");
  const scrim = document.querySelector(".sidebar-scrim");

  shell?.classList.remove("sidebar-open");
  sidebar?.removeAttribute("data-open-fix");
  scrim?.removeAttribute("data-open-fix");
}

function installSidebarFixStyles() {
  if (document.getElementById("sidebar-navigation-fix-style")) return;
  const style = document.createElement("style");
  style.id = "sidebar-navigation-fix-style";
  style.textContent = `
    .sidebar[data-open-fix="true"] {
      transform: translateX(0) !important;
      z-index: 1005 !important;
    }

    .sidebar-scrim[data-open-fix="true"] {
      display: block !important;
      z-index: 1000 !important;
    }
  `;
  document.head.appendChild(style);
}

function startSidebarNavigationFix() {
  installSidebarFixStyles();

  document.addEventListener(
    "click",
    (event) => {
      const menuButton = event.target.closest?.(".menu-toggle");
      if (menuButton) {
        window.setTimeout(showSidebar, 0);
        window.setTimeout(showSidebar, 80);
        return;
      }

      const closeButton = event.target.closest?.(".sidebar-close, .sidebar-scrim");
      if (closeButton) {
        window.setTimeout(hideSidebar, 0);
        return;
      }

      const navButton = event.target.closest?.(".sidebar nav button");
      if (!navButton) return;

      hideSidebar();

      if (navButton.classList.contains("financial-projects-nav-button")) return;
      if (isFinancialOnlyUser()) return;

      leaveFinancialView();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const menuButton = event.target.closest?.(".menu-toggle");
      if (menuButton) {
        window.setTimeout(showSidebar, 0);
        window.setTimeout(showSidebar, 80);
        return;
      }

      const navButton = event.target.closest?.(".sidebar nav button");
      if (!navButton) return;

      hideSidebar();

      if (navButton.classList.contains("financial-projects-nav-button")) return;
      if (isFinancialOnlyUser()) return;

      leaveFinancialView();
    },
    true,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSidebarNavigationFix);
} else {
  startSidebarNavigationFix();
}
