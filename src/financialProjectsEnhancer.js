import { supabase } from "./lib/supabaseClient";

let financialRowsCache = null;
let availableYearsCache = null;
let currentYear = 2026;

const PORTFOLIO_OWNER = "HU";
const ACTIVE_PORTFOLIO_ENTITY = "HU";

const statusOptions = [
  ["running", "Running Project"],
  ["completed", "Completed"],
  ["accepted_to_launch", "Accepted, to be launched"],
  ["ongoing", "Ongoing"],
  ["phase_1", "Phase 1"],
  ["exploration", "Exploration"],
  ["postponed_cancelled", "Postponed / Cancelled"],
  ["not_accepted", "Not Accepted"],
  ["accepted", "Accepted"],
  ["phase_2", "Phase 2"],
];

const pipelineOrder = ["ongoing", "phase_1", "exploration", "postponed_cancelled", "not_accepted", "accepted", "phase_2"];
const pipelineColors = {
  ongoing: "#6966b3",
  phase_1: "#83d8d2",
  exploration: "#ff7d90",
  postponed_cancelled: "#a675c5",
  not_accepted: "#f5d64a",
  accepted: "#68c934",
  phase_2: "#ff9b3d",
  running: "#68c934",
  completed: "#94a3b8",
  accepted_to_launch: "#a675c5",
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
  .financial-projects-nav-button { position: relative; }
  body.external-financial-view main.workspace > *:not(.topbar):not(.financial-projects-page) { display: none !important; }
  .financial-projects-page { display: grid; gap: 14px; color: #26313d; }
  .financial-dashboard-shell { display: grid; gap: 8px; width: 100%; }
  .financial-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin: 2px 0 4px; }
  .financial-title-block h2 { margin: 0; color: #25303b; font-size: clamp(1.35rem, 3vw, 2rem); font-weight: 900; letter-spacing: -0.035em; }
  .financial-title-block p { margin: 5px 0 0; color: #697386; line-height: 1.45; }
  .financial-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: flex-end; }
  .financial-actions button, .financial-modal-actions button { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 900; cursor: pointer; }
  .financial-primary { background: #ff8d2a; color: white; }
  .financial-secondary { background: #eef2f7; color: #26313d; }
  .financial-year-control { display: grid; gap: 5px; min-width: 132px; color: #5f6c7b; font-size: 0.78rem; font-weight: 900; }
  .financial-year-control select { height: 38px; padding: 8px 36px 8px 11px; border: 1px solid #d8dee8; border-radius: 10px; background: white; color: #26313d; font-weight: 900; }
  .financial-dashboard-grid { display: grid; grid-template-columns: minmax(210px, 1fr) minmax(210px, 1fr) minmax(330px, 1.42fr); gap: 8px; align-items: stretch; }
  .financial-second-row { display: grid; grid-template-columns: minmax(420px, 1.55fr) minmax(360px, 1fr); gap: 8px; align-items: stretch; }
  .financial-card { min-height: 170px; padding: 16px 18px; border: 1px solid #e5e8ed; border-radius: 8px; background: #fff; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.045); }
  .financial-card h3 { margin: 0 0 12px; color: #34404b; font-size: 0.98rem; font-weight: 900; }
  .financial-donut-card { display: grid; grid-template-rows: auto 1fr; justify-items: center; }
  .financial-donut-card h3 { justify-self: start; width: 100%; }
  .financial-donut-wrap { display: grid; place-items: center; width: 100%; }
  .financial-donut { --color: #68c934; width: min(220px, 70vw); aspect-ratio: 1; display: grid; place-items: center; border-radius: 50%; background: conic-gradient(var(--color) 0 360deg); }
  .financial-donut.pipeline { background: conic-gradient(var(--segments)); }
  .financial-donut-inner { width: 44%; aspect-ratio: 1; display: grid; place-items: center; border-radius: 50%; background: white; text-align: center; }
  .financial-donut-inner strong { display: block; color: #26313d; font-size: 1.28rem; line-height: 1; font-weight: 900; }
  .financial-donut-inner span { display: block; margin-top: 3px; color: #687386; font-size: 0.72rem; font-weight: 800; }
  .financial-portfolio-card { position: relative; display: grid; gap: 10px; align-content: center; }
  .financial-portfolio-main, .financial-portfolio-sub { display: grid; gap: 4px; }
  .financial-portfolio-main strong, .financial-portfolio-sub strong { display: block; color: #26313d; font-weight: 900; letter-spacing: -0.06em; white-space: nowrap; }
  .financial-portfolio-main strong { font-size: clamp(2.15rem, 4.7vw, 3.75rem); }
  .financial-portfolio-sub { padding-top: 12px; border-top: 1px solid #e5e8ed; }
  .financial-portfolio-sub h3 { margin-bottom: 2px; }
  .financial-portfolio-sub strong { font-size: clamp(1.55rem, 3.7vw, 2.95rem); }
  .financial-sub-entity { color: #697386; font-size: 0.78rem; font-weight: 900; text-transform: uppercase; }
  .financial-note { position: absolute; right: 14px; top: 14px; max-width: 180px; padding: 9px 12px; color: #1f2a32; background: #ff9a3d; font-size: 0.82rem; font-weight: 850; line-height: 1.25; }
  .financial-pipeline-card { display: grid; grid-template-columns: minmax(210px, 0.95fr) minmax(230px, 1.05fr); align-items: center; gap: 12px; min-height: 340px; }
  .financial-legend { display: grid; gap: 8px; }
  .financial-legend-row { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; gap: 8px; align-items: center; color: #34404b; font-weight: 850; }
  .financial-legend-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--dot, #6966b3); }
  .financial-sector-card { min-height: 340px; }
  .financial-sector-bars { display: grid; gap: 11px; margin-top: 6px; }
  .financial-sector-row { display: grid; grid-template-columns: minmax(155px, 1fr) minmax(130px, 1.35fr) 34px; gap: 8px; align-items: center; color: #5f6b7a; font-size: 0.83rem; }
  .financial-bar-track { height: 27px; background: #eef3f7; }
  .financial-bar-track span { display: block; width: var(--w, 0%); height: 100%; background: #29a9e1; }
  .financial-sector-row b { color: #34404b; font-size: 0.78rem; }
  .financial-table-card { min-height: auto; }
  .financial-table { width: 100%; min-width: 1140px; border-collapse: collapse; }
  .financial-table th, .financial-table td { padding: 11px 12px; border-bottom: 1px solid #edf0f3; text-align: left; vertical-align: top; }
  .financial-table th { color: #34404b; font-size: 0.78rem; text-transform: uppercase; }
  .financial-status-pill { display: inline-flex; padding: 5px 8px; border-radius: 999px; color: #26313d; background: #eef2f7; font-size: 0.77rem; font-weight: 900; }
  .financial-empty { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; color: #5f6c7b; line-height: 1.65; }
  .financial-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 18px; background: rgba(16, 24, 40, 0.52); }
  .financial-modal { width: min(780px, 100%); max-height: min(90vh, 820px); overflow: auto; padding: 22px; border-radius: 20px; background: white; box-shadow: 0 28px 80px rgba(16, 24, 40, 0.26); }
  .financial-modal h3 { margin: 0 0 6px; color: #26313d; font-size: 1.4rem; }
  .financial-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
  .financial-form-grid label { color: #5f6c7b; font-size: 0.84rem; font-weight: 900; }
  .financial-form-grid input, .financial-form-grid select, .financial-form-grid textarea { width: 100%; margin-top: 6px; padding: 10px 11px; border: 1px solid #d8dee8; border-radius: 10px; font: inherit; }
  .financial-form-grid textarea, .financial-span-2 { grid-column: span 2; }
  .financial-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  @media (max-width: 1120px) { .financial-dashboard-grid, .financial-second-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } .financial-portfolio-card, .financial-pipeline-card, .financial-sector-card { grid-column: 1 / -1; } }
  @media (max-width: 760px) { .financial-dashboard-grid, .financial-second-row, .financial-pipeline-card, .financial-form-grid, .financial-header-row { grid-template-columns: 1fr !important; display: grid; } .financial-form-grid textarea, .financial-span-2 { grid-column: span 1; } .financial-actions { grid-template-columns: 1fr 1fr; display: grid; } .financial-year-control { grid-column: 1 / -1; } .financial-card { min-height: auto; padding: 14px; } .financial-donut { width: min(190px, 62vw); } .financial-portfolio-main strong, .financial-portfolio-sub strong { white-space: normal; } .financial-note { position: static; max-width: none; width: fit-content; margin-bottom: 6px; } .financial-sector-row { grid-template-columns: 1fr; gap: 5px; } }
`;

function installStyles() {
  if (document.getElementById("financial-projects-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "financial-projects-enhancer-style";
  style.textContent = css;
  document.head.appendChild(style);
}
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function number(value) { return Number(value || 0); }
function euro(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(number(value)); }
function statusLabel(status) { return statusOptions.find(([value]) => value === status)?.[1] || status || "Not set"; }
function startYear(row) { return Number(row.start_year || row.project_year || currentYear); }
function endYear(row) { return Number(row.end_year || row.project_year || startYear(row)); }
function totalBudget(row) { return number(row.total_budget_eur ?? row.amount_eur); }
function annualAmount(row) { return number(row.annual_amount_eur || 0); }
function isActiveInYear(row, year = currentYear) { return startYear(row) <= year && endYear(row) >= year; }
function isRelevantInYear(row, year = currentYear) { return isActiveInYear(row, year) || Number(row.project_year || 0) === year; }

function normalizeRow(row) {
  const normalized = {
    ...row,
    status: row.status || "running",
    sector: row.sector || "Other",
    entity: row.entity || ACTIVE_PORTFOLIO_ENTITY,
    amount_eur: number(row.amount_eur),
    total_budget_eur: number(row.total_budget_eur ?? row.amount_eur),
    annual_amount_eur: number(row.annual_amount_eur || 0),
    project_year: Number(row.project_year || row.start_year || currentYear),
    start_year: Number(row.start_year || row.project_year || currentYear),
    end_year: Number(row.end_year || row.project_year || row.start_year || currentYear),
  };
  if (normalized.end_year < normalized.start_year) normalized.end_year = normalized.start_year;
  return normalized;
}

function normalizedAvailableYears() {
  const years = new Set([currentYear, ...(availableYearsCache || [])]);
  return [...years].filter(Boolean).sort((a, b) => b - a);
}

function deriveYears(rows) {
  const years = new Set([currentYear]);
  rows.forEach((row) => {
    const first = startYear(row);
    const last = endYear(row);
    for (let year = first; year <= last; year += 1) years.add(year);
    if (row.project_year) years.add(Number(row.project_year));
  });
  return [...years].filter(Boolean).sort((a, b) => b - a);
}

async function loadAllFinancialRows(force = false) {
  if (financialRowsCache && !force) return financialRowsCache;
  const { data, error } = await supabase.from("financial_projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  financialRowsCache = (data || []).map(normalizeRow);
  availableYearsCache = deriveYears(financialRowsCache);
  return financialRowsCache;
}
async function loadAvailableYears(force = false) { await loadAllFinancialRows(force); return availableYearsCache; }
async function loadFinancialRows(force = false) { return (await loadAllFinancialRows(force)).filter((row) => isRelevantInYear(row)); }

function summarize(rows) {
  const active = rows.filter((row) => isActiveInYear(row) && row.status !== "completed");
  const running = active.filter((row) => row.status === "running");
  const acceptedToLaunch = rows.filter((row) => row.status === "accepted_to_launch" && isRelevantInYear(row));
  const pipeline = rows.filter((row) => pipelineOrder.includes(row.status) && isRelevantInYear(row));
  const totalActive = running.reduce((total, row) => total + totalBudget(row), 0);
  const activePortfolioSize = running.filter((row) => String(row.entity || "").toLowerCase() === ACTIVE_PORTFOLIO_ENTITY.toLowerCase()).reduce((total, row) => total + totalBudget(row), 0);
  const annualForYear = running.reduce((total, row) => total + annualAmount(row), 0);
  const pipelineCounts = countBy(pipeline, "status");
  const sectorCounts = countBy(rows.filter((row) => row.status !== "completed"), "sector");
  return { running, acceptedToLaunch, pipeline, totalActive, activePortfolioSize, annualForYear, pipelineCounts, sectorCounts };
}
function countBy(rows, key) { return rows.reduce((acc, row) => { const value = row[key] || "Other"; acc[value] = (acc[value] || 0) + 1; return acc; }, {}); }
function renderYearOptions() { return normalizedAvailableYears().map((year) => `<option value="${year}" ${year === currentYear ? "selected" : ""}>${year}</option>`).join(""); }
function donutCard(title, count, color) { return `<section class="financial-card financial-donut-card"><h3>${escapeHtml(title)}</h3><div class="financial-donut-wrap"><div class="financial-donut" style="--color:${color}"><div class="financial-donut-inner"><strong>${count}</strong><span>Total</span></div></div></div></section>`; }
function renderPortfolioCard(summary) {
  return `<section class="financial-card financial-portfolio-card"><span class="financial-note">Active portfolio uses total project budget once. Annual amount is only what belongs to ${currentYear}.</span><div class="financial-portfolio-main"><h3>Total active portfolio (all entities)</h3><strong>${euro(summary.totalActive)}</strong></div><div class="financial-portfolio-sub"><h3>Annual Amount for Selected Year</h3><span class="financial-sub-entity">${currentYear}</span><strong>${euro(summary.annualForYear)}</strong></div><div class="financial-portfolio-sub"><h3>Active Portfolio Size</h3><span class="financial-sub-entity">${escapeHtml(ACTIVE_PORTFOLIO_ENTITY)}</span><strong>${euro(summary.activePortfolioSize)}</strong></div></section>`;
}
function pipelineDonutSegments(counts) {
  const entries = pipelineOrder.map((status) => [status, counts[status] || 0]).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  let cursor = 0;
  const segments = entries.map(([status, count]) => { const start = cursor; const end = cursor + (count / total) * 360; cursor = end; return `${pipelineColors[status] || "#9aa4b2"} ${start}deg ${end}deg`; });
  return segments.length ? segments.join(", ") : "#eef1f4 0deg 360deg";
}
function renderPipeline(summary) {
  const counts = summary.pipelineCounts;
  const total = summary.pipeline.length;
  const ordered = pipelineOrder.filter((status) => counts[status]);
  return `<section class="financial-card financial-pipeline-card"><div><h3>Proposals Pipeline</h3><div class="financial-legend">${ordered.map((status) => `<div class="financial-legend-row"><span class="financial-legend-dot" style="--dot:${pipelineColors[status]}"></span><span>${escapeHtml(statusLabel(status))}</span><strong>${Math.round((counts[status] / Math.max(total, 1)) * 100)}%</strong></div>`).join("") || `<div class="financial-empty">No proposal pipeline data yet.</div>`}</div></div><div class="financial-donut-wrap"><div class="financial-donut pipeline" style="--segments:${pipelineDonutSegments(counts)}"><div class="financial-donut-inner"><strong>${total}</strong><span>Total</span></div></div></div></section>`;
}
function renderSectors(summary) {
  const entries = Object.entries(summary.sectorCounts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return `<section class="financial-card financial-sector-card"><h3>Count Sectors</h3><div class="financial-sector-bars">${entries.map(([sector, count]) => `<div class="financial-sector-row"><span>${escapeHtml(sector)}</span><div class="financial-bar-track"><span style="--w:${Math.max(4, (count / max) * 100)}%"></span></div><b>${count}</b></div>`).join("") || `<div class="financial-empty">No sector data yet.</div>`}</div></section>`;
}
function renderTable(rows) {
  return `<section class="financial-card financial-table-card"><h3>Financial projects data for ${currentYear}</h3><div class="table-wrap"><table class="financial-table"><thead><tr><th>Code</th><th>Project</th><th>Status</th><th>Years</th><th>Sector</th><th>Entity</th><th>Total Budget</th><th>Annual ${currentYear}</th><th>Notes</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.project_code || "")}</td><td><strong>${escapeHtml(row.project_name)}</strong><br><small>Record year: ${row.project_year}</small></td><td><span class="financial-status-pill">${escapeHtml(statusLabel(row.status))}</span></td><td>${startYear(row)}–${endYear(row)}</td><td>${escapeHtml(row.sector)}</td><td>${escapeHtml(row.entity)}</td><td>${euro(totalBudget(row))}</td><td>${euro(annualAmount(row))}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("") || `<tr><td colspan="9">No financial project data added yet for ${currentYear}.</td></tr>`}</tbody></table></div></section>`;
}

function renderDashboard(container, rows) {
  const summary = summarize(rows);
  container.innerHTML = `<div class="financial-dashboard-shell"><div class="financial-header-row"><div class="financial-title-block"><h2>${escapeHtml(PORTFOLIO_OWNER)} - Externally Funded Projects (${currentYear})</h2><p>Multi-year portfolio logic: a project appears while ${currentYear} falls between start year and end year. Total budget is not duplicated across years; annual amount is counted only for the selected year.</p></div><div class="financial-actions"><label class="financial-year-control">Year<select class="financial-year-select" aria-label="Financial dashboard year">${renderYearOptions()}</select></label><button type="button" class="financial-secondary financial-refresh">Refresh</button><button type="button" class="financial-primary financial-add">Add financial project data</button></div></div><div class="financial-dashboard-grid">${donutCard("Running Projects", summary.running.length, "#68c934")}${donutCard("Accepted, to be launched", summary.acceptedToLaunch.length, "#a675c5")}${renderPortfolioCard(summary)}</div><div class="financial-second-row">${renderPipeline(summary)}${renderSectors(summary)}</div>${renderTable(rows)}</div>`;
  container.querySelector(".financial-year-select")?.addEventListener("change", (event) => { currentYear = Number(event.target.value || currentYear); openFinancialPage(false); });
  container.querySelector(".financial-add")?.addEventListener("click", openFinancialModal);
  container.querySelector(".financial-refresh")?.addEventListener("click", () => openFinancialPage(true));
}
function renderMissingTable(container, error) { container.innerHTML = `<div class="financial-header-row"><div class="financial-title-block"><h2>${escapeHtml(PORTFOLIO_OWNER)} - Externally Funded Projects (${currentYear})</h2><p>Financial dashboard is ready, but the Supabase table must be updated first.</p></div></div><div class="financial-empty">Could not load <strong>financial_projects</strong>. Run the latest SQL migration in Supabase first.<br><br>Error: ${escapeHtml(error.message || "Unknown error")}</div>`; }

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
  if (!page) { page = document.createElement("section"); page.className = "financial-projects-page"; const anchor = workspace.querySelector(".role-notice") || workspace.querySelector(".app-message") || topbar; anchor.after(page); }
  page.innerHTML = `<div class="financial-empty">Loading financial dashboard...</div>`;
  try { await loadAvailableYears(force); renderDashboard(page, await loadFinancialRows(force)); } catch (error) { renderMissingTable(page, error); }
}
function closeFinancialView() { document.body.classList.remove("external-financial-view"); document.querySelector(".financial-projects-page")?.remove(); }
function addFinancialNavButton() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || nav.querySelector(".financial-projects-nav-button")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "financial-projects-nav-button";
  button.innerHTML = `<span style="font-weight:900;font-size:17px;line-height:1">€</span> Financial Projects`;
  button.addEventListener("click", () => { openFinancialPage(); document.querySelector(".app-shell")?.classList.remove("sidebar-open"); });
  nav.appendChild(button);
  nav.querySelectorAll("button:not(.financial-projects-nav-button)").forEach((navButton) => { navButton.addEventListener("click", closeFinancialView); });
}
function openFinancialModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "financial-modal-backdrop";
  backdrop.innerHTML = `<form class="financial-modal"><h3>Add financial project data</h3><p class="financial-empty">Enter the total project budget once. Add the annual amount only for the selected year if known.</p><div class="financial-form-grid"><label class="financial-span-2">Project code<input name="project_code" placeholder="GWS-2026-001" /></label><label class="financial-span-2">Project name<input name="project_name" required placeholder="Project title" /></label><label>Status<select name="status">${statusOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label>Sector<select name="sector">${defaultSectors.map((sector) => `<option>${sector}</option>`).join("")}</select></label><label>Entity<select name="entity"><option>${ACTIVE_PORTFOLIO_ENTITY}</option><option>SEKEM</option><option>EBDA</option><option>All entities</option><option>Other</option></select></label><label>Record / proposal year<input name="project_year" type="number" min="2020" max="2100" value="${currentYear}" /></label><label>Start year<input name="start_year" type="number" min="2020" max="2100" value="${currentYear}" /></label><label>End year<input name="end_year" type="number" min="2020" max="2100" value="${currentYear}" /></label><label>Total budget EUR<input name="total_budget_eur" type="number" min="0" step="0.01" placeholder="0.00" /></label><label>Annual amount for selected year<input name="annual_amount_eur" type="number" min="0" step="0.01" placeholder="0.00" /></label><label class="financial-span-2">Notes<textarea name="notes" placeholder="Optional details, donor, launch notes, or exclusions"></textarea></label></div><div class="financial-modal-actions"><button type="button" class="financial-secondary financial-cancel">Cancel</button><button type="submit" class="financial-primary">Save data</button></div></form>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector(".financial-cancel")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.remove(); });
  backdrop.querySelector("form")?.addEventListener("submit", handleFinancialSubmit);
}
async function handleFinancialSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Saving...";
  const formData = new FormData(form);
  const { data: { user } } = await supabase.auth.getUser();
  const start = Number(formData.get("start_year") || currentYear);
  const end = Math.max(start, Number(formData.get("end_year") || start));
  const total = number(formData.get("total_budget_eur"));
  const payload = { project_code: String(formData.get("project_code") || "").trim() || null, project_name: String(formData.get("project_name") || "").trim(), status: String(formData.get("status") || "running"), sector: String(formData.get("sector") || "Other"), entity: String(formData.get("entity") || ACTIVE_PORTFOLIO_ENTITY), amount_eur: total, total_budget_eur: total, annual_amount_eur: number(formData.get("annual_amount_eur")), project_year: Number(formData.get("project_year") || start), start_year: start, end_year: end, notes: String(formData.get("notes") || "").trim(), created_by: user?.id || null, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("financial_projects").insert(payload);
  if (error) { submitButton.disabled = false; submitButton.textContent = "Save data"; form.querySelector(".financial-empty").innerHTML = `Could not save data: ${escapeHtml(error.message)}`; return; }
  form.closest(".financial-modal-backdrop")?.remove();
  financialRowsCache = null; availableYearsCache = null; currentYear = payload.project_year; openFinancialPage(true);
}
function startFinancialProjectsEnhancer() { installStyles(); addFinancialNavButton(); const observer = new MutationObserver(() => addFinancialNavButton()); observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true }); }
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", startFinancialProjectsEnhancer); } else { startFinancialProjectsEnhancer(); }
