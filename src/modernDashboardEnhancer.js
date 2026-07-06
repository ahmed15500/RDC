import { supabase } from "./lib/supabaseClient";

let dashboardDataPromise = null;

const css = `
  .modern-command-center {
    margin: 0 0 22px;
    padding: clamp(18px, 3vw, 28px);
    border: 1px solid rgba(36, 43, 120, 0.12);
    border-radius: 30px;
    background:
      radial-gradient(circle at top left, rgba(230, 0, 126, 0.13), transparent 28%),
      radial-gradient(circle at top right, rgba(29, 154, 105, 0.13), transparent 30%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(246, 249, 255, 0.88));
    box-shadow: var(--shadow, 0 24px 70px rgba(20, 30, 84, 0.12));
  }

  .modern-center-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 18px;
  }

  .modern-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 7px 10px;
    color: var(--magenta, #e6007e);
    border-radius: 999px;
    background: rgba(230, 0, 126, 0.1);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .modern-center-header h2 {
    margin: 10px 0 6px;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
    font-size: clamp(1.65rem, 4vw, 3.1rem);
    line-height: 0.96;
    letter-spacing: -0.055em;
  }

  .modern-center-header p {
    max-width: 900px;
    margin: 0;
    color: var(--muted, #6a7188);
    line-height: 1.65;
  }

  .modern-view-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .modern-view-tabs button {
    padding: 9px 12px;
    border: 1px solid rgba(36, 43, 120, 0.14);
    border-radius: 999px;
    background: white;
    color: var(--navy, #242b78);
    font-size: 0.82rem;
    font-weight: 900;
  }

  .modern-view-tabs button.active {
    color: white;
    border-color: transparent;
    background: linear-gradient(90deg, var(--magenta, #e6007e), var(--orange, #ff8500));
  }

  .modern-kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .modern-kpi-card {
    position: relative;
    overflow: hidden;
    padding: 16px;
    min-height: 122px;
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.88);
  }

  .modern-kpi-card::after {
    content: "";
    position: absolute;
    inset: auto 12px 12px 12px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent, #e6007e), rgba(36, 43, 120, 0.12));
  }

  .modern-kpi-card strong {
    display: block;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
    font-size: clamp(1.65rem, 3vw, 2.4rem);
    line-height: 1;
  }

  .modern-kpi-card span {
    display: block;
    margin-top: 7px;
    color: var(--muted, #6a7188);
    font-size: 0.83rem;
    font-weight: 900;
  }

  .modern-kpi-card small {
    display: block;
    margin-top: 8px;
    color: var(--ink, #172033);
    opacity: 0.72;
    line-height: 1.45;
  }

  .modern-dashboard-grid {
    display: grid;
    grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.4fr);
    gap: 14px;
  }

  .modern-panel {
    padding: 18px;
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.82);
  }

  .modern-panel h3 {
    margin: 0 0 10px;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
  }

  .modern-plain-status {
    padding: 13px 14px;
    border: 1px dashed rgba(36, 43, 120, 0.18);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.68);
    color: var(--ink, #172033);
    line-height: 1.65;
  }

  .modern-alert-list {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .modern-alert-list li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
    align-items: start;
    padding: 11px 12px;
    border-radius: 16px;
    background: rgba(36, 43, 120, 0.06);
    line-height: 1.5;
  }

  .modern-alert-list b {
    display: inline-flex;
    justify-content: center;
    min-width: 38px;
    padding: 4px 7px;
    color: white;
    border-radius: 999px;
    background: var(--navy, #242b78);
    font-size: 0.78rem;
  }

  .modern-bar-list {
    display: grid;
    gap: 11px;
  }

  .modern-bar-row {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) minmax(120px, 1.2fr) auto;
    gap: 10px;
    align-items: center;
  }

  .modern-bar-row strong {
    color: var(--navy, #242b78);
  }

  .modern-bar-track {
    height: 11px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(36, 43, 120, 0.1);
  }

  .modern-bar-track span {
    display: block;
    width: var(--w, 0%);
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--magenta, #e6007e), var(--orange, #ff8500));
  }

  .modern-data-table {
    width: 100%;
    min-width: 620px;
    border-collapse: collapse;
  }

  .modern-data-table th,
  .modern-data-table td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(36, 43, 120, 0.08);
    text-align: left;
  }

  .modern-data-table th {
    color: var(--navy, #242b78);
    font-size: 0.8rem;
  }

  .modern-disclosure {
    margin-top: 14px;
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
  }

  .modern-disclosure summary {
    cursor: pointer;
    padding: 13px 15px;
    color: var(--navy, #242b78);
    font-weight: 900;
  }

  .modern-disclosure > div {
    padding: 0 15px 15px;
  }

  @media (max-width: 980px) {
    .modern-center-header,
    .modern-dashboard-grid {
      grid-template-columns: 1fr;
    }

    .modern-view-tabs {
      justify-content: flex-start;
    }
  }

  @media (max-width: 620px) {
    .modern-command-center {
      border-radius: 22px;
      padding: 16px;
    }

    .modern-kpi-strip {
      grid-template-columns: 1fr 1fr;
    }

    .modern-bar-row {
      grid-template-columns: 1fr;
    }
  }
`;

function installStyles() {
  if (document.getElementById("modern-dashboard-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "modern-dashboard-enhancer-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function number(value) {
  return Number(value || 0);
}

function format(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(number(value)));
}

function percent(value, total) {
  return total ? Math.round((number(value) / number(total)) * 100) : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitVillage(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pillarsFor(row) {
  return [
    row.ecology_impact ? "Ecology" : null,
    row.society_impact ? "Society" : null,
    row.culture_impact ? "Culture" : null,
    row.economy_impact ? "Economy" : null,
  ].filter(Boolean);
}

async function loadDashboardRows() {
  if (dashboardDataPromise) return dashboardDataPromise;

  dashboardDataPromise = (async () => {
    const { data, error } = await supabase.from("activities").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  })();

  return dashboardDataPromise;
}

function summarize(rows) {
  const villages = new Set(rows.flatMap((row) => splitVillage(row.village)));
  const direct = rows.reduce((total, row) => total + number(row.direct_beneficiaries), 0);
  const indirect = rows.reduce((total, row) => total + number(row.indirect_beneficiaries), 0);
  const women = rows.reduce((total, row) => total + number(row.women || row.female_participants), 0);
  const youth = rows.reduce((total, row) => total + number(row.youth), 0);
  const trainings = rows.reduce((total, row) => total + number(row.trainings), 0);
  const waste = rows.reduce((total, row) => total + number(row.waste_collected_kg) + number(row.waste_recycled_kg) + number(row.waste_composted_kg), 0);
  const approved = rows.filter((row) => String(row.approval_status || "").toLowerCase() === "approved").length;
  const pending = rows.filter((row) => String(row.approval_status || "pending").toLowerCase() === "pending").length;
  const missingOutcome = rows.filter((row) => !row.key_outcome && !row.success_story && !row.future_opportunity).length;
  const missingEvidence = rows.filter((row) => !row.evidence_link).length;
  const genderAssessed = rows.filter((row) => row.gender_equality_level && row.gender_equality_level !== "not_assessed").length;

  const byPillar = ["Ecology", "Society", "Culture", "Economy"].map((pillar) => {
    const pillarRows = rows.filter((row) => pillarsFor(row).includes(pillar));
    return {
      label: pillar,
      value: pillarRows.length,
      beneficiaries: pillarRows.reduce((total, row) => total + number(row.direct_beneficiaries) + number(row.indirect_beneficiaries), 0),
    };
  });

  const villageCounts = [...villages].map((village) => ({
    label: village,
    value: rows.filter((row) => splitVillage(row.village).includes(village)).length,
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  return {
    total: rows.length,
    villages: villages.size,
    direct,
    indirect,
    women,
    youth,
    trainings,
    waste,
    approved,
    pending,
    missingOutcome,
    missingEvidence,
    genderAssessed,
    byPillar,
    villageCounts,
  };
}

function renderBars(items, total) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return items.map((item) => `
    <div class="modern-bar-row">
      <strong>${escapeHtml(item.label)}</strong>
      <div class="modern-bar-track" aria-hidden="true"><span style="--w:${Math.max(5, (item.value / max) * 100)}%"></span></div>
      <span>${format(item.value)} ${total ? `(${percent(item.value, total)}%)` : ""}</span>
    </div>
  `).join("");
}

function renderTable(summary) {
  const rows = [
    ["Activities", summary.total],
    ["Villages", summary.villages],
    ["Direct beneficiaries", summary.direct],
    ["Indirect beneficiaries", summary.indirect],
    ["Women reached", summary.women],
    ["Youth reached", summary.youth],
    ["Trainings", summary.trainings],
    ["Waste handled kg", summary.waste],
    ["Approved activities", summary.approved],
    ["Pending activities", summary.pending],
    ["Activities with gender equality assessment", summary.genderAssessed],
  ];

  return `
    <div class="table-wrap">
      <table class="modern-data-table">
        <thead><tr><th>Metric</th><th>Value</th><th>Interpretation</th></tr></thead>
        <tbody>
          ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${format(value)}</td><td>${interpret(label, value, summary)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function interpret(label, value, summary) {
  if (label.includes("Approved")) return `${percent(value, summary.total)}% of recorded activities are approved.`;
  if (label.includes("gender")) return `${percent(value, summary.total)}% of activities include explicit gender equality tracking.`;
  if (label.includes("Pending")) return value ? "Needs admin validation before appearing to non-admin viewers." : "No pending activities.";
  return "Included in the executive dashboard summary.";
}

function renderCommandCenter(rows, mode = "executive") {
  const summary = summarize(rows);
  const totalBeneficiaries = summary.direct + summary.indirect;
  const attentionItems = [
    [summary.pending, "Pending validation", "Approve or return these records so viewer dashboards stay reliable."],
    [summary.missingEvidence, "Missing evidence", "Attach evidence links to strengthen donor and audit readiness."],
    [summary.missingOutcome, "Missing outcome narrative", "Add short outcome text so reports tell the transformation story."],
    [summary.total - summary.genderAssessed, "Gender equality not assessed", "Complete the gender equality section for each activity."],
  ].filter(([count]) => count > 0);

  return `
    <article class="modern-command-center" aria-label="Modern dashboard command center">
      <div class="modern-center-header">
        <div>
          <span class="modern-eyebrow">Modern impact dashboard</span>
          <h2>RDC command center</h2>
          <p>Executive summary, field-readiness signals, data quality checks, and accessible table equivalents are grouped into one responsive cockpit.</p>
        </div>
        <div class="modern-view-tabs" role="tablist" aria-label="Dashboard view mode">
          ${["executive", "field", "quality"].map((item) => `<button type="button" class="${mode === item ? "active" : ""}" data-modern-mode="${item}">${item[0].toUpperCase()}${item.slice(1)}</button>`).join("")}
        </div>
      </div>

      <div class="modern-kpi-strip">
        <div class="modern-kpi-card" style="--accent:#e6007e"><strong>${format(summary.total)}</strong><span>Activities</span><small>${format(summary.approved)} approved · ${format(summary.pending)} pending</small></div>
        <div class="modern-kpi-card" style="--accent:#1d9a69"><strong>${format(summary.villages)}</strong><span>Villages reached</span><small>Coverage across the 13-village model</small></div>
        <div class="modern-kpi-card" style="--accent:#ff8500"><strong>${format(totalBeneficiaries)}</strong><span>Total beneficiaries</span><small>${format(summary.direct)} direct · ${format(summary.indirect)} indirect</small></div>
        <div class="modern-kpi-card" style="--accent:#345f48"><strong>${format(summary.genderAssessed)}</strong><span>Gender-assessed activities</span><small>${percent(summary.genderAssessed, summary.total)}% gender tracking coverage</small></div>
        <div class="modern-kpi-card" style="--accent:#242b78"><strong>${format(summary.women)}</strong><span>Women reached</span><small>Shown as a core equity KPI</small></div>
        <div class="modern-kpi-card" style="--accent:#2474c6"><strong>${format(summary.waste)}</strong><span>Waste handled kg</span><small>Collected, recycled, or composted</small></div>
      </div>

      ${mode === "executive" ? renderExecutive(summary, totalBeneficiaries, attentionItems) : ""}
      ${mode === "field" ? renderField(summary) : ""}
      ${mode === "quality" ? renderQuality(summary, attentionItems) : ""}
    </article>
  `;
}

function renderExecutive(summary, totalBeneficiaries, attentionItems) {
  return `
    <div class="modern-dashboard-grid">
      <section class="modern-panel">
        <h3>Plain-language status</h3>
        <div class="modern-plain-status">RDC currently has ${format(summary.total)} recorded activities across ${format(summary.villages)} villages, reaching ${format(totalBeneficiaries)} direct and indirect beneficiaries. Gender equality is explicitly assessed in ${format(summary.genderAssessed)} activities. ${attentionItems.length ? "The priority is to close validation, evidence, outcome, and gender-tracking gaps." : "No major dashboard data gaps are visible from the current records."}</div>
        <details class="modern-disclosure">
          <summary>Show accessible KPI table</summary>
          <div>${renderTable(summary)}</div>
        </details>
      </section>
      <section class="modern-panel">
        <h3>Sustainability pillar distribution</h3>
        <div class="modern-bar-list">${renderBars(summary.byPillar, summary.total)}</div>
      </section>
    </div>
  `;
}

function renderField(summary) {
  return `
    <div class="modern-dashboard-grid">
      <section class="modern-panel">
        <h3>Top active villages</h3>
        <div class="modern-bar-list">${renderBars(summary.villageCounts, summary.total) || "No village data yet."}</div>
      </section>
      <section class="modern-panel">
        <h3>Field operations lens</h3>
        <div class="modern-plain-status">Use this view to identify where activity volume is concentrated, where field evidence is missing, and where gender equality participation data still needs completion before reporting.</div>
      </section>
    </div>
  `;
}

function renderQuality(summary, attentionItems) {
  return `
    <div class="modern-dashboard-grid">
      <section class="modern-panel">
        <h3>Data quality alerts</h3>
        <ul class="modern-alert-list">
          ${attentionItems.map(([count, title, text]) => `<li><b>${format(count)}</b><span><strong>${escapeHtml(title)}</strong><br>${escapeHtml(text)}</span></li>`).join("") || `<li><b>0</b><span><strong>No critical gaps</strong><br>The current records are ready for reporting.</span></li>`}
        </ul>
      </section>
      <section class="modern-panel">
        <h3>Quality table</h3>
        ${renderTable(summary)}
      </section>
    </div>
  `;
}

async function injectModernDashboard(mode = "executive") {
  const workspace = document.querySelector("main.workspace");
  const topbar = workspace?.querySelector(".topbar");
  if (!workspace || !topbar) return;

  const pageTitle = topbar.querySelector("h1")?.textContent?.trim() || "";
  const allowed = ["Home", "Admin Dashboard", "Village Dashboard", "Project Dashboard", "Pillar Dashboard", "SDG Dashboard", "Social Transformation"];
  const shouldShow = allowed.some((title) => pageTitle.includes(title));

  const existing = workspace.querySelector(".modern-command-center");
  if (!shouldShow) {
    existing?.remove();
    return;
  }

  try {
    const rows = await loadDashboardRows();
    const html = renderCommandCenter(rows, mode);
    if (existing) {
      existing.outerHTML = html;
    } else {
      const anchor = workspace.querySelector(".role-notice") || workspace.querySelector(".app-message") || topbar;
      anchor.after(document.createRange().createContextualFragment(html));
    }
  } catch (error) {
    const fallback = `<article class="modern-command-center"><div class="modern-plain-status">Modern dashboard could not load Supabase activity rows: ${escapeHtml(error.message || "Unknown error")}</div></article>`;
    if (existing) existing.outerHTML = fallback;
    else topbar.after(document.createRange().createContextualFragment(fallback));
  }
}

function startModernDashboardEnhancer() {
  installStyles();
  injectModernDashboard();

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-modern-mode]");
    if (!button) return;
    injectModernDashboard(button.dataset.modernMode);
  });

  const observer = new MutationObserver(() => injectModernDashboard());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startModernDashboardEnhancer);
} else {
  startModernDashboardEnhancer();
}
