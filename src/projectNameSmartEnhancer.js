import { supabase } from "./lib/supabaseClient";

let projectNamesCache = null;
let activityRowsCache = null;
let renderTimer = null;
let lastReportKey = "";

function installProjectNameStyles() {
  if (document.getElementById("project-name-smart-style")) return;
  const style = document.createElement("style");
  style.id = "project-name-smart-style";
  style.textContent = `
    body.smart-project-report-active .project-list {
      display: none !important;
    }

    .project-name-helper {
      display: block;
      margin-top: 6px;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 800;
      line-height: 1.35;
    }

    .smart-project-report {
      display: grid;
      gap: 14px;
    }

    .smart-project-report-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px;
      border: 1px solid #e5e8ed;
      border-radius: 14px;
      background: white;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.045);
    }

    .smart-project-report-head h3 {
      margin: 0 0 5px;
      color: #26313d;
      font-size: 1.18rem;
      font-weight: 950;
    }

    .smart-project-report-head p {
      margin: 0;
      color: #64748b;
      line-height: 1.5;
      font-weight: 750;
    }

    .smart-project-search {
      min-width: min(320px, 100%);
      display: grid;
      gap: 6px;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 900;
    }

    .smart-project-search input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d8dee8;
      border-radius: 10px;
      font: inherit;
      color: #26313d;
      background: white;
    }

    .smart-project-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 10px;
    }

    .smart-project-card {
      display: grid;
      gap: 10px;
      padding: 16px;
      border: 1px solid #e5e8ed;
      border-radius: 14px;
      background: white;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.045);
      cursor: pointer;
      text-align: left;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }

    .smart-project-card:hover {
      transform: translateY(-1px);
      border-color: #cbd5e1;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
    }

    .smart-project-card h4 {
      margin: 0;
      color: #26313d;
      font-size: 1rem;
      font-weight: 950;
      line-height: 1.25;
    }

    .smart-project-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .smart-project-meta span {
      padding: 5px 8px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 850;
    }

    .smart-project-numbers {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 2px;
    }

    .smart-project-numbers div {
      padding: 8px;
      border-radius: 10px;
      background: #f8fafc;
    }

    .smart-project-numbers strong,
    .smart-project-numbers small {
      display: block;
    }

    .smart-project-numbers strong {
      color: #26313d;
      font-size: 1.12rem;
      font-weight: 950;
    }

    .smart-project-numbers small {
      color: #64748b;
      font-size: 0.68rem;
      font-weight: 850;
    }

    .smart-project-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1300;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(16, 24, 40, 0.55);
    }

    .smart-project-modal {
      width: min(1100px, 100%);
      max-height: min(92vh, 880px);
      overflow: auto;
      padding: 22px;
      border-radius: 20px;
      background: white;
      box-shadow: 0 28px 90px rgba(16, 24, 40, 0.28);
    }

    .smart-project-modal-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .smart-project-modal h3 {
      margin: 0 0 5px;
      color: #26313d;
      font-size: 1.35rem;
      font-weight: 950;
    }

    .smart-project-close {
      border: 0;
      border-radius: 999px;
      padding: 8px 11px;
      background: #eef2f7;
      color: #26313d;
      font-weight: 900;
      cursor: pointer;
    }

    @media (max-width: 760px) {
      .smart-project-report-head {
        display: grid;
      }
      .smart-project-numbers {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value) {
  return Number(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(number(value)));
}

function splitVillages(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProjectName(value) {
  return String(value || "").trim();
}

async function loadProjectNames(force = false) {
  if (projectNamesCache && !force) return projectNamesCache;

  const names = new Set();

  const { data: activityRows } = await supabase
    .from("activities")
    .select("project_name")
    .order("project_name", { ascending: true });

  (activityRows || []).forEach((row) => {
    const name = normalizeProjectName(row.project_name);
    if (name) names.add(name);
  });

  const { data: financialRows } = await supabase
    .from("financial_projects")
    .select("project_name")
    .order("project_name", { ascending: true });

  (financialRows || []).forEach((row) => {
    const name = normalizeProjectName(row.project_name);
    if (name) names.add(name);
  });

  projectNamesCache = [...names].sort((a, b) => a.localeCompare(b));
  return projectNamesCache;
}

async function loadActivityRows(force = false) {
  if (activityRowsCache && !force) return activityRowsCache;
  const { data, error } = await supabase
    .from("activities")
    .select("id,project_name,activity_name,activity_type,village,date_period,target_group,direct_beneficiaries,indirect_beneficiaries,approval_status,key_outcome,future_opportunity,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  activityRowsCache = data || [];
  return activityRowsCache;
}

function findProjectNameInput() {
  return [...document.querySelectorAll("form.submission label")].find((label) => {
    const text = label.childNodes[0]?.textContent?.trim().toLowerCase() || label.textContent.trim().toLowerCase();
    return text.startsWith("project name");
  })?.querySelector("input");
}

async function enhanceProjectNameInput() {
  const input = findProjectNameInput();
  if (!input || input.dataset.projectNameSmartEnhanced === "true") return;

  const names = await loadProjectNames();
  input.dataset.projectNameSmartEnhanced = "true";
  input.setAttribute("list", "rdc-project-name-suggestions");
  input.setAttribute("placeholder", "Choose previous project or type a new one");
  input.setAttribute("autocomplete", "off");

  let datalist = document.getElementById("rdc-project-name-suggestions");
  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "rdc-project-name-suggestions";
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = names.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");

  const label = input.closest("label");
  if (label && !label.querySelector(".project-name-helper")) {
    const helper = document.createElement("small");
    helper.className = "project-name-helper";
    helper.textContent = "Start typing to choose an existing project, or type a new project name.";
    label.appendChild(helper);
  }
}

function groupProjects(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const projectName = normalizeProjectName(row.project_name) || "Untitled project";
    const current = grouped.get(projectName) || {
      projectName,
      activities: 0,
      direct: 0,
      indirect: 0,
      villages: new Set(),
      activityTypes: new Set(),
      rows: [],
      outcomes: [],
      opportunities: [],
    };
    current.activities += 1;
    current.direct += number(row.direct_beneficiaries);
    current.indirect += number(row.indirect_beneficiaries);
    splitVillages(row.village).forEach((village) => current.villages.add(village));
    if (row.activity_type) current.activityTypes.add(row.activity_type);
    if (row.key_outcome) current.outcomes.push(row.key_outcome);
    if (row.future_opportunity) current.opportunities.push(row.future_opportunity);
    current.rows.push(row);
    grouped.set(projectName, current);
  });

  return [...grouped.values()].sort((a, b) => b.activities - a.activities || a.projectName.localeCompare(b.projectName));
}

function renderProjectCard(project) {
  return `
    <button type="button" class="smart-project-card" data-project="${escapeHtml(project.projectName)}">
      <h4>${escapeHtml(project.projectName)}</h4>
      <div class="smart-project-meta">
        ${[...project.activityTypes].slice(0, 3).map((type) => `<span>${escapeHtml(type)}</span>`).join("")}
        ${project.activityTypes.size > 3 ? `<span>+${project.activityTypes.size - 3} types</span>` : ""}
      </div>
      <div class="smart-project-numbers">
        <div><strong>${formatNumber(project.activities)}</strong><small>Activities</small></div>
        <div><strong>${formatNumber(project.direct + project.indirect)}</strong><small>Beneficiaries</small></div>
        <div><strong>${formatNumber(project.villages.size)}</strong><small>Villages</small></div>
      </div>
    </button>
  `;
}

function openProjectDetails(project) {
  const backdrop = document.createElement("div");
  backdrop.className = "smart-project-modal-backdrop";
  backdrop.innerHTML = `
    <section class="smart-project-modal">
      <div class="smart-project-modal-head">
        <div>
          <h3>${escapeHtml(project.projectName)}</h3>
          <p class="summary-text">This report is grouped by the entered project name, not by activity type.</p>
        </div>
        <button type="button" class="smart-project-close">Close</button>
      </div>
      <div class="kpi-grid wide">
        <article class="kpi-card"><span>Activities</span><strong>${formatNumber(project.activities)}</strong></article>
        <article class="kpi-card"><span>Total beneficiaries</span><strong>${formatNumber(project.direct + project.indirect)}</strong></article>
        <article class="kpi-card"><span>Villages</span><strong>${formatNumber(project.villages.size)}</strong></article>
        <article class="kpi-card"><span>Activity types</span><strong>${formatNumber(project.activityTypes.size)}</strong></article>
      </div>
      <article class="panel">
        <h3>Project activities</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Activity</th><th>Type</th><th>Village</th><th>Date</th><th>Direct</th><th>Indirect</th><th>Status</th></tr></thead>
            <tbody>
              ${project.rows.map((row) => `<tr><td><strong>${escapeHtml(row.activity_name || "Untitled activity")}</strong></td><td>${escapeHtml(row.activity_type || "")}</td><td>${escapeHtml(row.village || "")}</td><td>${escapeHtml(row.date_period || "")}</td><td>${formatNumber(row.direct_beneficiaries)}</td><td>${formatNumber(row.indirect_beneficiaries)}</td><td><span class="status ${escapeHtml(String(row.approval_status || "pending").toLowerCase().replaceAll(" ", "-"))}">${escapeHtml(row.approval_status || "pending")}</span></td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </article>
      <div class="grid two">
        <article class="panel"><h3>Key outcomes</h3><ul class="project-bullets">${project.outcomes.slice(0, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || `<li>No outcomes recorded yet.</li>`}</ul></article>
        <article class="panel"><h3>Future opportunities</h3><ul class="project-bullets">${project.opportunities.slice(0, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || `<li>No opportunities recorded yet.</li>`}</ul></article>
      </div>
    </section>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector(".smart-project-close")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
}

async function renderSmartProjectReport(force = false) {
  const projectList = document.querySelector(".project-list");
  const heading = document.querySelector(".topbar h1")?.textContent?.trim() || "";
  if (!projectList || !heading.includes("Project Dashboard")) {
    document.body.classList.remove("smart-project-report-active");
    return;
  }

  const rows = await loadActivityRows(force);
  const projects = groupProjects(rows);
  const reportKey = `${projects.length}:${projects.map((project) => `${project.projectName}-${project.activities}-${project.direct}-${project.indirect}`).join("|")}`;
  if (reportKey === lastReportKey && document.querySelector(".smart-project-report")) return;
  lastReportKey = reportKey;

  document.body.classList.add("smart-project-report-active");
  document.querySelector(".smart-project-report")?.remove();

  const report = document.createElement("section");
  report.className = "smart-project-report";
  report.innerHTML = `
    <div class="smart-project-report-head">
      <div>
        <h3>Project Report by Project Name</h3>
        <p>Projects are grouped by the project name entered in the submission form. This replaces grouping by activity type.</p>
      </div>
      <label class="smart-project-search">Search project<input type="search" placeholder="Search by project name" /></label>
    </div>
    <div class="smart-project-cards">
      ${projects.map(renderProjectCard).join("") || `<article class="panel"><h3>No projects yet</h3><p class="summary-text">Submit data first, then project cards will appear here.</p></article>`}
    </div>
  `;

  projectList.before(report);
  const cardsWrap = report.querySelector(".smart-project-cards");
  const searchInput = report.querySelector("input[type='search']");

  function paintCards(query = "") {
    const filtered = projects.filter((project) => project.projectName.toLowerCase().includes(query.trim().toLowerCase()));
    cardsWrap.innerHTML = filtered.map(renderProjectCard).join("") || `<article class="panel"><h3>No matching project</h3><p class="summary-text">Try another project name.</p></article>`;
    cardsWrap.querySelectorAll(".smart-project-card").forEach((card) => {
      card.addEventListener("click", () => {
        const project = projects.find((item) => item.projectName === card.dataset.project);
        if (project) openProjectDetails(project);
      });
    });
  }

  paintCards();
  searchInput?.addEventListener("input", () => paintCards(searchInput.value));
}

function scheduleProjectNameEnhancements(force = false) {
  if (renderTimer) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderTimer = null;
    enhanceProjectNameInput().catch(() => null);
    renderSmartProjectReport(force).catch(() => null);
  }, 250);
}

function startProjectNameSmartEnhancer() {
  installProjectNameStyles();
  scheduleProjectNameEnhancements(true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .ghost, .submit-button")) {
      projectNamesCache = null;
      activityRowsCache = null;
      lastReportKey = "";
      window.setTimeout(() => scheduleProjectNameEnhancements(true), 500);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleProjectNameEnhancements(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startProjectNameSmartEnhancer);
} else {
  startProjectNameSmartEnhancer();
}
