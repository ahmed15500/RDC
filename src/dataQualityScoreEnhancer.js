import { supabase } from "./lib/supabaseClient";

let qualityRowsPromise = null;
let renderTimer = null;

const numberFields = [
  "direct_beneficiaries",
  "indirect_beneficiaries",
  "households",
  "women",
  "women_trained",
  "youth",
  "children_students",
  "farmers",
  "schools",
  "teachers",
  "volunteers",
  "community_events",
  "trainings",
  "health_cases",
  "waste_collected_kg",
  "waste_recycled_kg",
  "waste_composted_kg",
  "trees_planted",
  "income_generated",
  "jobs_created",
  "products_sold",
  "female_participants",
  "male_participants",
  "women_leadership_count",
];

function installDataQualityStyles() {
  if (document.getElementById("data-quality-score-style")) return;
  const style = document.createElement("style");
  style.id = "data-quality-score-style";
  style.textContent = `
    .dq-score-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      width: fit-content;
      margin-top: 6px;
      padding: 6px 9px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.76rem;
      font-weight: 950;
      white-space: nowrap;
    }

    .dq-score-pill::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--dq-color, #94a3b8);
    }

    .dq-score-pill.dq-good { background: #ecfdf5; color: #166534; --dq-color: #22c55e; }
    .dq-score-pill.dq-ok { background: #fffbeb; color: #92400e; --dq-color: #f59e0b; }
    .dq-score-pill.dq-poor { background: #fff1f2; color: #991b1b; --dq-color: #ef4444; }

    .dq-table-cell {
      min-width: 116px;
    }

    .dq-card-details {
      display: grid;
      gap: 6px;
      margin: 10px 0;
      padding: 10px;
      border: 1px solid #e5e8ed;
      border-radius: 12px;
      background: #f8fafc;
      color: #475569;
      font-size: 0.78rem;
      font-weight: 800;
    }

    .dq-card-details span {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.25);
      padding-bottom: 4px;
    }

    .dq-card-details span:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .dq-summary-panel {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }

    .dq-summary-panel > div {
      padding: 14px;
      border: 1px solid #e5e8ed;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.045);
    }

    .dq-summary-panel strong {
      display: block;
      color: #26313d;
      font-size: 1.45rem;
      font-weight: 950;
      line-height: 1;
    }

    .dq-summary-panel span {
      display: block;
      margin-top: 5px;
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 850;
    }

    @media (max-width: 900px) {
      .dq-summary-panel { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 620px) {
      .dq-summary-panel { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

function text(value) {
  return String(value || "").trim();
}

function norm(value) {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeStatus(value) {
  const status = norm(value);
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  if (status.includes("needs")) return "needs revision";
  if (status === "rejected") return "rejected";
  return status || "pending";
}

async function loadQualityRows(force = false) {
  if (qualityRowsPromise && !force) return qualityRowsPromise;
  qualityRowsPromise = (async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  })();
  return qualityRowsPromise;
}

function hasAny(row, fields) {
  return fields.some((field) => Boolean(text(row[field])));
}

function hasAnyNumber(row, fields = numberFields) {
  return fields.some((field) => number(row[field]) > 0);
}

function numbersLookReasonable(row) {
  const values = numberFields.map((field) => number(row[field])).filter((value) => value > 0);
  if (!values.length) return false;
  return values.every((value) => value >= 0 && value < 1000000);
}

function countFilled(row, fields) {
  return fields.filter((field) => Boolean(text(row[field]))).length;
}

function computeDataQuality(row) {
  const completenessFields = [
    "project_name",
    "activity_name",
    "activity_type",
    "village",
    "date_period",
    "responsible_person",
    "target_group",
    "objective",
    "description",
  ];

  const baseCompleteness = Math.round((countFilled(row, completenessFields) / completenessFields.length) * 22);
  const impactCompleteness = hasAny(row, ["ecology_impact", "society_impact", "culture_impact", "economy_impact", "key_outcome", "challenge", "future_opportunity"]) ? 8 : 0;
  const completeness = Math.min(30, baseCompleteness + impactCompleteness);

  const evidence = text(row.evidence_link) ? 20 : 0;

  let numbers = 0;
  if (hasAnyNumber(row)) numbers = 14;
  if (numbersLookReasonable(row)) numbers = 20;

  const status = normalizeStatus(row.approval_status);
  const approval = status === "approved" ? 15 : status === "pending" ? 7 : status === "needs revision" ? 5 : 0;

  const villages = text(row.village)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const location = villages.length && !villages.every((village) => norm(village) === "other") ? 15 : 0;

  const score = Math.max(0, Math.min(100, completeness + evidence + numbers + approval + location));
  const missing = [];
  if (completeness < 24) missing.push("basic fields / outcomes");
  if (!evidence) missing.push("evidence link");
  if (!numbers) missing.push("impact numbers");
  if (approval < 15) missing.push("approval");
  if (!location) missing.push("clear village/location");

  return {
    score,
    status,
    className: score >= 80 ? "dq-good" : score >= 60 ? "dq-ok" : "dq-poor",
    label: score >= 80 ? "Good" : score >= 60 ? "Needs review" : "Weak",
    parts: { completeness, evidence, numbers, approval, location },
    missing,
  };
}

function matchRow(rows, activityName, projectName = "") {
  const activity = norm(activityName);
  const project = norm(projectName);
  return rows.find((row) => norm(row.activity_name) === activity && (!project || norm(row.project_name) === project))
    || rows.find((row) => norm(row.activity_name) === activity);
}

function scorePill(quality) {
  return `<span class="dq-score-pill ${quality.className}" title="Missing: ${escapeHtml(quality.missing.join(", ") || "nothing critical")}">Data Quality: ${quality.score}% · ${quality.label}</span>`;
}

function detailsHtml(quality) {
  return `
    <div class="dq-card-details">
      <span><b>Completeness</b><em>${quality.parts.completeness}/30</em></span>
      <span><b>Evidence</b><em>${quality.parts.evidence}/20</em></span>
      <span><b>Numbers</b><em>${quality.parts.numbers}/20</em></span>
      <span><b>Approval</b><em>${quality.parts.approval}/15</em></span>
      <span><b>Location</b><em>${quality.parts.location}/15</em></span>
    </div>
  `;
}

function addQualityToApprovalTables(rows) {
  document.querySelectorAll("article.panel").forEach((panel) => {
    const heading = panel.querySelector("h3")?.textContent || "";
    if (!heading.includes("Admin review")) return;

    const table = panel.querySelector("table");
    if (!table || table.dataset.dqEnhanced === "true") return;
    table.dataset.dqEnhanced = "true";

    const headerRow = table.querySelector("thead tr");
    if (headerRow && !headerRow.querySelector(".dq-header")) {
      const th = document.createElement("th");
      th.className = "dq-header";
      th.textContent = "Data Quality";
      headerRow.insertBefore(th, headerRow.children[4] || null);
    }

    table.querySelectorAll("tbody tr").forEach((tr) => {
      if (tr.querySelector(".dq-table-cell")) return;
      const activityName = tr.querySelector("td strong")?.textContent || "";
      const projectName = tr.querySelector("td small")?.textContent || "";
      const row = matchRow(rows, activityName, projectName);
      if (!row) return;
      const td = document.createElement("td");
      td.className = "dq-table-cell";
      td.innerHTML = scorePill(computeDataQuality(row));
      tr.insertBefore(td, tr.children[4] || null);
    });
  });
}

function addQualityToDataCards(rows) {
  document.querySelectorAll(".data-card").forEach((card) => {
    if (card.dataset.dqEnhanced === "true") return;
    const activityName = card.querySelector("h3")?.textContent || "";
    const row = matchRow(rows, activityName);
    if (!row) return;
    const quality = computeDataQuality(row);
    const holder = document.createElement("div");
    holder.className = "dq-card-block";
    holder.innerHTML = `${scorePill(quality)}${detailsHtml(quality)}`;
    card.insertBefore(holder, card.querySelector("button") || null);
    card.dataset.dqEnhanced = "true";
  });
}

function renderQualitySummary(rows) {
  const dataManagementSection = [...document.querySelectorAll("section.stack")].find((section) => section.querySelector(".filters.panel") && section.querySelector(".data-actions"));
  if (!dataManagementSection || dataManagementSection.querySelector(".dq-summary-panel")) return;

  const qualities = rows.map(computeDataQuality);
  const avg = qualities.length ? Math.round(qualities.reduce((sum, item) => sum + item.score, 0) / qualities.length) : 0;
  const good = qualities.filter((item) => item.score >= 80).length;
  const needsReview = qualities.filter((item) => item.score >= 60 && item.score < 80).length;
  const weak = qualities.filter((item) => item.score < 60).length;

  const summary = document.createElement("div");
  summary.className = "dq-summary-panel";
  summary.innerHTML = `
    <div><strong>${avg}%</strong><span>Average data quality</span></div>
    <div><strong>${good}</strong><span>Good activities ≥80%</span></div>
    <div><strong>${needsReview}</strong><span>Need review 60–79%</span></div>
    <div><strong>${weak}</strong><span>Weak activities &lt;60%</span></div>
  `;
  dataManagementSection.prepend(summary);
}

async function applyDataQuality(force = false) {
  const rows = await loadQualityRows(force);
  addQualityToApprovalTables(rows);
  addQualityToDataCards(rows);
  renderQualitySummary(rows);
}

function scheduleDataQuality(force = false) {
  if (renderTimer) window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => {
    renderTimer = null;
    applyDataQuality(force).catch(() => null);
  }, 350);
}

function startDataQualityScoreEnhancer() {
  installDataQualityStyles();
  scheduleDataQuality(true);

  document.addEventListener("click", (event) => {
    if (event.target.closest?.(".sidebar nav button, .ghost, .submit-button, .financial-refresh")) {
      qualityRowsPromise = null;
      window.setTimeout(() => scheduleDataQuality(true), 700);
    }
  }, true);

  document.addEventListener("change", (event) => {
    if (event.target.closest?.("select")) {
      window.setTimeout(() => scheduleDataQuality(false), 300);
    }
  }, true);

  const observer = new MutationObserver(() => scheduleDataQuality(false));
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startDataQualityScoreEnhancer);
} else {
  startDataQualityScoreEnhancer();
}
