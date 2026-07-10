function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function applyProjectOnlyTerminology() {
  document.querySelectorAll(".department-report-table").forEach((table) => {
    const headers = [...table.querySelectorAll("thead th")];
    const projectIndex = headers.findIndex((header) => normalize(header.textContent) === "project / type");

    if (projectIndex < 0) return;

    headers[projectIndex].textContent = "Project";

    table.querySelectorAll("tbody tr").forEach((row) => {
      const projectCell = row.children[projectIndex];
      if (!projectCell) return;

      // Keep the entered main project name only. Activity type remains stored
      // separately and is not presented as part of the project identity.
      projectCell.querySelectorAll("small").forEach((element) => element.remove());
    });
  });

  document.querySelectorAll(".department-report-section").forEach((section) => {
    const heading = section.querySelector(":scope > h4");
    if (normalize(heading?.textContent) === "activity types") {
      section.remove();
    }
  });
}

function startProjectOnlyTerminologyFix() {
  applyProjectOnlyTerminology();

  const observer = new MutationObserver(() => applyProjectOnlyTerminology());
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startProjectOnlyTerminologyFix);
} else {
  startProjectOnlyTerminologyFix();
}
