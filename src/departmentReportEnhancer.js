import { supabase } from "./lib/supabaseClient";

let departmentDataPromise = null;

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
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(320px, 0.9fr);
    gap: 16px;
    align-items: start;
    margin-bottom: 16px;
  }

  .department-report-header h3 {
    margin: 0;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
  }

  .department-report-header p,
  .department-selector-help {
    margin: 5px 0 0;
    color: var(--muted, #6a7188);
    line-height: 1.6;
  }

  .department-report-controls {
    display: grid;
    gap: 10px;
  }

  .department-report-controls label {
    color: var(--muted, #6a7188);
    font-size: 0.84rem;
    font-weight: 800;
  }

  .department-report-controls input {
    margin-top: 6px;
  }

  .department-checkbox-list {
    display: grid;
    max-height: 230px;
    overflow: auto;
    gap: 7px;
    padding: 10px;
    border: 1px solid var(--line, #dde3ef);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.76);
  }

  .department-checkbox-list label {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px 10px;
    color: var(--ink, #172033);
    border-radius: 12px;
    background: white;
    font-size: 0.88rem;
    font-weight: 800;
  }

  .department-checkbox-list input {
    width: auto;
    margin: 2px 0 0;
  }

  .department-control-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
    .department-kpi-grid {
      grid-template-columns: 1fr;
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

function departmentValue(profile) {
  return profile.department || "No department recorded";
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
    const departments = unique(profiles.map(departmentValue)).sort((a, b) => a.localeCompare(b));

    return {
      profiles,
      activities: activityRows || [],
      departments,
    };
  })();

  return departmentDataPromise;
}

function buildDepartmentReport(data, selectedDepartments, reportName) {
  const selectedSet = new Set(selectedDepartments);
  const departmentProfiles = data.profiles.filter((profile) => selectedSet.has(departmentValue(profile)));
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
    title: reportName || selectedDepartments.join(" + "),
    selectedDepartments,
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

function renderDepartmentCheckboxes(container, departments) {
  const selected = new Set(getSelectedDepartments(container));
  container.innerHTML = departments
    .map((department) => {
      const checked = selected.has(department) ? "checked" : "";
      return `<label><input type="checkbox" value="${escapeHtml(department)}" ${checked} /> <span>${escapeHtml(department)}</span></label>`;
    })
    .join("");
}

function getSelectedDepartments(container) {
  return [...container.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
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
    ["Department name variants", report.selectedDepartments.length],
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
  ].filter(([label, value]) => ["Activities", "Team members", "Department name variants"].includes(label) || Number(value) > 0);

  output.innerHTML = `
    <article class="department-report-cover">
      <h2>${escapeHtml(report.title)} Impact Report</h2>
      <p>Generated ${escapeHtml(generatedAt)} from RDC dashboard data. This report combines the selected department name variants and summarizes their activities, villages, beneficiaries, sustainability impact, outcomes, and operational contribution.</p>
    </article>

    <div class="department-kpi-grid">
      ${kpis.map(([label, value]) => `<div><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}
    </div>

    <section class="department-report-section">
      <h4>Executive summary</h4>
      <p>${escapeHtml(report.title)} recorded ${formatNumber(report.metrics.activities)} activities across ${formatNumber(report.metrics.villages)} villages, reaching ${formatNumber(totalBeneficiaries)} direct and indirect beneficiaries. This report merged ${formatNumber(report.selectedDepartments.length)} written department variant(s): ${escapeHtml(report.selectedDepartments.join(", "))}.</p>
    </section>

    <div class="department-two-col">
      ${renderChipSection("Selected department variants", report.selectedDepartments)}
      ${renderChipSection("Team members", report.departmentProfiles.map((profile) => profile.name || profile.email))}
      ${renderChipSection("Villages covered", report.villages)}
      ${renderChipSection("Projects", report.projects)}
      ${renderChipSection("Activity types", report.activityTypes)}
      ${renderChipSection("Target groups", report.targetGroups)}
      ${renderChipSection("Sustainability pillars", report.pillars)}
      ${renderChipSection("Approval status mix", report.statuses)}
    </div>

    <div class="department-two-col">
      ${renderListSection("Main outcomes / impact", report.outcomes, "No outcome text recorded yet for this department group.")}
      ${renderListSection("Challenges / learning points", report.challenges, "No challenges recorded yet for this department group.")}
    </div>

    <section class="department-report-section">
      <h4>Activities by this department group</h4>
      <div class="table-wrap">
        <table class="department-report-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Submitted by</th>
              <th>Written department</th>
              <th>Project / type</th>
              <th>Village</th>
              <th>Beneficiaries</th>
              <th>Pillars</th>
              <th>Status</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            ${report.activities.map((activity) => renderActivityRow(activity, report)).join("") || `<tr><td colspan="9">No activities are currently linked to users in the selected department names.</td></tr>`}
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
      <td>${escapeHtml(departmentValue(profile || {}))}</td>
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
  const checkboxList = panel.querySelector(".department-checkbox-list");
  const reportNameInput = panel.querySelector(".department-report-name");
  const output = panel.querySelector(".department-report-output");
  const refreshButton = panel.querySelector(".department-refresh-button");
  const generateButton = panel.querySelector(".department-generate-button");
  const clearButton = panel.querySelector(".department-clear-button");
  const printButton = panel.querySelector(".department-print-button");

  output.innerHTML = `<div class="department-report-note">Loading departments from Supabase...</div>`;

  async function loadAndRenderOptions() {
    departmentDataPromise = null;
    const data = await loadDepartmentData();
    renderDepartmentCheckboxes(checkboxList, data.departments);
    output.innerHTML = `<div class="department-report-note">Select one or more department name variants, then generate the report. Use this when the same department was written in different ways.</div>`;
  }

  await loadAndRenderOptions().catch((error) => {
    output.innerHTML = `<div class="department-report-note">${escapeHtml(error.message || "Could not load department data.")}</div>`;
  });

  generateButton.addEventListener("click", async () => {
    const selectedDepartments = getSelectedDepartments(checkboxList);
    if (!selectedDepartments.length) {
      output.innerHTML = `<div class="department-report-note">Select at least one department name.</div>`;
      return;
    }

    output.innerHTML = `<div class="department-report-note">Generating combined department report...</div>`;
    try {
      const data = await loadDepartmentData();
      renderReport(output, buildDepartmentReport(data, selectedDepartments, reportNameInput.value.trim()));
    } catch (error) {
      output.innerHTML = `<div class="department-report-note">${escapeHtml(error.message || "Could not generate report.")}</div>`;
    }
  });

  refreshButton.addEventListener("click", () => loadAndRenderOptions());
  clearButton.addEventListener("click", () => {
    checkboxList.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.checked = false;
    });
    reportNameInput.value = "";
    output.innerHTML = `<div class="department-report-note">Selection cleared. Choose one or more department name variants to generate a report.</div>`;
  });
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
        <p>Select one or more written department names and generate one combined report. This handles spelling differences such as the same department entered with different names.</p>
      </div>
      <div class="department-report-controls">
        <label>Report name
          <input class="department-report-name" placeholder="Example: Rural Development Department" />
        </label>
        <div>
          <strong>Department names to combine</strong>
          <p class="department-selector-help">Tick all names that should be treated as the same department.</p>
          <div class="department-checkbox-list">Loading...</div>
        </div>
        <div class="department-control-buttons">
          <button type="button" class="primary department-generate-button">Generate report</button>
          <button type="button" class="secondary department-refresh-button">Refresh</button>
          <button type="button" class="secondary department-clear-button">Clear</button>
          <button type="button" class="secondary department-print-button">Print report</button>
        </div>
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
