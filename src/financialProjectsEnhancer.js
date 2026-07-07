import { supabase } from "./lib/supabaseClient";

let financialRowsCache = null;
let currentYear = 2026;

const statusOptions = [
  ["running", "Running Project"],
  ["accepted_to_launch", "Accepted, to be launched"],
  ["ongoing", "Ongoing proposal"],
  ["phase_1", "Phase 1"],
  ["exploration", "Exploration"],
  ["postponed_cancelled", "Postponed / Cancelled"],
  ["not_accepted", "Not Accepted"],
  ["accepted", "Accepted"],
  ["phase_2", "Phase 2"],
];

const pipelineColors = {
  ongoing: "#6d6ab2",
  phase_1: "#82d6d1",
  exploration: "#ff7b8c",
  postponed_cancelled: "#a877c7",
  not_accepted: "#f6d84b",
  accepted: "#67c935",
  phase_2: "#ff9b3d",
  running: "#67c935",
  accepted_to_launch: "#a877c7",
};

const defaultSectors = [
  "Agriculture & Food Systems",
  "Community Development & Social Impact",
  "Education & Capacity Building",
  "Entrepreneurship & Innovation",
  "Environment & Natural Resources",
  "Policy & Ecosystem Development",
  "Health & Wellbeing",
  "Other",
];

const css = `
  .financial-projects-nav-button {
    position: relative;
  }

  body.external-financial-view main.workspace > *:not(.topbar):not(.app-message):not(.role-notice):not(.financial-projects-page) {
    display: none !important;
  }

  .financial-projects-page {
    display: grid;
    gap: 14px;
    color: #26313d;
  }

  .financial-header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin: 4px 0 6px;
  }

  .financial-title-block h2 {
    margin: 0;
    color: #26313d;
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.03em;
  }

  .financial-title-block p {
    margin: 6px 0 0;
    color: #697386;
    line-height: 1.55;
  }

  .financial-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .financial-actions button,
  .financial-modal-actions button {
    border: 0;
    border-radius: 10px;
    padding: 10px 14px;
    font-weight: 900;
    cursor: pointer;
  }

  .financial-primary {
    background: #ff8d2a;
    color: white;
  }

  .financial-secondary {
    background: #eef2f7;
    color: #26313d;
  }

  .financial-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  .financial-card {
    min-height: 170px;
    padding: 16px 18px;
    border: 1px solid #e7eaee;
    border-radius: 6px;
    background: white;
  }

  .financial-card h3 {
    margin: 0 0 12px;
    color: #34404b;
    font-size: 0.98rem;
    font-weight: 900;
  }

  .financial-donut-card {
    display: grid;
    align-items: center;
    justify-items: center;
  }

  .financial-donut {
    --color: #67c935;
    --track: #eef1f4;
    width: min(220px, 70vw);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: conic-gradient(var(--color) 0 360deg);
  }

  .financial-donut.pipeline {
    background: conic-gradient(var(--segments));
  }

  .financial-donut-inner {
    width: 44%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: white;
    text-align: center;
  }

  .financial-donut-inner strong {
    display: block;
    color: #26313d;
    font-size: 1.25rem;
    line-height: 1;
  }

  .financial-donut-inner span {
    display: block;
    margin-top: 3px;
    color: #687386;
    font-size: 0.72rem;
    font-weight: 800;
  }

  .financial-money-card {
    display: grid;
    align-content: center;
    position: relative;
  }

  .financial-money-card strong {
    display: block;
    color: #26313d;
    font-size: clamp(2.1rem, 5vw, 4.1rem);
    font-weight: 900;
    letter-spacing: -0.06em;
    white-space: nowrap;
  }

  .financial-note {
    position: absolute;
    right: 14px;
    top: 14px;
    max-width: 150px;
    padding: 9px 12px;
    color: #1f2a32;
    background: #ff9a3d;
    font-size: 0.82rem;
    font-weight: 800;
    line-height: 1.25;
  }

  .financial-wide {
    grid-column: span 2;
    min-height: 340px;
  }

  .financial-pipeline-card {
    display: grid;
    grid-template-columns: minmax(180px, 0.95fr) minmax(220px, 1.05fr);
    align-items: center;
    gap: 12px;
  }

  .financial-legend {
    display: grid;
    gap: 8px;
  }

  .financial-legend-row {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    color: #34404b;
    font-weight: 800;
  }

  .financial-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--dot, #6d6ab2);
  }

  .financial-sector-bars {
    display: grid;
    gap: 11px;
    margin-top: 4px;
  }

  .financial-sector-row {
    display: grid;
    grid-template-columns: minmax(160px, 1fr) minmax(140px, 1.3fr) 28px;
    gap: 8px;
    align-items: center;
    color: #6b7280;
    font-size: 0.83rem;
  }

  .financial-bar-track {
    height: 28px;
    background: #eef3f7;
  }

  .financial-bar-track span {
    display: block;
    width: var(--w, 0%);
    height: 100%;
    background: #29a9e1;
  }

  .financial-table-card {
    grid-column: 1 / -1;
    min-height: auto;
  }

  .financial-table {
    width: 100%;
    min-width: 980px;
    border-collapse: collapse;
  }

  .financial-table th,
  .financial-table td {
    padding: 11px 12px;
    border-bottom: 1px solid #edf0f3;
    text-align: left;
    vertical-align: top;
  }

  .financial-table th {
    color: #34404b;
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  .financial-status-pill {
    display: inline-flex;
    padding: 5px 8px;
    border-radius: 999px;
    color: #26313d;
    background: #eef2f7;
    font-size: 0.77rem;
    font-weight: 900;
  }

  .financial-empty {
    padding: 18px;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    background: #f8fafc;
    color: #5f6c7b;
    line-height: 1.65;
  }

  .financial-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 18px;
    background: rgba(16, 24, 40, 0.52);
  }

  .financial-modal {
    width: min(760px, 100%);
    max-height: min(90vh, 820px);
    overflow: auto;
    padding: 22px;
    border-radius: 20px;
    background: white;
    box-shadow: 0 28px 80px rgba(16, 24, 40, 0.26);
  }

  .financial-modal h3 {
    margin: 0 0 6px;
    color: #26313d;
    font-size: 1.4rem;
  }

  .financial-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .financial-form-grid label {
    color: #5f6c7b;
    font-size: 0.84rem;
    font-weight: 900;
  }

  .financial-form-grid input,
  .financial-form-grid select,
  .financial-form-grid textarea {
    width: 100%;
    margin-top: 6px;
    padding: 10px 11px;
    border: 1px solid #d8dee8;
    border-radius: 10px;
    font: inherit;
  }

  .financial-form-grid textarea,
  .financial-span-2 {
    grid-column: span 2;
  }

  .financial-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  @media (max-width: 1120px) {
    .financial-dashboard-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .financial-dashboard-grid,
    .financial-pipeline-card,
    .financial-form-grid,
    .financial-header-row {
      grid-template-columns: 1fr;
      display: grid;
    }

    .financial-wide,
    .financial-form-grid textarea,
    .financial-span-2 {
      grid-column: span 1;
    }

    .financial-money-card strong {
      font-size: 2.1rem;
    }

    .financial-note {
      position: static;
      margin-bottom: 12px;
    }
  }
`;

function installStyles() {
  if (document.getElementById("financial-projects-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "financial-projects-enhancer-style";
  style.textContent = css;
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

function euro(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(number(value));
}

function statusLabel(status) {
  return statusOptions.find(([value]) => value === status)?.[1] || status || "Not set";
}

function normalizeRow(row) {
  return {
    ...row,
    status: row.status || "running",
    sector: row.sector || "Other",
    entity: row.entity || "HU",
    amount_eur: number(row.amount_eur),
    project_year: Number(row.project_year || currentYear),
  };
}

async function loadFinancialRows(force = false) {
  if (financialRowsCache && !force) return financialRowsCache;
  const { data, error } = await supabase
    .from("financial_projects")
    .select("*")
    .eq("project_year", currentYear)
    .order("created_at", { ascending: false });
  if (error) throw error;
  financialRowsCache = (data || []).map(normalizeRow);
  return financialRowsCache;
}

function summarize(rows) {
  const running = rows.filter((row) => row.status === "running");
  const acceptedToLaunch = rows.filter((row) => row.status === "accepted_to_launch");
  const pipeline = rows.filter((row) => row.status !== "running" && row.status !== "accepted_to_launch");
  const totalActive = running.reduce((total, row) => total + number(row.amount_eur), 0);
  const huActive = running.filter((row) => String(row.entity).toLowerCase() === "hu").reduce((total, row) => total + number(row.amount_eur), 0);
  const pipelineCounts = countBy(pipeline, "status");
  const sectorCounts = countBy(rows, "sector");
  return { running, acceptedToLaunch, pipeline, totalActive, huActive, pipelineCounts, sectorCounts };
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "Other";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function donutCard(title, count, color) {
  return `
    <section class="financial-card financial-donut-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="financial-donut" style="--color:${color}">
        <div class="financial-donut-inner"><strong>${count}</strong><span>Total</span></div>
      </div>
    </section>
  `;
}

function pipelineDonutSegments(counts) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  let cursor = 0;
  const segments = entries.map(([status, count]) => {
    const start = cursor;
    const end = cursor + (count / total) * 360;
    cursor = end;
    return `${pipelineColors[status] || "#9aa4b2"} ${start}deg ${end}deg`;
  });
  return segments.length ? segments.join(", ") : "#eef1f4 0deg 360deg";
}

function renderPipeline(summary) {
  const counts = summary.pipelineCounts;
  const total = summary.pipeline.length;
  const ordered = ["ongoing", "phase_1", "exploration", "postponed_cancelled", "not_accepted", "accepted", "phase_2"].filter((status) => counts[status]);
  return `
    <section class="financial-card financial-wide financial-pipeline-card">
      <div>
        <h3>Proposals Pipeline</h3>
        <div class="financial-legend">
          ${ordered.map((status) => `<div class="financial-legend-row"><span class="financial-legend-dot" style="--dot:${pipelineColors[status]}"></span><span>${escapeHtml(statusLabel(status))}</span><strong>${Math.round((counts[status] / Math.max(total, 1)) * 100)}%</strong></div>`).join("") || `<div class="financial-empty">No proposal pipeline data yet.</div>`}
        </div>
      </div>
      <div class="financial-donut pipeline" style="--segments:${pipelineDonutSegments(counts)}">
        <div class="financial-donut-inner"><strong>${total}</strong><span>Total</span></div>
      </div>
    </section>
  `;
}

function renderSectors(summary) {
  const entries = Object.entries(summary.sectorCounts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return `
    <section class="financial-card financial-wide">
      <h3>Count Sectors</h3>
      <div class="financial-sector-bars">
        ${entries.map(([sector, count]) => `<div class="financial-sector-row"><span>${escapeHtml(sector)}</span><div class="financial-bar-track"><span style="--w:${Math.max(4, (count / max) * 100)}%"></span></div><b>${count}</b></div>`).join("") || `<div class="financial-empty">No sector data yet.</div>`}
      </div>
    </section>
  `;
}

function renderTable(rows) {
  return `
    <section class="financial-card financial-table-card">
      <h3>Financial projects data</h3>
      <div class="table-wrap">
        <table class="financial-table">
          <thead><tr><th>Project</th><th>Status</th><th>Sector</th><th>Entity</th><th>Amount</th><th>Notes</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr><td><strong>${escapeHtml(row.project_name)}</strong><br><small>${row.project_year}</small></td><td><span class="financial-status-pill">${escapeHtml(statusLabel(row.status))}</span></td><td>${escapeHtml(row.sector)}</td><td>${escapeHtml(row.entity)}</td><td>${euro(row.amount_eur)}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("") || `<tr><td colspan="6">No financial project data added yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderDashboard(container, rows) {
  const summary = summarize(rows);
  container.innerHTML = `
    <div class="financial-header-row">
      <div class="financial-title-block">
        <h2>Externally Funded Projects (${currentYear})</h2>
        <p>Financial portfolio dashboard for running projects, accepted projects to be launched, proposal pipeline, active portfolio value, and sector distribution.</p>
      </div>
      <div class="financial-actions">
        <button type="button" class="financial-secondary financial-refresh">Refresh</button>
        <button type="button" class="financial-primary financial-add">Add financial project data</button>
      </div>
    </div>
    <div class="financial-dashboard-grid">
      ${donutCard("Running Projects", summary.running.length, "#67c935")}
      ${donutCard("Accepted, to be launched", summary.acceptedToLaunch.length, "#a877c7")}
      <section class="financial-card financial-money-card"><span class="financial-note">Don’t include the ${summary.acceptedToLaunch.length} to be launched</span><h3>Total active portfolio (all entities)</h3><strong>${euro(summary.totalActive)}</strong></section>
      <section class="financial-card financial-money-card"><h3>Active Portfolio Size (HU)</h3><strong>${euro(summary.huActive)}</strong></section>
      ${renderPipeline(summary)}
      ${renderSectors(summary)}
      ${renderTable(rows)}
    </div>
  `;

  container.querySelector(".financial-add")?.addEventListener("click", openFinancialModal);
  container.querySelector(".financial-refresh")?.addEventListener("click", () => openFinancialPage(true));
}

function renderMissingTable(container, error) {
  container.innerHTML = `
    <div class="financial-header-row">
      <div class="financial-title-block"><h2>Externally Funded Projects (${currentYear})</h2><p>Financial dashboard is ready, but the Supabase table must be created first.</p></div>
    </div>
    <div class="financial-empty">
      Could not load <strong>financial_projects</strong>. Run the SQL migration in Supabase first.<br><br>
      Error: ${escapeHtml(error.message || "Unknown error")}
    </div>
  `;
}

async function openFinancialPage(force = false) {
  document.body.classList.add("external-financial-view");
  document.querySelectorAll(".sidebar nav button").forEach((button) => button.classList.remove("active"));
  document.querySelector(".financial-projects-nav-button")?.classList.add("active");

  const workspace = document.querySelector("main.workspace");
  const topbar = workspace?.querySelector(".topbar");
  if (!workspace || !topbar) return;

  const title = topbar.querySelector("h1");
  const subtitle = topbar.querySelector("p");
  if (title) title.textContent = "Financial Projects";
  if (subtitle) subtitle.textContent = "Externally funded project portfolio and proposal pipeline.";

  let page = workspace.querySelector(".financial-projects-page");
  if (!page) {
    page = document.createElement("section");
    page.className = "financial-projects-page";
    const anchor = workspace.querySelector(".role-notice") || workspace.querySelector(".app-message") || topbar;
    anchor.after(page);
  }

  page.innerHTML = `<div class="financial-empty">Loading financial dashboard...</div>`;
  try {
    renderDashboard(page, await loadFinancialRows(force));
  } catch (error) {
    renderMissingTable(page, error);
  }
}

function closeFinancialView() {
  document.body.classList.remove("external-financial-view");
  document.querySelector(".financial-projects-page")?.remove();
}

function addFinancialNavButton() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || nav.querySelector(".financial-projects-nav-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "financial-projects-nav-button";
  button.innerHTML = `<span style="font-weight:900;font-size:17px;line-height:1">€</span> Financial Projects`;
  button.addEventListener("click", () => {
    openFinancialPage();
    document.querySelector(".app-shell")?.classList.remove("sidebar-open");
  });
  nav.appendChild(button);

  nav.querySelectorAll("button:not(.financial-projects-nav-button)").forEach((navButton) => {
    navButton.addEventListener("click", closeFinancialView);
  });
}

function openFinancialModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "financial-modal-backdrop";
  backdrop.innerHTML = `
    <form class="financial-modal">
      <h3>Add financial project data</h3>
      <p class="financial-empty">Enter the project details. The dashboard will update immediately after saving.</p>
      <div class="financial-form-grid">
        <label class="financial-span-2">Project name<input name="project_name" required placeholder="Project title" /></label>
        <label>Status<select name="status">${statusOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
        <label>Sector<select name="sector">${defaultSectors.map((sector) => `<option>${sector}</option>`).join("")}</select></label>
        <label>Entity<select name="entity"><option>HU</option><option>SEKEM</option><option>EBDA</option><option>All entities</option><option>Other</option></select></label>
        <label>Amount EUR<input name="amount_eur" type="number" min="0" step="0.01" placeholder="0.00" /></label>
        <label>Year<input name="project_year" type="number" min="2020" max="2100" value="${currentYear}" /></label>
        <label class="financial-span-2">Notes<textarea name="notes" placeholder="Optional details, donor, launch notes, or exclusions"></textarea></label>
      </div>
      <div class="financial-modal-actions">
        <button type="button" class="financial-secondary financial-cancel">Cancel</button>
        <button type="submit" class="financial-primary">Save data</button>
      </div>
    </form>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector(".financial-cancel")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
  backdrop.querySelector("form")?.addEventListener("submit", handleFinancialSubmit);
}

async function handleFinancialSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  const formData = new FormData(form);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    project_name: String(formData.get("project_name") || "").trim(),
    status: String(formData.get("status") || "running"),
    sector: String(formData.get("sector") || "Other"),
    entity: String(formData.get("entity") || "HU"),
    amount_eur: number(formData.get("amount_eur")),
    project_year: Number(formData.get("project_year") || currentYear),
    notes: String(formData.get("notes") || "").trim(),
    created_by: user?.id || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("financial_projects").insert(payload);
  if (error) {
    submitButton.disabled = false;
    submitButton.textContent = "Save data";
    form.querySelector(".financial-empty").innerHTML = `Could not save data: ${escapeHtml(error.message)}`;
    return;
  }

  form.closest(".financial-modal-backdrop")?.remove();
  financialRowsCache = null;
  currentYear = payload.project_year;
  openFinancialPage(true);
}

function startFinancialProjectsEnhancer() {
  installStyles();
  addFinancialNavButton();

  const observer = new MutationObserver(() => addFinancialNavButton());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFinancialProjectsEnhancer);
} else {
  startFinancialProjectsEnhancer();
}
