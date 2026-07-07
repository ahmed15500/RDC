function leaveFinancialView() {
  document.body.classList.remove("external-financial-view");
  document.querySelector(".financial-projects-page")?.remove();
  document.querySelector(".financial-projects-nav-button")?.classList.remove("active");
}

function isFinancialOnlyUser() {
  return document.body.classList.contains("financial-only-role");
}

function startSidebarNavigationFix() {
  document.addEventListener(
    "click",
    (event) => {
      const navButton = event.target.closest?.(".sidebar nav button");
      if (!navButton) return;

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
      const navButton = event.target.closest?.(".sidebar nav button");
      if (!navButton) return;

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
