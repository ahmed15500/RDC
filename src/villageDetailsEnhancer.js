import {
  ADMIN_EMAIL,
  getAllActivities,
  getApprovedActivities,
  getCurrentSession,
  mapSupabaseActivity,
} from "./lib/activities";

let activitiesCache = null;
let loadingPromise = null;
let activeVillage = "";
let modal;
let modalContent;
let modalTitle;
let modalSubtitle;

const keyMetrics = [
  ["Activities", (rows) => rows.length],
  ["Total beneficiaries", (rows) => sumBeneficiaries(rows)],
  ["Direct beneficiaries", (rows) => sum(rows, "directBeneficiaries")],
  ["Indirect beneficiaries", (rows) => sum(rows, "indirectBeneficiaries")],
  ["Households", (rows) => sum(rows, "households")],
  ["Women", (rows) => sum(rows, "women")],
  ["Youth", (rows) => sum(rows, "youth")],
  ["Children / students", (rows) => sum(rows, "childrenStudents")],
  ["Farmers", (rows) => sum(rows, "farmers")],
  ["Schools", (rows) => sum(rows, "schools")],
  ["Teachers", (rows) => sum(rows, "teachers")],
  ["Volunteers", (rows) => sum(rows, "volunteers")],
  ["Trainings", (rows) => sum(rows, "trainings")],
  ["Community events", (rows) => sum(rows, "communityEvents")],
  ["Health cases", (rows) => sum(rows, "healthCases")],
  ["Waste collected kg", (rows) => sum(rows, "wasteCollectedKg")],
  ["Waste recycled kg", (rows) => sum(rows, "wasteRecycledKg")],
  ["Waste composted kg", (rows) => sum(rows, "wasteCompostedKg")],
  ["Trees / plants", (rows) => sum(rows, "treesPlanted")],
  ["Income generated", (rows) => sum(rows, "incomeGenerated")],
  ["Jobs created", (rows) => sum(rows, "jobsCreated")],
  ["Products sold", (rows) => sum(rows, "productsSold")],
];

const css = `
  .village-summary-card--clickable {
    position: relative;
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  }

  .village-summary-card--clickable:hover,
  .village-summary-card--clickable:focus-visible {
    transform: translateY(-4px);
    border-color: rgba(36, 43, 120, 0.28);
    box-shadow: 0 24px 60px rgba(20, 30, 84, 0.16);
    outline: none;
  }

  .village-open-details {
    display: inline-flex;
    width: fit-content;
    margin-top: 12px;
    padding: 7px 11px;
    color: var(--navy);
    border-radius: 999px;
    background: rgba(36, 43, 120, 0.08);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .village-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 22px;
    background: rgba(12, 18, 48, 0.58);
    backdrop-filter: blur(10px);
  }

  .village-modal-backdrop[hidden] { display: none; }

  .village-modal-panel {
    width: min(1180px, 96vw);
    max-height: 90vh;
    overflow: auto;
    border: 1px solid rgba(36, 43, 120, 0.14);
    border-radius: 28px;
    background:
      radial-gradient(circle at 8% 0%, rgba(230, 0, 126, 0.09), transparent 24rem),
      radial-gradient(circle at 90% 8%, rgba(255, 133, 0, 0.11), transparent 22rem),
      rgba(255, 255, 255, 0.97);
    box-shadow: 0 36px 100px rgba(8, 15, 48, 0.35);
  }

  .village-modal-header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    align-items: flex-start;
    padding: 22px 24px;
    border-bottom: 1px solid rgba(36, 43, 120, 0.1);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(14px);
  }

  .village-modal-header h2 {
    margin: 0;
    color: var(--navy);
    font-family: "Space Grotesk", sans-serif;
    font-size: clamp(1.6rem, 3vw, 2.5rem);
    letter-spacing: -0.04em;
  }

  .village-modal-header p { margin: 5px 0 0; color: var(--muted); }

  .village-modal-close {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    color: var(--navy);
    border: 1px solid rgba(36, 43, 120, 0.16);
    border-radius: 999px;
    background: white;
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1;
  }

  .village-detail-body { display: grid; gap: 18px; padding: 22px 24px 26px; }
  .village-detail-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }

  .village-detail-metric,
  .village-detail-section {
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 16px 40px rgba(20, 30, 84, 0.08);
  }

  .village-detail-metric { padding: 16px; }
  .village-detail-metric strong {
    display: block;
    color: var(--navy);
    font-family: "Space Grotesk", sans-serif;
    font-size: 1.55rem;
  }
  .village-detail-metric span { color: var(--muted); font-size: 0.84rem; font-weight: 700; }
  .village-detail-section { padding: 18px; }
  .village-detail-section h3 { margin: 0 0 12px; color: var(--navy); font-family: "Space Grotesk", sans-serif; }

  .village-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .village-chip-row span,
  .village-chip-row a {
    padding: 7px 10px;
    color: var(--navy);
    border-radius: 999px;
    background: rgba(36, 43, 120, 0.08);
    font-size: 0.84rem;
    font-weight: 800;
    text-decoration: none;
  }

  .village-two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .village-bullet-list { display: grid; gap: 9px; margin: 0; padding-left: 20px; color: var(--ink); }
  .village-activity-table { width: 100%; border-collapse: collapse; min-width: 860px; }
  .village-activity-table th,
  .village-activity-table td { padding: 12px; border-bottom: 1px solid rgba(36, 43, 120, 0.09); text-align: left; vertical-align: top; }
  .village-activity-table th { color: var(--navy); font-size: 0.82rem; }
  .village-activity-table small { display: block; margin-top: 3px; color: var(--muted); }

  .village-status-pill {
    display: inline-flex;
    padding: 5px 9px;
    border-radius: 999px;
    background: rgba(36, 43, 120, 0.08);
    color: var(--navy);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .village-detail-empty,
  .village-detail-note {
    padding: 18px;
    color: var(--muted);
    border: 1px dashed rgba(36, 43, 120, 0.18);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.75);
    line-height: 1.6;
  }
  .village-detail-note strong { color: var(--navy); }

  @media (max-width: 900px) {
    .village-detail-grid,
    .village-two-col { grid-template-columns: 1fr; }
    .village-modal-panel { width: 100%; max-height: 92vh; }
  }
`;

function installStyles() {
  if (document.getElementById("village-details-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "village-details-enhancer-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(value || 0)));
}

function parseNumber(value) {
  const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
  return Number(cleaned || 0);
}

function sum(rows, key) {
  return rows.reduce((total, activity) => total + Number(activity.metrics?.[key] || 0), 0);
}

function sumBeneficiaries(rows) {
  return sum(rows, "directBeneficiaries") + sum(rows, "indirectBeneficiaries");
}

function unique(values) {
  return [...new Set(values.flat().filter(Boolean))];
}

function splitList(value) {
  return String(value || "")
    .split(/,|;|\||·/)
    .map((item) => item.trim())
    .filter((item) => item && !["none", "pending field data", "no projects recorded"].includes(item.toLowerCase()));
}

function normalizeVillage(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/el\s*-/g, "el")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function villageMatches(target, candidate) {
  const targetKey = normalizeVillage(target);
  const candidateKey = normalizeVillage(candidate);
  return candidateKey === targetKey || candidateKey.includes(targetKey) || targetKey.includes(candidateKey);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return "";
}

async function loadActivities() {
  if (activitiesCache) return activitiesCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const session = await getCurrentSession().catch(() => null);
    const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
    const rows = isAdmin ? await getAllActivities() : await getApprovedActivities();
    activitiesCache = rows.map(mapSupabaseActivity);
    return activitiesCache;
  })();

  return loadingPromise;
}

function createModal() {
  if (modal) return;

  modal = document.createElement("div");
  modal.className = "village-modal-backdrop";
  modal.hidden = true;
  modal.innerHTML = `
    <section class="village-modal-panel" role="dialog" aria-modal="true" aria-labelledby="village-modal-title">
      <header class="village-modal-header">
        <div>
          <h2 id="village-modal-title"></h2>
          <p id="village-modal-subtitle"></p>
        </div>
        <button class="village-modal-close" type="button" aria-label="Close village details">×</button>
      </header>
      <div class="village-detail-body"></div>
    </section>
  `;

  document.body.appendChild(modal);
  modalContent = modal.querySelector(".village-detail-body");
  modalTitle = modal.querySelector("#village-modal-title");
  modalSubtitle = modal.querySelector("#village-modal-subtitle");
  modal.querySelector(".village-modal-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}

function openModal() {
  createModal();
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
  activeVillage = "";
}

function renderLoading(village) {
  modalTitle.textContent = village;
  modalSubtitle.textContent = "Loading village activities and impact evidence...";
  modalContent.innerHTML = `<div class="village-detail-empty">Loading details from Supabase...</div>`;
}

function renderError(village, error, snapshot) {
  if (snapshot) {
    renderSummaryFallback(village, snapshot, `Supabase details could not be loaded: ${error.message || "Unknown error"}`);
    return;
  }
  modalTitle.textContent = village;
  modalSubtitle.textContent = "Village details could not be loaded.";
  modalContent.innerHTML = `<div class="village-detail-empty">${escapeHtml(error.message || "Unknown error")}</div>`;
}

function renderDetails(village, rows) {
  const projects = unique(rows.map((activity) => activity.projectName));
  const activityTypes = unique(rows.map((activity) => activity.activityType));
  const targetGroups = unique(rows.map((activity) => activity.targetGroup));
  const pillars = unique(rows.flatMap((activity) => activity.pillars));
  const sdgs = unique(rows.flatMap((activity) => activity.sdgs.map((sdg) => `SDG ${sdg.number}: ${sdg.name}`)));
  const outcomes = rows.map((activity) => activity.qualitative.keyOutcome).filter(Boolean);
  const challenges = rows.map((activity) => activity.qualitative.challenge).filter(Boolean);
  const opportunities = rows.map((activity) => activity.qualitative.futureOpportunity).filter(Boolean);
  const evidence = rows.flatMap((activity) => activity.evidence.map((item) => ({ ...item, activityName: activity.activityName })));
  const metrics = keyMetrics
    .map(([label, getter]) => [label, getter(rows)])
    .filter(([label, value]) => label === "Activities" || Number(value) > 0);

  modalTitle.textContent = village;
  modalSubtitle.textContent = `${formatNumber(rows.length)} activities · ${formatNumber(sumBeneficiaries(rows))} beneficiaries · ${projects.length} projects`;

  modalContent.innerHTML = `
    <div class="village-detail-grid">
      ${metrics.map(([label, value]) => `<div class="village-detail-metric"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}
    </div>
    <div class="village-two-col">
      ${renderChipSection("Projects", projects)}
      ${renderChipSection("Activity types", activityTypes)}
      ${renderChipSection("Target groups", targetGroups)}
      ${renderChipSection("Sustainability pillars", pillars)}
      ${renderChipSection("SDG links", sdgs)}
      ${renderEvidenceSection(evidence)}
    </div>
    <div class="village-two-col">
      ${renderListSection("Main outcomes", outcomes, "No outcomes recorded yet.")}
      ${renderListSection("Future opportunities", opportunities, "No future opportunities recorded yet.")}
    </div>
    ${challenges.length ? renderListSection("Challenges", challenges, "") : ""}
    <section class="village-detail-section">
      <h3>Activities in this village</h3>
      <div class="table-wrap">
        <table class="village-activity-table">
          <thead><tr><th>Activity</th><th>Project / type</th><th>Date</th><th>Target group</th><th>Beneficiaries</th><th>Status</th><th>Outcome</th></tr></thead>
          <tbody>${rows.map(renderActivityRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSummaryFallback(village, snapshot, reason = "No individual Supabase activity rows matched this village yet.") {
  const metrics = [
    ["Activities", snapshot.activities],
    ["Total beneficiaries", snapshot.beneficiaries],
    ["Pillars", snapshot.pillarCount || snapshot.pillars.length],
    ["SDGs", snapshot.sdgCount || snapshot.sdgs.length],
  ].filter(([, value]) => Number(value) > 0);

  modalTitle.textContent = village;
  modalSubtitle.textContent = `${formatNumber(snapshot.activities)} activities · ${formatNumber(snapshot.beneficiaries)} beneficiaries · dashboard summary view`;
  modalContent.innerHTML = `
    <div class="village-detail-note"><strong>Dashboard summary fallback:</strong> ${escapeHtml(reason)} The details below are taken from the visible Village Dashboard summary so the card never opens empty.</div>
    <div class="village-detail-grid">
      ${metrics.map(([label, value]) => `<div class="village-detail-metric"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("")}
    </div>
    <div class="village-two-col">
      ${renderChipSection("Projects", snapshot.projects)}
      ${renderChipSection("Sustainability pillars", snapshot.pillars)}
      ${renderChipSection("SDG links", snapshot.sdgs)}
      ${renderListSection("Main outcomes", snapshot.outcomes, "Pending field data")}
    </div>
    <section class="village-detail-section">
      <h3>Activity records</h3>
      <div class="village-detail-empty">The village card has summary totals, but the individual activities table needs Supabase rows where the village field contains ${escapeHtml(village)}.</div>
    </section>
  `;
}

function renderChipSection(title, items) {
  const content = items.length ? items.map((item) => `<span>${escapeHtml(item)}</span>`).join("") : `<span>Not recorded</span>`;
  return `<section class="village-detail-section"><h3>${escapeHtml(title)}</h3><div class="village-chip-row">${content}</div></section>`;
}

function renderEvidenceSection(items) {
  const content = items.length
    ? items.map((item) => {
        const url = safeUrl(item.url);
        if (!url) return `<span>${escapeHtml(item.type)} · ${escapeHtml(item.activityName)}</span>`;
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(item.type)} · ${escapeHtml(item.activityName)}</a>`;
      }).join("")
    : `<span>No evidence links recorded yet</span>`;
  return `<section class="village-detail-section"><h3>Evidence and media</h3><div class="village-chip-row">${content}</div></section>`;
}

function renderListSection(title, items, emptyText) {
  const content = items.length
    ? `<ul class="village-bullet-list">${items.slice(0, 10).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<div class="village-detail-empty">${escapeHtml(emptyText)}</div>`;
  return `<section class="village-detail-section"><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

function renderActivityRow(activity) {
  const beneficiaries = Number(activity.metrics.directBeneficiaries || 0) + Number(activity.metrics.indirectBeneficiaries || 0);
  const outcome = activity.qualitative.keyOutcome || activity.qualitative.success || activity.description || "Pending field data";
  return `<tr><td><strong>${escapeHtml(activity.activityName)}</strong><small>${escapeHtml(activity.responsiblePerson || "Responsible person not recorded")}</small></td><td>${escapeHtml(activity.projectName)}<small>${escapeHtml(activity.activityType)}</small></td><td>${escapeHtml(activity.datePeriod || "Not recorded")}</td><td>${escapeHtml(activity.targetGroup || "Not recorded")}</td><td>${formatNumber(beneficiaries)}</td><td><span class="village-status-pill">${escapeHtml(activity.validation.approvalStatus)}</span></td><td>${escapeHtml(outcome)}</td></tr>`;
}

function findVillageCard(village) {
  return [...document.querySelectorAll(".village-summary-card")].find((card) => villageMatches(village, card.querySelector("h4")?.textContent));
}

function captureVillageSnapshot(village) {
  const card = findVillageCard(village);
  const tableRow = [...document.querySelectorAll("table tbody tr")].find((row) => villageMatches(village, row.querySelector("td")?.textContent));
  const cells = tableRow ? [...tableRow.querySelectorAll("td")].map((cell) => cell.textContent.trim()) : [];
  const cardMetricText = card ? [...card.querySelectorAll(".village-metrics span")].map((span) => span.textContent.trim()) : [];
  if (!card && !tableRow) return null;

  return {
    village,
    activities: parseNumber(cardMetricText.find((text) => /activit/i.test(text)) || cells[1]),
    beneficiaries: parseNumber(cardMetricText.find((text) => /beneficiar/i.test(text)) || cells[2]),
    pillarCount: parseNumber(cardMetricText.find((text) => /pillar/i.test(text))),
    sdgCount: parseNumber(cardMetricText.find((text) => /sdg/i.test(text))),
    projects: splitList(cells[3] || card?.querySelector("p")?.textContent || ""),
    pillars: splitList(cells[4] || [...(card?.querySelectorAll(".village-tags b") || [])].map((tag) => tag.textContent.trim()).join(", ")),
    sdgs: splitList(cells[5] || ""),
    outcomes: splitList(cells[6] || ""),
  };
}

async function showVillageDetails(village) {
  activeVillage = village;
  const snapshot = captureVillageSnapshot(village);
  openModal();
  renderLoading(village);

  try {
    const activities = await loadActivities();
    if (activeVillage !== village) return;
    const rows = activities.filter((activity) => activity.villages.some((item) => villageMatches(village, item)));
    if (rows.length) return renderDetails(village, rows);
    if (snapshot) return renderSummaryFallback(village, snapshot);
    modalTitle.textContent = village;
    modalSubtitle.textContent = "No village data found.";
    modalContent.innerHTML = `<div class="village-detail-empty">No dashboard summary or Supabase activity rows were found for ${escapeHtml(village)}.</div>`;
  } catch (error) {
    renderError(village, error, snapshot);
  }
}

function enhanceVillageCards() {
  document.querySelectorAll(".village-summary-card").forEach((card) => {
    if (card.dataset.villageEnhanced === "true") return;
    const title = card.querySelector("h4")?.textContent?.trim();
    if (!title) return;
    card.dataset.villageEnhanced = "true";
    card.classList.add("village-summary-card--clickable");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Open details for ${title}`);

    const action = document.createElement("span");
    action.className = "village-open-details";
    action.textContent = "Open village details";
    card.appendChild(action);

    card.addEventListener("click", () => showVillageDetails(title));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showVillageDetails(title);
      }
    });
  });
}

function startEnhancer() {
  installStyles();
  createModal();
  enhanceVillageCards();
  const observer = new MutationObserver(() => enhanceVillageCards());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startEnhancer);
} else {
  startEnhancer();
}
