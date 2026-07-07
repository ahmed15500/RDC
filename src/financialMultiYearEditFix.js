import { supabase } from "./lib/supabaseClient";

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

function rowProjectCode(button) {
  const tr = button.closest("tr");
  return tr?.querySelector("td")?.textContent?.trim() || "";
}

async function getProjectByCode(projectCode) {
  if (!projectCode) return null;
  const { data, error } = await supabase
    .from("financial_projects")
    .select("*")
    .eq("project_code", projectCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function openEditModal(row) {
  const startYear = Number(row.start_year || row.project_year || new Date().getFullYear());
  const endYear = Number(row.end_year || row.project_year || startYear);
  const totalBudget = number(row.total_budget_eur ?? row.amount_eur);

  const backdrop = document.createElement("div");
  backdrop.className = "financial-modal-backdrop";
  backdrop.innerHTML = `
    <form class="financial-modal">
      <h3>Edit financial project data</h3>
      <p class="financial-empty">Update the project years, total budget, and annual amount. Total budget is counted once; annual amount is counted only for the selected year.</p>
      <div class="financial-form-grid">
        <label class="financial-span-2">Project code<input name="project_code" value="${escapeHtml(row.project_code || "")}" /></label>
        <label class="financial-span-2">Project name<input name="project_name" required value="${escapeHtml(row.project_name || "")}" /></label>
        <label>Status<select name="status">${statusOptions.map(([value, text]) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>
        <label>Sector<select name="sector">${defaultSectors.map((sector) => `<option ${row.sector === sector ? "selected" : ""}>${sector}</option>`).join("")}</select></label>
        <label>Entity<select name="entity">${["HU", "SEKEM", "EBDA", "All entities", "Other"].map((entity) => `<option ${row.entity === entity ? "selected" : ""}>${entity}</option>`).join("")}</select></label>
        <label>Record / proposal year<input name="project_year" type="number" min="2020" max="2100" value="${Number(row.project_year || startYear)}" /></label>
        <label>Start year<input name="start_year" type="number" min="2020" max="2100" value="${startYear}" /></label>
        <label>End year<input name="end_year" type="number" min="2020" max="2100" value="${endYear}" /></label>
        <label>Total budget EUR<input name="total_budget_eur" type="number" min="0" step="0.01" value="${totalBudget}" /></label>
        <label>Annual amount for selected year<input name="annual_amount_eur" type="number" min="0" step="0.01" value="${number(row.annual_amount_eur)}" /></label>
        <label class="financial-span-2">Notes<textarea name="notes">${escapeHtml(row.notes || "")}</textarea></label>
      </div>
      <div class="financial-modal-actions">
        <button type="button" class="financial-secondary financial-cancel">Cancel</button>
        <button type="submit" class="financial-primary">Save changes</button>
      </div>
    </form>`;

  document.body.appendChild(backdrop);
  backdrop.querySelector(".financial-cancel")?.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) backdrop.remove(); });
  backdrop.querySelector("form")?.addEventListener("submit", (event) => updateProject(event, row.id));
}

async function updateProject(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Saving...";

  const formData = new FormData(form);
  const startYear = Number(formData.get("start_year") || formData.get("project_year") || new Date().getFullYear());
  const endYear = Math.max(startYear, Number(formData.get("end_year") || startYear));
  const totalBudget = number(formData.get("total_budget_eur"));
  const projectCode = String(formData.get("project_code") || "").trim();

  const payload = {
    project_code: projectCode || null,
    project_name: String(formData.get("project_name") || "").trim(),
    status: String(formData.get("status") || "running"),
    sector: String(formData.get("sector") || "Other"),
    entity: String(formData.get("entity") || "HU"),
    project_year: Number(formData.get("project_year") || startYear),
    start_year: startYear,
    end_year: endYear,
    amount_eur: totalBudget,
    total_budget_eur: totalBudget,
    annual_amount_eur: number(formData.get("annual_amount_eur")),
    notes: String(formData.get("notes") || "").trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("financial_projects").update(payload).eq("id", id);
  if (error) {
    button.disabled = false;
    button.textContent = "Save changes";
    form.querySelector(".financial-empty").textContent = `Could not update data: ${error.message}`;
    return;
  }

  form.closest(".financial-modal-backdrop")?.remove();
  document.querySelector(".financial-refresh")?.click();
}

async function deleteProject(projectCode) {
  const row = await getProjectByCode(projectCode);
  if (!row?.id) return false;
  if (!window.confirm(`Delete financial project "${row.project_name}"?`)) return true;
  const { error } = await supabase.from("financial_projects").delete().eq("id", row.id);
  if (error) {
    window.alert(error.message || "Could not delete this record.");
    return true;
  }
  document.querySelector(".financial-refresh")?.click();
  return true;
}

function startFinancialMultiYearEditFix() {
  document.addEventListener(
    "click",
    async (event) => {
      const editButton = event.target.closest?.(".financial-edit");
      const deleteButton = event.target.closest?.(".financial-delete");
      if (!editButton && !deleteButton) return;

      const button = editButton || deleteButton;
      const projectCode = rowProjectCode(button);

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!projectCode) {
        window.alert("This old financial row has no project_code. Add a project_code first by re-importing it through the CSV template or creating a new record.");
        return;
      }

      try {
        if (deleteButton) {
          await deleteProject(projectCode);
          return;
        }
        const row = await getProjectByCode(projectCode);
        if (row?.id) openEditModal(row);
      } catch (error) {
        window.alert(error.message || "Could not open this financial project.");
      }
    },
    true,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFinancialMultiYearEditFix);
} else {
  startFinancialMultiYearEditFix();
}
