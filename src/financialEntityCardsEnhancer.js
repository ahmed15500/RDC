import { supabase } from "./lib/supabaseClient";

let renderTimer = null;
let lastRenderKey = "";

function installEntityCardStyles() {
  if (document.getElementById("financial-entity-cards-style")) return;
  const style = document.createElement("style");
  style.id = "financial-entity-cards-style";
  style.textContent = `
    body.financial-numbers-hub-active .financial-dashboard-grid {
      display: none !important;
    }

    .financial-entity-section {
      display: grid;
      gap: 12px;
      margin: 4px 0 2px;
      padding: 14px;
      border: 1px solid #e5e8ed;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.045);
    }

    .financial-entity-section h3 {
      margin: 0;
      color: #34404b;
      font-size: 1rem;
      font-weight: 900;
    }

    .financial-numbers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
      gap: 8px;
    }

    .financial-number-card,
    .financial-entity-card {
      display: grid;
      gap: 6px;
      padding: 15px 16px;
      border: 1px solid #e5e8ed;
      border-radius: 10px;
      background: white;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.045);
      text-align: left;
    }

    .financial-number-card {
      border-left: 5px solid var(--accent, #29a9e1);
    }

    .financial-number-label,
    .financial-entity-name {
      color: #26313d;
      font-size: 0.88rem;
      font-weight: 900;
    }

    .financial-number-value,
    .financial-entity-money {
      color: #26313d;
      font-size: clamp(1.35rem, 3vw, 2rem);
      font-weight: 950;
      letter-spacing: -0.05em;
      line-height: 1;
    }

    .financial-number-note,
    .financial-entity-meta {
      color: #697386;
      font-size: 0.77rem;
      font-weight: 850;
      line-height: 1.35;
    }

    .financial-entity-subtitle {
      margin-top: 2px;
      color: #697386;
      font-size: 0.82rem;
      font-weight: 800;
    }

    .financial-entity-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
      gap: 8px;
    }

    .financial-entity-card {
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }

    .financial-entity-card:hover {
      transform: translateY(-1px);
      border-color: #cbd5e1;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
    }

    .financial-entity-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .financial-entity-meta span {
      padding: 4px 7px;
      border-radius: 999px;
      background: #f1f5f9;
    }

    .financial-entity-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1250;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(16, 24, 40, 0.55);
    }

    .financial-entity-modal {
      width: min(1100px, 100%);
      max-height: min(92vh, 880px);
      overflow: auto;
      padding: 22px;
      border-radius: 20px;
      background: white;
      box-shadow: 0 28px 90px rgba(16, 24, 40, 0.28);
    }

    .financial-entity-modal-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .financial-entity-modal h3 {
      margin: 0 0 5px;
      color: #26313d;
      font-size: 1.35rem;
      font-weight: 900;
    }

    .financial-entity-close {
      border: 0;
      border-radius: 999px;
      padding: 8px 11px;
      background: #eef2f7;
      color: #26313d;
      font-weight: 900;
      cursor: pointer;
    }

    .financial-entity-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0;
    }

    .financial-entity-summary-grid div {
      padding: 12px;
      border: 1px solid #e5e8ed;
      border-radius: 12px;
      background: #f8fafc;
    }

    .financial-entity-summary-grid strong,
    .financial-entity-summary-grid span {
      display: block;
    }

    .financial-entity-summary-grid strong {
      color: #26313d;
      font-size: 1.28rem;
      font-weight: 950;
    }

    .financial-entity-summary-grid span {
      color: #697386;
      font-size: 0.78rem;
      font-weight: 850;
    }

    @media (max-width: 760px) {
      .financial-entity-summary-grid {
        grid-template-columns: 1fr;
      }
      .financial-entity-modal-head {
        display: grid;
      }
    }
  `;
  document.head.appendChild(style);
}

function currentFinancialYear() {
  const selected = Number(document.querySelector(".financial-year-select")?.value || 0);
  if (selected) return selected;
  const title = document.querySelector(".financial-title-block h2")?.textContent || "";
  const match = title.match(/20\d{2}/);
  return Number(match?.[0] || 2026);
}

function number(value) {
  return Number(value || 0);
}

function euro(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(number(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function startYear(row) {
  return Number(row.start_year || row.project_year || currentFinancialYear());
}

function endYear(row) {
  return Number(row.end_year || row.project_year || startYear(row));
}

function totalBudget(row) {
  return number(row.total_budget_eur ?? row.amount_eur);
}

function annualAmount(row) {
  return number(row.annual_amount_eur || 0);
}

function isRelevant(row, year) {
  return startYear(row) <= year && endYear(row) >= year;
}

function isRunning(row, year) {
  return isRelevant(row, year) && row.status === "running";
}

function isAcceptedToLaunch(row, year) {
  return isRelevant(row, year) && row.status === "accepted_to_launch";
}

function entityName(row) {
  return String(row.entity || "Other").trim() || "Other";
}

function buildOverview(rows, year) {
  const runningRows = rows.filter((row) => isRunning(row, year));
  const acceptedRows = rows.filter((row) => isAcceptedToLaunch(row, year));
  const totalActive = runningRows.reduce((sum, row) => sum + totalBudget(row), 0);
  const annualActive = runningRows.reduce((sum, row) => sum + annualAmount(row), 0);
  const huActive = runningRows
    .filter((row) => entityName(row).toLowerCase() === "hu")
    .reduce((sum, row) => sum + totalBudget(row), 0);

  return { runningRows, acceptedRows, totalActive, annualActive, huActive };
}

function summarizeByEntity(rows, year) {
  const runningRows = rows.filter((row) => isRunning(row, year));
  const byEntity = new Map();

  runningRows.forEach((row) => {
    const entity = entityName(row);
    const current = byEntity.get(entity) || {
      entity,
      totalBudget: 0,
      annualAmount: 0,
      projects: 0,
      rows: [],
    };
    current.totalBudget += totalBudget(row);
    current.annualAmount += annualAmount(row);
    current.projects += 1;
    current.rows.push(row);
    byEntity.set(entity, current);
  });

  return [...byEntity.values()].sort((a, b) => b.totalBudget - a.totalBudget);
}

async function loadFinancialRows() {
  const { data, error } = await supabase.from("financial_projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function numberCard(label, value, note, accent = "#29a9e1") {
  return `
    <article class="financial-number-card" style="--accent:${accent}">
      <span class="financial-number-label">${escapeHtml(label)}</span>
      <strong class="financial-number-value">${escapeHtml(value)}</strong>
      <span class="financial-number-note">${escapeHtml(note)}</span>
    </article>
  `;
}

function renderEntityCards(rows, summaries, overview, year) {
  const existing = document.querySelector(".financial-entity-section");
  existing?.remove();

  const dashboardGrid = document.querySelector(".financial-dashboard-grid");
  if (!dashboardGrid) return;

  document.body.classList.add("financial-numbers-hub-active");

  const section = document.createElement("section");
  section.className = "financial-entity-section";
  section.innerHTML = `
    <div>
      <h3>Financial Numbers Overview (${year})</h3>
      <div class="financial-entity-subtitle">All number cards are grouped here. Click any entity card to see its detailed projects.</div>
    </div>
    <div class="financial-numbers-grid">
      ${numberCard("Running Projects", overview.runningRows.length, "Active in selected year", "#68c934")}
      ${numberCard("Accepted, to be launched", overview.acceptedRows.length, "Accepted but not running", "#a675c5")}
      ${numberCard("Total active portfolio", euro(overview.totalActive), "Total budget counted once", "#29a9e1")}
      ${numberCard(`Annual amount ${year}`, euro(overview.annualActive), "Only selected-year amount", "#ff8d2a")}
      ${numberCard("Active Portfolio Size — HU", euro(overview.huActive), "HU running portfolio", "#26313d")}
    </div>
    <div>
      <h3>Portfolio by Entity</h3>
      <div class="financial-entity-subtitle">Each card shows the running portfolio value for this entity in ${year}.</div>
    </div>
    <div class="financial-entity-cards">
      ${summaries.map((item) => `
        <button type="button" class="financial-entity-card" data-entity="${escapeHtml(item.entity)}">
          <span class="financial-entity-name">${escapeHtml(item.entity)}</span>
          <span class="financial-entity-money">${euro(item.totalBudget)}</span>
          <span class="financial-entity-meta">
            <span>${item.projects} projects</span>
            <span>Annual ${euro(item.annualAmount)}</span>
          </span>
        </button>
      `).join("") || `<div class="financial-empty">No running entity portfolio data for ${year}.</div>`}
    </div>
  `;

  dashboardGrid.before(section);
  section.querySelectorAll(".financial-entity-card").forEach((card) => {
    card.addEventListener("click", () => {
      const entity = card.dataset.entity || "";
      const summary = summaries.find((item) => item.entity === entity);
      if (summary) openEntityDetails(summary, year);
    });
  });
}

function openEntityDetails(summary, year) {
  const backdrop = document.createElement("div");
  backdrop.className = "financial-entity-modal-backdrop";
  backdrop.innerHTML = `
    <section class="financial-entity-modal">
      <div class="financial-entity-modal-head">
        <div>
          <h3>${escapeHtml(summary.entity)} details (${year})</h3>
          <p class="financial-empty">These are the running projects for this entity in the selected year.</p>
        </div>
        <button type="button" class="financial-entity-close">Close</button>
      </div>
      <div class="financial-entity-summary-grid">
        <div><strong>${euro(summary.totalBudget)}</strong><span>Total active portfolio</span></div>
        <div><strong>${euro(summary.annualAmount)}</strong><span>Annual amount for ${year}</span></div>
        <div><strong>${summary.projects}</strong><span>Running projects</span></div>
      </div>
      <div class="table-wrap">
        <table class="financial-table">
          <thead><tr><th>Code</th><th>Project</th><th>Status</th><th>Years</th><th>Sector</th><th>Total Budget</th><th>Annual ${year}</th><th>Notes</th></tr></thead>
          <tbody>
            ${summary.rows.map((row) => `<tr><td>${escapeHtml(row.project_code || "")}</td><td><strong>${escapeHtml(row.project_name || "")}</strong></td><td><span class="financial-status-pill">${escapeHtml(row.status || "")}</span></td><td>${startYear(row)}–${endYear(row)}</td><td>${escapeHtml(row.sector || "")}</td><td>${euro(totalBudget(row))}</td><td>${euro(annualAmount(row))}</td><td>${escapeHtml(row.notes || "")}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.body.appendChild(backdrop);
  backdrop.querySelector(".financial-entity-close")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) backdrop.remove();
  });
}

async function renderEntitySection() {
  if (!document.body.classList.contains("external-financial-view")) {
    document.body.classList.remove("financial-numbers-hub-active");
    return;
  }
  if (!document.querySelector(".financial-dashboard-grid")) return;
  const year = currentFinancialYear();
  const rows = await loadFinancialRows();
  const overview = buildOverview(rows, year);
  const summaries = summarizeByEntity(rows, year);
  const renderKey = `${year}:${overview.runningRows.length}:${overview.acceptedRows.length}:${overview.totalActive}:${overview.annualActive}:${overview.huActive}:${summaries.map((item) => `${item.entity}-${item.projects}-${item.totalBudget}-${item.annualAmount}`).join("|")}`;
  if (renderKey === lastRenderKey && document.querySelector(".financial-entity-section")) return;
  lastRenderKey = renderKey;
  renderEntityCards(rows, summaries, overview, year);
}

function scheduleRenderEntitySection() {
  if (renderTimer) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderTimer = null;
    renderEntitySection().catch(() => null);
  }, 180);
}

function startFinancialEntityCardsEnhancer() {
  installEntityCardStyles();
  scheduleRenderEntitySection();

  document.addEventListener("change", (event) => {
    if (event.target.closest?.(".financial-year-select")) {
      lastRenderKey = "";
      scheduleRenderEntitySection();
      window.setTimeout(scheduleRenderEntitySection, 500);
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".financial-refresh, .financial-add, .csv-confirm-import, .sidebar nav button")) {
      lastRenderKey = "";
      window.setTimeout(scheduleRenderEntitySection, 700);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleRenderEntitySection());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFinancialEntityCardsEnhancer);
} else {
  startFinancialEntityCardsEnhancer();
}
