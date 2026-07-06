import { supabase } from "./lib/supabaseClient";

let reportDataPromise = null;
let latestCapturedGenderPayload = null;

const genderLevels = [
  ["not_assessed", "Not assessed"],
  ["not_applicable", "Not applicable"],
  ["low", "Low contribution"],
  ["moderate", "Moderate contribution"],
  ["high", "High contribution"],
];

const css = `
  .gender-equality-section {
    border: 1px solid rgba(230, 0, 126, 0.16) !important;
    background: linear-gradient(135deg, rgba(230, 0, 126, 0.07), rgba(255, 133, 0, 0.05)) !important;
  }

  .gender-equality-section legend {
    color: var(--magenta, #e6007e) !important;
  }

  .gender-note {
    padding: 12px 14px;
    border: 1px dashed rgba(230, 0, 126, 0.25);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.76);
    color: var(--muted, #6a7188);
    line-height: 1.6;
  }

  .gender-save-status {
    display: block;
    margin-top: 8px;
    color: var(--muted, #6a7188);
    font-size: 0.82rem;
    font-weight: 800;
  }

  .gender-report-panel {
    padding: 22px;
    margin: 18px 0;
    border: 1px solid rgba(230, 0, 126, 0.16);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: var(--shadow, 0 24px 70px rgba(20, 30, 84, 0.12));
  }

  .gender-report-panel h3,
  .gender-report-section h4 {
    margin: 0;
    color: var(--navy, #242b78);
    font-family: "Space Grotesk", sans-serif;
  }

  .gender-report-panel > p {
    margin: 6px 0 16px;
    color: var(--muted, #6a7188);
    line-height: 1.6;
  }

  .gender-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .gender-kpi-grid div,
  .gender-report-section {
    border: 1px solid rgba(36, 43, 120, 0.1);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.82);
  }

  .gender-kpi-grid div {
    padding: 16px;
  }

  .gender-kpi-grid strong {
    display: block;
    color: var(--magenta, #e6007e);
    font-family: "Space Grotesk", sans-serif;
    font-size: 1.55rem;
  }

  .gender-kpi-grid span {
    color: var(--muted, #6a7188);
    font-size: 0.84rem;
    font-weight: 800;
  }

  .gender-report-section {
    padding: 18px;
    margin-top: 16px;
  }

  .gender-report-table {
    width: 100%;
    min-width: 960px;
    border-collapse: collapse;
  }

  .gender-report-table th,
  .gender-report-table td {
    padding: 12px;
    border-bottom: 1px solid rgba(36, 43, 120, 0.09);
    text-align: left;
    vertical-align: top;
  }

  .gender-report-table th {
    color: var(--navy, #242b78);
    font-size: 0.82rem;
  }

  .gender-report-table small {
    display: block;
    margin-top: 3px;
    color: var(--muted, #6a7188);
  }

  .gender-badge {
    display: inline-flex;
    padding: 6px 9px;
    border-radius: 999px;
    background: rgba(230, 0, 126, 0.1);
    color: var(--magenta, #e6007e);
    font-size: 0.8rem;
    font-weight: 900;
  }

  @media print {
    .gender-equality-section,
    .gender-save-status {
      display: none !important;
    }

    .gender-report-panel {
      box-shadow: none;
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }

  @media (max-width: 900px) {
    .gender-kpi-grid {
      grid-template-columns: 1fr;
    }
  }
`;

function installStyles() {
  if (document.getElementById("gender-equality-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "gender-equality-enhancer-style";
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

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(number(value)));
}

function levelLabel(value) {
  return genderLevels.find(([key]) => key === value)?.[1] || "Not assessed";
}

function getFieldValue(form, labelText) {
  const labels = [...form.querySelectorAll("label")];
  const label = labels.find((item) => item.textContent.trim().toLowerCase().startsWith(labelText.toLowerCase()));
  return label?.querySelector("input, textarea, select")?.value?.trim() || "";
}

function injectGenderFields() {
  document.querySelectorAll("form.submission").forEach((form) => {
    if (form.querySelector(".gender-equality-section")) return;

    const section = document.createElement("fieldset");
    section.className = "panel form-section gender-equality-section";
    section.innerHTML = `
      <legend>Gender Equality Tracking</legend>
      <div class="form-grid">
        <div class="gender-note span-2">
          Record how this activity contributes to gender equality. This data will appear in the reports and help RDC track women's participation, balanced access, leadership, and inclusion outcomes.
          <span class="gender-save-status">Gender equality details are saved after the activity is submitted.</span>
        </div>
        <label>Gender equality relevance
          <select data-gender-field="gender_equality_level">
            ${genderLevels.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </label>
        <label>Female participants / beneficiaries
          <input min="0" type="number" data-gender-field="female_participants" />
        </label>
        <label>Male participants / beneficiaries
          <input min="0" type="number" data-gender-field="male_participants" />
        </label>
        <label>Women in leadership / decision roles
          <input min="0" type="number" data-gender-field="women_leadership_count" />
        </label>
        <label class="span-2">Gender equality actions
          <textarea data-gender-field="gender_equality_actions" placeholder="Example: women included in planning, safe participation spaces, girls encouraged to join, equal access to training, women-led implementation."></textarea>
        </label>
        <label class="span-2">Gender equality outcome / evidence
          <textarea data-gender-field="gender_equality_outcome" placeholder="Example: number of women reached, leadership roles, changes in access, skills, income, participation, or decision-making."></textarea>
        </label>
      </div>
    `;

    const quantitativeSection = [...form.querySelectorAll("fieldset")].find((fieldset) => fieldset.querySelector("legend")?.textContent?.includes("Quantitative"));
    quantitativeSection?.after(section) || form.prepend(section);
  });
}

function captureGenderPayload(form) {
  const fields = Object.fromEntries(
    [...form.querySelectorAll("[data-gender-field]")].map((field) => [field.dataset.genderField, field.value || ""]),
  );

  latestCapturedGenderPayload = {
    projectName: getFieldValue(form, "Project name"),
    activityName: getFieldValue(form, "Activity name"),
    values: {
      gender_equality_level: fields.gender_equality_level || "not_assessed",
      female_participants: number(fields.female_participants),
      male_participants: number(fields.male_participants),
      women_leadership_count: number(fields.women_leadership_count),
      gender_equality_actions: fields.gender_equality_actions || "",
      gender_equality_outcome: fields.gender_equality_outcome || "",
    },
  };
}

async function attachGenderPayloadToLatestActivity() {
  const payload = latestCapturedGenderPayload;
  if (!payload?.activityName) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data: rows, error } = await supabase
      .from("activities")
      .select("id, activity_name, project_name, created_at")
      .eq("submitted_by", user.id)
      .eq("activity_name", payload.activityName)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && rows?.[0]?.id) {
      const { error: updateError } = await supabase.from("activities").update(payload.values).eq("id", rows[0].id);
      updateGenderStatus(updateError ? updateError.message : "Gender equality details saved.");
      reportDataPromise = null;
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 700));
  }
}

function updateGenderStatus(message) {
  document.querySelectorAll(".gender-save-status").forEach((status) => {
    status.textContent = message;
  });
}

function watchSubmissions() {
  if (window.__genderEqualitySubmitWatcher) return;
  window.__genderEqualitySubmitWatcher = true;

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains("submission")) return;
      captureGenderPayload(form);
      window.setTimeout(() => attachGenderPayloadToLatestActivity(), 1800);
    },
    true,
  );
}

async function loadReportData() {
  if (reportDataPromise) return reportDataPromise;

  reportDataPromise = (async () => {
    const { data, error } = await supabase
      .from("activities")
      .select("id, activity_name, project_name, activity_type, village, date_period, direct_beneficiaries, indirect_beneficiaries, women, gender_equality_level, female_participants, male_participants, women_leadership_count, gender_equality_actions, gender_equality_outcome, approval_status")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  })();

  return reportDataPromise;
}

function buildGenderSummary(rows) {
  const assessed = rows.filter((row) => row.gender_equality_level && row.gender_equality_level !== "not_assessed");
  const highOrModerate = rows.filter((row) => ["high", "moderate"].includes(row.gender_equality_level));
  const femaleParticipants = rows.reduce((total, row) => total + number(row.female_participants || row.women), 0);
  const maleParticipants = rows.reduce((total, row) => total + number(row.male_participants), 0);
  const womenLeadership = rows.reduce((total, row) => total + number(row.women_leadership_count), 0);
  const totalGenderTracked = femaleParticipants + maleParticipants;
  const femaleShare = totalGenderTracked ? Math.round((femaleParticipants / totalGenderTracked) * 100) : 0;

  return {
    activities: rows.length,
    assessed: assessed.length,
    highOrModerate: highOrModerate.length,
    femaleParticipants,
    maleParticipants,
    womenLeadership,
    femaleShare,
  };
}

function renderGenderReport(panel, rows) {
  const summary = buildGenderSummary(rows);
  const trackedRows = rows.filter((row) => row.gender_equality_level || row.female_participants || row.male_participants || row.gender_equality_actions || row.gender_equality_outcome);

  panel.innerHTML = `
    <h3>Gender Equality Impact Report</h3>
    <p>This section tracks how every recorded activity contributes to gender equality: female and male participation, women in leadership, inclusion actions, outcomes, and evidence.</p>
    <div class="gender-kpi-grid">
      <div><strong>${formatNumber(summary.activities)}</strong><span>Total activities</span></div>
      <div><strong>${formatNumber(summary.assessed)}</strong><span>Activities assessed for gender equality</span></div>
      <div><strong>${formatNumber(summary.highOrModerate)}</strong><span>Moderate / high gender contribution</span></div>
      <div><strong>${formatNumber(summary.femaleParticipants)}</strong><span>Female participants / beneficiaries</span></div>
      <div><strong>${formatNumber(summary.maleParticipants)}</strong><span>Male participants / beneficiaries</span></div>
      <div><strong>${formatNumber(summary.femaleShare)}%</strong><span>Female share of tracked participants</span></div>
      <div><strong>${formatNumber(summary.womenLeadership)}</strong><span>Women in leadership / decision roles</span></div>
    </div>
    <section class="gender-report-section">
      <h4>Gender equality by activity</h4>
      <div class="table-wrap">
        <table class="gender-report-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Village</th>
              <th>Gender relevance</th>
              <th>Female / male</th>
              <th>Women leadership</th>
              <th>Actions</th>
              <th>Outcome / evidence</th>
            </tr>
          </thead>
          <tbody>
            ${trackedRows.map(renderGenderActivityRow).join("") || `<tr><td colspan="7">No gender equality data has been recorded yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderGenderActivityRow(row) {
  return `
    <tr>
      <td><strong>${escapeHtml(row.activity_name || "Untitled activity")}</strong><small>${escapeHtml(row.project_name || "Untitled project")} · ${escapeHtml(row.date_period || "Date not recorded")}</small></td>
      <td>${escapeHtml(row.village || "Not recorded")}</td>
      <td><span class="gender-badge">${escapeHtml(levelLabel(row.gender_equality_level))}</span></td>
      <td>${formatNumber(row.female_participants || row.women)} / ${formatNumber(row.male_participants)}</td>
      <td>${formatNumber(row.women_leadership_count)}</td>
      <td>${escapeHtml(row.gender_equality_actions || "Not recorded")}</td>
      <td>${escapeHtml(row.gender_equality_outcome || "Not recorded")}</td>
    </tr>
  `;
}

async function injectGenderReport() {
  const reportsPage = document.querySelector(".reports-page");
  if (!reportsPage || reportsPage.querySelector(".gender-report-panel")) return;

  const panel = document.createElement("article");
  panel.className = "gender-report-panel";
  panel.innerHTML = `<div class="gender-report-note">Loading gender equality report...</div>`;

  const departmentPanel = reportsPage.querySelector(".department-report-panel");
  departmentPanel?.after(panel) || reportsPage.prepend(panel);

  try {
    renderGenderReport(panel, await loadReportData());
  } catch (error) {
    panel.innerHTML = `<h3>Gender Equality Impact Report</h3><p>${escapeHtml(error.message || "Could not load gender equality data.")}</p>`;
  }
}

async function enrichDepartmentReportTables() {
  const rows = await loadReportData().catch(() => []);
  if (!rows.length) return;
  const byActivity = new Map(rows.map((row) => [String(row.activity_name || "").trim().toLowerCase(), row]));

  document.querySelectorAll(".department-report-table").forEach((table) => {
    if (table.dataset.genderEnhanced === "true") return;
    table.dataset.genderEnhanced = "true";

    const headerRow = table.querySelector("thead tr");
    if (headerRow) {
      const th = document.createElement("th");
      th.textContent = "Gender equality";
      headerRow.appendChild(th);
    }

    table.querySelectorAll("tbody tr").forEach((tr) => {
      const activityName = tr.querySelector("td strong")?.textContent?.trim().toLowerCase();
      const row = byActivity.get(activityName);
      const td = document.createElement("td");
      td.innerHTML = row
        ? `<span class="gender-badge">${escapeHtml(levelLabel(row.gender_equality_level))}</span><small>F/M: ${formatNumber(row.female_participants || row.women)} / ${formatNumber(row.male_participants)} · Women leadership: ${formatNumber(row.women_leadership_count)}</small>`
        : "Not recorded";
      tr.appendChild(td);
    });
  });
}

function startGenderEqualityEnhancer() {
  installStyles();
  injectGenderFields();
  injectGenderReport();
  enrichDepartmentReportTables();
  watchSubmissions();

  const observer = new MutationObserver(() => {
    injectGenderFields();
    injectGenderReport();
    enrichDepartmentReportTables();
  });

  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startGenderEqualityEnhancer);
} else {
  startGenderEqualityEnhancer();
}
