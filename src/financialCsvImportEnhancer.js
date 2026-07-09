import { supabase } from "./lib/supabaseClient";
import * as XLSX from "xlsx";

const templateHeaders = ["project_code", "project_name", "status", "sector", "entity", "start_year", "end_year", "total_budget_eur", "annual_amount_eur", "project_year", "notes"];
const requiredHeaders = ["project_name"];
const allowedStatuses = new Set(["running", "completed", "accepted_to_launch", "ongoing", "phase_1", "exploration", "postponed_cancelled", "not_accepted", "accepted", "phase_2"]);
const statusAliases = {
  active: "running",
  "running project": "running",
  "completed project": "completed",
  done: "completed",
  closed: "completed",
  "accepted, to be launched": "accepted_to_launch",
  "accepted to be launched": "accepted_to_launch",
  "to be launched": "accepted_to_launch",
  "ongoing proposal": "ongoing",
  "on going": "ongoing",
  "in progress": "running",
  "postponed / cancelled": "postponed_cancelled",
  "postponed/cancelled": "postponed_cancelled",
  cancelled: "postponed_cancelled",
  canceled: "postponed_cancelled",
  "not accepted": "not_accepted",
  rejected: "not_accepted",
  "phase 1": "phase_1",
  "phase i": "phase_1",
  "phase 2": "phase_2",
  "phase ii": "phase_2",
};

const headerAliases = {
  project_code: ["project_code", "project code", "code", "project id", "project_id", "id", "project no", "project number", "no", "reference", "ref", "كود المشروع", "رقم المشروع"],
  project_name: ["project_name", "project name", "project", "name", "title", "project title", "اسم المشروع", "المشروع"],
  status: ["status", "project status", "stage", "phase", "case", "حالة", "حالة المشروع"],
  sector: ["sector", "field", "area", "theme", "program", "pillar", "المجال", "القطاع"],
  entity: ["entity", "intity", "organization", "organisation", "org", "partner", "institution", "owner", "جهة", "الجهة", "المؤسسة"],
  start_year: ["start_year", "start year", "start", "from", "from year", "year start", "beginning year", "بداية", "سنة البداية"],
  end_year: ["end_year", "end year", "end", "to", "to year", "year end", "ending year", "نهاية", "سنة النهاية"],
  total_budget_eur: ["total_budget_eur", "total budget eur", "total budget", "budget", "amount", "amount eur", "total amount", "grant amount", "total", "value", "eur", "budget eur", "إجمالي الميزانية", "الميزانية الكلية", "اجمالي الميزانية"],
  annual_amount_eur: ["annual_amount_eur", "annual amount eur", "annual amount", "annual budget", "annual budget eur", "yearly amount", "yearly budget", "amount for year", "budget 2026", "2026 budget", "annual", "الميزانية السنوية", "المبلغ السنوي"],
  project_year: ["project_year", "project year", "record year", "proposal year", "year", "fiscal year", "سنة", "السنة"],
  notes: ["notes", "note", "remarks", "comment", "comments", "description", "details", "ملاحظات", "ملاحظة"],
};

const aliasLookup = Object.fromEntries(Object.entries(headerAliases).flatMap(([canonical, aliases]) => aliases.map((alias) => [normalizeHeaderKey(alias), canonical])));

function installCsvImportStyles() {
  if (document.getElementById("financial-csv-import-style")) return;
  const style = document.createElement("style");
  style.id = "financial-csv-import-style";
  style.textContent = `
    .financial-template, .financial-import { background: #ffffff !important; color: #26313d !important; border: 1px solid #d8dee8 !important; }
    body.financial-readonly .financial-template, body.financial-readonly .financial-import { display: none !important; }
    .csv-preview-backdrop { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 18px; background: rgba(16, 24, 40, 0.55); }
    .csv-preview-modal { width: min(980px, 100%); max-height: min(92vh, 860px); overflow: auto; padding: 22px; border-radius: 20px; background: white; box-shadow: 0 28px 90px rgba(16, 24, 40, 0.28); }
    .csv-preview-modal h3 { margin: 0 0 8px; color: #26313d; font-size: 1.35rem; font-weight: 900; }
    .csv-preview-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }
    .csv-preview-kpis div, .csv-error-list, .csv-mapping-list { padding: 12px; border: 1px solid #e5e8ed; border-radius: 12px; background: #f8fafc; }
    .csv-preview-kpis strong, .csv-preview-kpis span { display: block; }
    .csv-preview-kpis strong { color: #26313d; font-size: 1.7rem; font-weight: 900; }
    .csv-preview-kpis span { color: #697386; font-size: 0.82rem; font-weight: 850; }
    .csv-error-list { display: grid; gap: 6px; color: #991b1b; border-color: #fecaca; background: #fff1f2; font-size: 0.88rem; font-weight: 800; }
    .csv-mapping-list { display: grid; gap: 5px; margin: 10px 0; color: #475569; font-size: 0.82rem; font-weight: 800; }
    .csv-preview-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
    .csv-preview-actions button { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 900; cursor: pointer; }
    .csv-confirm-import { background: #ff8d2a; color: white; }
    .csv-cancel-import { background: #eef2f7; color: #26313d; }
    @media (max-width: 720px) { .csv-preview-kpis { grid-template-columns: 1fr; } .csv-preview-actions { display: grid; } }
  `;
  document.head.appendChild(style);
}

function downloadTemplate() {
  const example = ["GWS-2025-001", "GWS-SENSE", "running", "Environment & Natural Resources", "HU", "2025", "2027", "5277009.87", "120000", "2025", "Total budget is counted once; annual_amount_eur is only for the selected year"];
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders, example]);
  worksheet["!cols"] = templateHeaders.map((header) => ({ wch: Math.max(16, header.length + 3) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Projects");
  XLSX.writeFile(workbook, "financial_projects_template.xlsx");
}

function detectDelimiter(text) {
  const firstLine = String(text || "").split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({ delimiter, count: firstLine.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') { cell += '"'; i += 1; } else { inQuotes = !inQuotes; }
    } else if (char === delimiter && !inQuotes) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = []; cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  rows.sourceType = delimiter === "\t" ? "TSV" : "CSV";
  return rows;
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    const empty = [];
    empty.sourceType = "Excel";
    return empty;
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false })
    .filter((row) => row.some((value) => String(value).trim() !== ""));
  rows.sourceType = "Excel";
  rows.sheetName = firstSheetName;
  return rows;
}

function normalizeHeaderKey(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€/g, "eur")
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function canonicalHeader(value) {
  const normalized = normalizeHeaderKey(value);
  if (aliasLookup[normalized]) return aliasLookup[normalized];
  if (templateHeaders.includes(normalized)) return normalized;
  if (normalized.includes("project") && normalized.includes("code")) return "project_code";
  if (normalized.includes("project") && (normalized.includes("name") || normalized.includes("title"))) return "project_name";
  if (normalized.includes("total") && (normalized.includes("budget") || normalized.includes("amount"))) return "total_budget_eur";
  if (normalized.includes("annual") && (normalized.includes("budget") || normalized.includes("amount"))) return "annual_amount_eur";
  if (normalized.includes("start") && normalized.includes("year")) return "start_year";
  if (normalized.includes("end") && normalized.includes("year")) return "end_year";
  return normalized;
}

function normalizeStatus(value) {
  const raw = String(value || "running").trim().toLowerCase();
  const normalized = raw.replaceAll("-", "_").replaceAll(" ", "_");
  return statusAliases[raw] || normalized || "running";
}

function parseAmount(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const cleaned = raw.replaceAll("€", "").replaceAll(",", "").trim();
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : NaN;
}
function parseOptionalAmount(value) { return parseAmount(value); }
function currentYear() { return new Date().getFullYear(); }
function parseYear(value, fallback = currentYear()) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const match = raw.match(/20\d{2}/);
  const year = Number(match?.[0] || raw);
  return Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : NaN;
}
function hashString(value) { let hash = 0; String(value || "").split("").forEach((char) => { hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; }); return Math.abs(hash).toString(16).slice(0, 6).toUpperCase(); }
function makeAutoCode(name, year) { return `AUTO-${year || currentYear()}-${hashString(name)}`; }

function buildRecord(headers, line) {
  const record = {};
  headers.forEach(({ original, canonical }, i) => {
    const value = String(line[i] || "").trim();
    if (!value) return;
    record[canonical] = value;
    record[`__raw_${original}`] = value;
  });
  return record;
}

function validateRows(parsed) {
  const errors = [];
  const rows = [];
  const seenCodes = new Set();
  if (parsed.length < 1) return { rows, errors: ["The file is empty."], totalRows: 0, mappings: [], sourceType: parsed.sourceType || "File" };

  const headers = parsed[0].map((header) => ({ original: String(header || "").trim(), canonical: canonicalHeader(header) }));
  const canonicalHeaders = headers.map((header) => header.canonical);
  const mappings = headers
    .filter((header) => header.original && header.original !== header.canonical)
    .map((header) => `${header.original} → ${header.canonical}`);
  const missing = requiredHeaders.filter((header) => !canonicalHeaders.includes(header));
  if (missing.length) errors.push(`Missing required columns: ${missing.join(", ")}. Project code, years, annual amount, notes, sector, entity, and status can be generated or defaulted.`);

  parsed.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const record = buildRecord(headers, line);
    const rowErrors = [];
    const projectName = record.project_name || "";
    const status = normalizeStatus(record.status || "running");
    const start = parseYear(record.start_year || record.project_year, currentYear());
    const end = parseYear(record.end_year || record.project_year || record.start_year, start);
    const projectYear = parseYear(record.project_year || record.start_year, start);
    const totalBudget = parseAmount(record.total_budget_eur);
    const annualAmount = parseOptionalAmount(record.annual_amount_eur);
    const code = record.project_code || (projectName ? makeAutoCode(projectName, projectYear) : "");

    if (!projectName) rowErrors.push("project_name is required");
    if (code && seenCodes.has(code)) rowErrors.push(`duplicate project_code in file: ${code}`);
    if (!allowedStatuses.has(status)) rowErrors.push(`invalid status: ${record.status || "running"}`);
    if (!Number.isFinite(start)) rowErrors.push(`invalid start_year: ${record.start_year}`);
    if (!Number.isFinite(end)) rowErrors.push(`invalid end_year: ${record.end_year}`);
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) rowErrors.push("end_year cannot be before start_year");
    if (!Number.isFinite(projectYear)) rowErrors.push(`invalid project_year: ${record.project_year}`);
    if (!Number.isFinite(totalBudget)) rowErrors.push(`invalid total_budget_eur: ${record.total_budget_eur}`);
    if (!Number.isFinite(annualAmount)) rowErrors.push(`invalid annual_amount_eur: ${record.annual_amount_eur}`);
    if (code) seenCodes.add(code);

    if (rowErrors.length) { errors.push(`Row ${rowNumber}: ${rowErrors.join("; ")}`); return; }
    rows.push({
      project_code: code,
      project_name: projectName,
      status,
      sector: record.sector || "Other",
      entity: record.entity || "HU",
      amount_eur: totalBudget,
      total_budget_eur: totalBudget,
      annual_amount_eur: annualAmount,
      start_year: start,
      end_year: end,
      project_year: projectYear,
      notes: record.notes || "",
      updated_at: new Date().toISOString(),
    });
  });
  if (!rows.length && !errors.length) errors.push("No data rows found. Add projects under the header row.");
  return { rows, errors, totalRows: Math.max(parsed.length - 1, 0), mappings, sourceType: parsed.sourceType || "File", sheetName: parsed.sheetName || "" };
}

function validateCsv(text) { return validateRows(parseCsv(text)); }
function validateExcel(buffer) { return validateRows(parseExcel(buffer)); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function previewTable(rows) {
  const sample = rows.slice(0, 10);
  if (!sample.length) return "";
  return `<div class="table-wrap"><table class="financial-table"><thead><tr><th>Code</th><th>Project</th><th>Status</th><th>Years</th><th>Total Budget</th><th>Annual</th><th>Entity</th></tr></thead><tbody>${sample.map((row) => `<tr><td>${escapeHtml(row.project_code)}</td><td>${escapeHtml(row.project_name)}</td><td>${escapeHtml(row.status)}</td><td>${row.start_year}-${row.end_year}</td><td>${escapeHtml(row.total_budget_eur)}</td><td>${escapeHtml(row.annual_amount_eur)}</td><td>${escapeHtml(row.entity)}</td></tr>`).join("")}</tbody></table></div>`;
}

async function importRows(rows, messageBox, confirmButton) {
  confirmButton.disabled = true;
  confirmButton.textContent = "Importing...";
  const { data: { user } } = await supabase.auth.getUser();
  const codes = rows.map((row) => row.project_code);
  const { data: existingRows, error: existingError } = await supabase.from("financial_projects").select("project_code").in("project_code", codes);
  if (existingError) throw existingError;
  const existingCodes = new Set((existingRows || []).map((row) => row.project_code));
  const toInsert = rows.filter((row) => !existingCodes.has(row.project_code)).map((row) => ({ ...row, created_by: user?.id || null }));
  const toUpdate = rows.filter((row) => existingCodes.has(row.project_code));
  if (toInsert.length) { const { error } = await supabase.from("financial_projects").insert(toInsert); if (error) throw error; }
  for (const row of toUpdate) { const { error } = await supabase.from("financial_projects").update(row).eq("project_code", row.project_code); if (error) throw error; }
  messageBox.className = "auth-info";
  messageBox.textContent = `Imported ${toInsert.length} new projects and updated ${toUpdate.length} existing projects.`;
  document.querySelector(".financial-refresh")?.click();
  window.setTimeout(() => document.querySelector(".csv-preview-backdrop")?.remove(), 1600);
}

function showPreview(result) {
  const backdrop = document.createElement("div");
  const mappingHtml = result.mappings?.length ? `<div class="csv-mapping-list"><strong>Detected columns</strong>${result.mappings.slice(0, 12).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : "";
  const sourceInfo = result.sourceType === "Excel" && result.sheetName ? `Excel sheet: ${escapeHtml(result.sheetName)}` : result.sourceType || "File";
  backdrop.className = "csv-preview-backdrop";
  backdrop.innerHTML = `<section class="csv-preview-modal"><h3>Financial import preview</h3><p class="financial-empty">${sourceInfo}. Smart import accepts Excel, CSV, semicolon CSV, and tab-separated files. Missing project_code is auto-generated from project name and year.</p><div class="csv-preview-kpis"><div><strong>${result.totalRows}</strong><span>Total rows in file</span></div><div><strong>${result.rows.length}</strong><span>Valid rows ready to import</span></div><div><strong>${result.errors.length}</strong><span>Errors</span></div></div>${mappingHtml}${result.errors.length ? `<div class="csv-error-list">${result.errors.slice(0, 15).map((error) => `<span>${escapeHtml(error)}</span>`).join("")}${result.errors.length > 15 ? `<span>And ${result.errors.length - 15} more errors.</span>` : ""}</div>` : ""}${previewTable(result.rows)}<div class="csv-import-message"></div><div class="csv-preview-actions"><button type="button" class="csv-cancel-import">Cancel</button><button type="button" class="csv-confirm-import" ${result.errors.length || !result.rows.length ? "disabled" : ""}>Confirm Import</button></div></section>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector(".csv-cancel-import")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.remove(); });
  backdrop.querySelector(".csv-confirm-import")?.addEventListener("click", async (event) => {
    const messageBox = backdrop.querySelector(".csv-import-message");
    try { await importRows(result.rows, messageBox, event.currentTarget); } catch (error) { messageBox.className = "auth-error"; messageBox.textContent = `Import failed: ${error.message}. Make sure the latest financial SQL migrations have been run in Supabase.`; event.currentTarget.disabled = false; event.currentTarget.textContent = "Confirm Import"; }
  });
}

function isExcelFile(file) {
  return /\.(xlsx|xls)$/i.test(file.name || "") || String(file.type || "").includes("spreadsheet") || String(file.type || "").includes("excel");
}

function handleFileSelection(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  const excel = isExcelFile(file);
  reader.onload = () => {
    try {
      showPreview(excel ? validateExcel(reader.result) : validateCsv(String(reader.result || "")));
    } catch (error) {
      showPreview({ rows: [], errors: [`Could not read the selected ${excel ? "Excel" : "CSV"} file: ${error.message}`], totalRows: 0, mappings: [], sourceType: excel ? "Excel" : "CSV" });
    }
  };
  reader.onerror = () => showPreview({ rows: [], errors: ["Could not read the selected file."], totalRows: 0, mappings: [], sourceType: excel ? "Excel" : "CSV" });
  if (excel) reader.readAsArrayBuffer(file); else reader.readAsText(file);
}

function ensureCsvButtons() {
  if (!document.body.classList.contains("external-financial-view")) return;
  const actions = document.querySelector(".financial-actions");
  if (!actions || actions.querySelector(".financial-template")) return;
  const templateButton = document.createElement("button"); templateButton.type = "button"; templateButton.className = "financial-template"; templateButton.textContent = "Download Excel Template"; templateButton.addEventListener("click", downloadTemplate);
  const importButton = document.createElement("button"); importButton.type = "button"; importButton.className = "financial-import"; importButton.textContent = "Import Excel / CSV";
  const input = document.createElement("input"); input.type = "file"; input.accept = ".xlsx,.xls,.csv,.txt,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"; input.hidden = true; input.addEventListener("change", handleFileSelection); importButton.addEventListener("click", () => input.click());
  actions.prepend(input); actions.prepend(importButton); actions.prepend(templateButton);
}
function startFinancialCsvImportEnhancer() { installCsvImportStyles(); ensureCsvButtons(); const observer = new MutationObserver(() => ensureCsvButtons()); observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true }); }
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", startFinancialCsvImportEnhancer); } else { startFinancialCsvImportEnhancer(); }
