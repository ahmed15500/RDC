import { supabase } from "./lib/supabaseClient";

let departmentDataPromise = null;

const metricFields = [
  ["direct_beneficiaries", "Direct beneficiaries"],
  ["indirect_beneficiaries", "Indirect beneficiaries"],
  ["households", "Households"],
  ["women", "Women"],
  ["women_trained", "Women trained"],
  ["youth", "Youth"],
  ["children_students", "Children / students"],
  ["farmers", "Farmers"],
  ["schools", "Schools"],
  ["teachers", "Teachers"],
  ["volunteers", "Volunteers"],
  ["community_events", "Community events"],
  ["trainings", "Trainings"],
  ["health_cases", "Health cases"],
  ["waste_collected_kg", "Waste collected kg"],
  ["waste_recycled_kg", "Waste recycled kg"],
  ["waste_composted_kg", "Waste composted kg"],
  ["trees_planted", "Trees / plants"],
  ["income_generated", "Income generated"],
  ["jobs_created", "Jobs created"],
  ["products_sold", "Products sold"],
];

const css = `
  .department-report-panel {
    padding: 22px;
    margin-bottom: 18px;
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: var(--shadow, 0 24px 70px rgba(20, 30, 84, 0.12));
  }

  .department-report-header {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 16px;
  }

  .department-report-header h3 {
    margin: 0;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
  }

  .department-report-header p {
    margin: 5px 0 0;
    color: var(--muted, #6a7188);
  }

  .department-report-controls {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) auto auto;
    gap: 10px;
    align-items: end;
  }

  .department-report-controls label {
    color: var(--muted, #6a7188);
    font-size: 0.84rem;
    font-weight: 800;
  }

  .department-report-controls select {
    margin-top: 6px;
  }

  .department-report-output {
    display: grid;
    gap: 16px;
  }

  .department-report-note {
    padding: 14px 16px;
    color: var(--muted, #6a7188);
    border: 1px dashed rgba(36, 43, 120, 0.18);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
    line-height: 1.6;
  }

  .department-report-cover {
    padding: 22px;
    color: white;
    border-radius: 24px;
    background: linear-gradient(135deg, var(--navy, #242b78), #38469d);
  }

  .department-report-cover h2 {
    margin: 0;
    font-family: "Space Grotesk", sans-serif;
    font-size: clamp(1.8rem, 4vw, 3rem);
    letter-spacing: -0.04em;
  }

  .department-report-cover p {
    max-width: 880px;
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.82);
    line-height: 1.7;
  }

  .department-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .department-kpi-grid div,
  .department-report-section {
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.82);
  }

  .department-kpi-grid div {
    padding: 16px;
  }

  .department-kpi-grid strong {
    display: block;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
    font-size: 1.6rem;
  }

  .department-kpi-grid span {
    color: var(--muted, #6a7188);
    font-size: 0.84rem;
    font-weight: 800;
  }

  .department-two-col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .department-report-section {
    padding: 18px;
  }

  .department-report-section h4 {
    margin: 0 0 12px;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
  }

  .department-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .department-chip-row span {
    padding: 7px 10px;
    color: var(--navy, #242b78);
    border-radius: 999px;
    background: rgba(36, 43, 120, 0.08);
    font-size: 0.84rem;
    font-weight: 800;
  }

  .department-report-table {
    width: 100%;
    min-width: 920px;
    border-collapse: collapse;
  }

  .department-report-table th,
  .department-report-table td {
    padding: 12px;
    border-bottom: 1px solid rgba(36, 43, 120, 0.09);
    text-align: left;
    vertical-align: top;
  }

  .department-report-table th {
    color: var(--navy, #242b78);
    font-size: 0.82rem;
  }

  .department-report-table small {
    display: block;
    margin-top: 3px;
    color: var(--muted, #6a7188);
  }

  .department-impact-list {
    display: grid;
    gap: 9px;
    margin: 0;
    padding-left: 20px;
  }

  .department-impact-list li {
    line-height: 1.6;
  }

  @media print {
    .screen-report-tools,
    .department-report-controls,
    .menu-toggle,
    .top-actions,
    .sidebar,
    .sidebar-scrim {
      display: none !important;
    }

    .department-report-panel {
      box-shadow: none;
      border: 0;
      margin: 0;
      padding: 0;
    }

    .department-report-output {
      display: block;
    }

    .department-report-section,
    .department-kpi-grid div,
    .department-report-cover {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }

  @media (max-width: 900px) {
    .department-report-header,
    .department-two-col,
    .department-report-controls,
    .department-kpi-grid {
      grid-template-columns: 1fr;
      display: grid;
    }
  }
`;

function installStyles() {
  if (document.getElementById("department-report-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "department-report-enhancer-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function number(value) {
  return Number(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(number(value)));
}

function unique(values) {
  return [...new Set(values.flat().filter(Boolean))];
}

function splitVillage(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedPillars(row) {
  return [
    row.ecology_impact ? "Ecology" : null,
    row.society_impact ? "Society" : null,
    row.culture_impact ? "Culture" : null,
    row.economy_impact ? "Economy" : null,
  ].filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDepartmentData() {
  if (departmentDataPromise) return departmentDataPromise;

  departmentDataPromise = (async () => {
    const [{ data: profileRows, error: profileError }, { data: activityRows, error: activityError }] = await Promise.all([
      supabase.from("profiles").select("id,email,name,department,role"),
      supabase.from("activities").select("*"),
    ]);

    if (profileError) throw profileError;
    if (activityError) throw activityError;

    const profiles = profileRows || [];
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const departments = unique(profiles.map((profile) => profile.department || "No department recorded")).sort((a, b) => a.localeCompare(b));

    return {
      profiles,
      profileById,
      activities: activityRows || [],
      departments,
    };
  })();

  return departmentDataPromise;
}

function buildDepartmentReport(data, department) {
  const departmentProfiles = data.profiles.filter((profile) => (profile.department || "No department recorded") === department);
  const profileIds = new Set(departmentProfiles.map((profile) => profile.id));
  const activities = data.activities.filter((activity) => profileIds.has(activity.submitted_by));
  const villages = unique(activities.map((activity) => splitVillage(activity.village)));
  const projects = unique(activities.map((activity) => activity.project_name || "Untitled project"));
  const activityTypes = unique(activities.map((activity) => activity.activity_type || "Other"));
  const targetGroups = unique(activities.map((activity) => activity.target_group));
  const pillars = unique(activities.map(selectedPillars));
  const statuses = unique(activities.map((activity) => activity.approval_status || "pending"));
  const outcomes = activities
    .map((activity) => activity.key_outcome || activity.success_story || activity.future_opportunity || activity.description)
    .filter(Boolean)
    .slice(0, 8);
  const challenges = activities.map((activity) => activity.challenge).filter(Boolean).slice(0, 5);

  const metrics = {
    activities: activities.length,
    users: departmentProfiles.length,
    villages: villages.length,
    projects: projects.length,
    direct: sum(activities, "direct_beneficiaries"),
    indirect: sum(activities, "indirect_beneficiaries"),
    households: sum(activities, "households"),
    women: sum(activities, "women"),
    youth: sum(activities, "youth"),
    children: sum(activities, "children_students"),
    farmers: sum(activities, "farmers"),
    schools: sum(activities, "schools"),
    trainings: sum(activities, "trainings"),
    healthCases: sum(activities, "health_cases"),
    waste: sum(activities, "waste_collected_kg") + sum(activities, "waste_recycled_kg") + sum(activities, "waste_composted_kg"),
  };

  return {
    department,
    departmentProfiles,
    activities,
    villages,
    projects,
    activityTypes,
    targetGroups,
    pillars,
    statuses,
    outcomes,
    challenges,
    metrics,
  };
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + number(row[key]), 0);
}

function renderDepartmentOptions(select, departments) {
  const selected = select.value;
  select.innerHTML = `<option value="">Choose a department...</option>${departments
    .map((department) => `<option value="${escapeHtml(department)}">${escapeHtml(department)}</option>`)
    .join("")}`;

  if (departments.includes(selected)) select.value = selected;
}

function renderChipSection(title, items) {
  const content = items.length ? items.map((item) => `<span>${escapeHtml(item)}</span>`).join("") : `<span>Not recorded</span>`;
  return `<section class="department-report-section"><h4>${escapeHtml(title)}</h4><div class="department-chip-row">${content}</div></section>`;
}

function renderListSection(title, items, emptyText) {
  const content = items.length
    ? `<ul class="department-impact-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<div class="department-report-note">${escapeHtml(emptyText)}</div>`;
  return `<section class="department-report-section"><h4>${escapeHtml(title)}</h4>${content}</section>`;
}

function renderReport(output, report) {
  const totalBeneficiaries = report.metrics.direct + report.metrics.indirect;
  const generatedAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date());
  const kpis = [
    ["Activities", report.metrics.activities],
    ["Team members", report.metrics.users],
    ["Villages", report.metrics.villages],
    ["Projects", report.metrics.projects],
    ["Direct beneficiaries", report.metrics.direct],
    ["Indirect beneficiaries", report.metrics.indirect],
    ["Households", report.metrics.households],
    ["Women", report.metrics.women],
    ["Youth", report.metrics.youth],
    ["Children / students", report.metrics.children],
    ["Farmers", report.metrics.farmers],
    ["Schools", report.metrics.schools],
    ["Trainings", report.metrics.trainings],
    ["Health cases", report.metrics.healthCases],
    ["Waste kg", report.metrics.waste],
  ].filter(([label, value]) => label === "Activities" || label === "Team members" || Number(value) > 0);

  output.innerHTML = `
    <article class="department-report-cover">
      <h2>${escapeHtml(report.department)} Department Impact Report</h2>
      <p>Generated ${escapeHtml(generatedAt)} from RDC dashboard data. This report summarizes the department's submitted activities, villages served, beneficiaries, sustainability pillars, outcomes, and operational contribution.</p>
    </article>

    <div class="department-kpi-grid">
      ${kpis.map(([label, value]) => `<div><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}
    </div>

    <section class="department-report-section">
      <h4>Executive summary</h4>
      <p>${escapeHtml(report.department)} recorded ${formatNumber(report.metrics.activities)} activities across ${formatNumber(report.metrics.villages)} villages, reaching ${formatNumber(totalBeneficiaries)} direct and indirect beneficiaries. The department contributed through ${formatNumber(report.metrics.projects)} projects and worked across ${report.pillars.length ? report.pillars.join(", ") : "pending pillar classification"}.</p>
    </section>

    <div class="department-two-col">
      ${renderChipSection("Team members", report.departmentProfiles.map((profile) => profile.name || profile.email))}
      ${renderChipSection("Villages covered", report.villages)}
      ${renderChipSection("Projects", report.projects)}
      ${renderChipSection("Activity types", report.activityTypes)}
      ${renderChipSection("Target groups", report.targetGroups)}
      ${renderChipSection("Sustainability pillars", report.pillars)}
      ${renderChipSection("Approval status mix", report.statuses)}
    </div>

    <div class="department-two-col">
      ${renderListSection("Main outcomes / impact", report.outcomes, "No outcome text recorded yet for this department.")}
      ${renderListSection("Challenges / learning points", report.challenges, "No challenges recorded yet for this department.")}
    </div>

    <section class="department-report-section">
      <h4>Activities by this department</h4>
      <div class="table-wrap">
        <table class="department-report-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Submitted by</th>
              <th>Project / type</th>
              <th>Village</th>
              <th>Beneficiaries</th>
              <th>Pillars</th>
              <th>Status</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            ${report.activities.map((activity) => renderActivityRow(activity, report)).join("") || `<tr><td colspan="8">No activities are currently linked to users in this department.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderActivityRow(activity, report) {
  const profile = report.departmentProfiles.find((item) => item.id === activity.submitted_by);
  const beneficiaries = number(activity.direct_beneficiaries) + number(activity.indirect_beneficiaries);
  const outcome = activity.key_outcome || activity.success_story || activity.future_opportunity || activity.description || "Pending field data";

  return `
    <tr>
      <td><strong>${escapeHtml(activity.activity_name || "Untitled activity")}</strong><small>${escapeHtml(activity.date_period || "Date not recorded")}</small></td>
      <td>${escapeHtml(profile?.name || profile?.email || "Unknown user")}</td>
      <td>${escapeHtml(activity.project_name || "Untitled project")}<small>${escapeHtml(activity.activity_type || "Other")}</small></td>
      <td>${escapeHtml(activity.village || "Not recorded")}</td>
      <td>${formatNumber(beneficiaries)}</td>
      <td>${escapeHtml(selectedPillars(activity).join(", ") || "Not recorded")}</td>
      <td>${escapeHtml(activity.approval_status || "pending")}</td>
      <td>${escapeHtml(outcome)}</td>
    </tr>
  `;
}

async function initializeDepartmentReport(panel) {
  const select = panel.querySelector(".department-select");
  const output = panel.querySelector(".department-report-output");
  const refreshButton = panel.querySelector(".department-refresh-button");
  const printButton = panel.querySelector(".department-print-button");

  output.innerHTML = `<div class="department-report-note">Loading departments from Supabase...</div>`;

  async function loadAndRenderOptions() {
    departmentDataPromise = null;
    const data = await loadDepartmentData();
    renderDepartmentOptions(select, data.departments);
    output.innerHTML = `<div class="department-report-note">Choose a department to generate its activity report.</div>`;
  }

  await loadAndRenderOptions().catch((error) => {
    output.innerHTML = `<div class="department-report-note">${escapeHtml(error.message || "Could not load department data.")}</div>`;
  });

  select.addEventListener("change", async () => {
    const department = select.value;
    if (!department) {
      output.innerHTML = `<div class="department-report-note">Choose a department to generate its activity report.</div>`;
      return;
    }

    output.innerHTML = `<div class="department-report-note">Generating report...</div>`;
    try {
      const data = await loadDepartmentData();
      renderReport(output, buildDepartmentReport(data, department));
    } catch (error) {
      output.innerHTML = `<div class="department-report-note">${escapeHtml(error.message || "Could not generate report.")}</div>`;
    }
  });

  refreshButton.addEventListener("click", () => loadAndRenderOptions());
  printButton.addEventListener("click", () => window.print());
}

function injectDepartmentReportPanel() {
  const reportsPage = document.querySelector(".reports-page");
  if (!reportsPage || reportsPage.querySelector(".department-report-panel")) return;

  const panel = document.createElement("article");
  panel.className = "department-report-panel screen-report-tools";
  panel.innerHTML = `
    <div class="department-report-header">
      <div>
        <h3>Department activity report</h3>
        <p>Select a department to generate a report with its activities, villages, beneficiaries, sustainability impact, outcomes, and submitted evidence.</p>
      </div>
      <div class="department-report-controls">
        <label>Department
          <select class="department-select"><option value="">Loading...</option></select>
        </label>
        <button type="button" class="secondary department-refresh-button">Refresh</button>
        <button type="button" class="primary department-print-button">Print report</button>
      </div>
    </div>
    <div class="department-report-output"></div>
  `;

  const actionsBar = reportsPage.querySelector(".report-actions-bar");
  actionsBar?.after(panel) || reportsPage.prepend(panel);
  initializeDepartmentReport(panel);
}

function startDepartmentReportEnhancer() {
  installStyles();
  injectDepartmentReportPanel();

  const observer = new MutationObserver(() => injectDepartmentReportPanel());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startDepartmentReportEnhancer);
} else {
  startDepartmentReportEnhancer();
}
