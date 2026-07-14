import { supabase } from "./lib/supabaseClient";

const ADMIN_EMAIL = "ahmed.bahrawy@hu.edu.eg";
const TABLE = "village_map_edits";
const DEFAULT_EDIT = Object.freeze({ translateX: 0, translateY: 0, scale: 1 });

const state = {
  edits: new Map(),
  user: null,
  isAdmin: false,
  selectedVillage: "",
  draft: { ...DEFAULT_EDIT },
  history: [],
  modal: null,
  statusTimer: null,
};

function mapData() {
  return window.RDCVillageMapData || null;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/el\s*-/g, "el")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function cleanEdit(edit = {}) {
  return {
    translateX: clamp(edit.translateX ?? edit.translate_x, -250, 250),
    translateY: clamp(edit.translateY ?? edit.translate_y, -250, 250),
    scale: clamp(edit.scale ?? 1, 0.5, 2),
  };
}

function villageNames() {
  return (mapData()?.villages || []).map((village) => village.name);
}

function findLabel(svg, villageName) {
  const key = normalize(villageName);
  return [...svg.querySelectorAll("text.village-map-label")].find((label) => {
    const text = normalize(label.textContent);
    return text === key || text.includes(key) || key.includes(text);
  }) || null;
}

function applyEditToSvg(svg, villageName, edit) {
  const polygon = [...svg.querySelectorAll(".village-map-shape[data-village]")]
    .find((shape) => shape.dataset.village === villageName);
  if (!polygon) return;

  const next = cleanEdit(edit);
  polygon.style.transformBox = "fill-box";
  polygon.style.transformOrigin = "center";
  polygon.style.transform = `translate(${next.translateX}px, ${next.translateY}px) scale(${next.scale})`;
  polygon.dataset.mapEditApplied = "true";

  const label = findLabel(svg, villageName);
  if (label) {
    label.style.transformBox = "fill-box";
    label.style.transformOrigin = "center";
    label.style.transform = `translate(${next.translateX}px, ${next.translateY}px)`;
    label.dataset.mapEditApplied = "true";
  }
}

function applyAllEdits(root = document) {
  const data = mapData();
  if (!data) return;
  root.querySelectorAll?.(".rdc-map-frame svg").forEach((svg) => {
    data.villages.forEach((village) => {
      applyEditToSvg(svg, village.name, state.edits.get(village.name) || DEFAULT_EDIT);
    });
  });
}

function installStyles() {
  if (document.getElementById("village-map-editor-style")) return;
  const style = document.createElement("style");
  style.id = "village-map-editor-style";
  style.textContent = `
    .rdc-map-head-actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
    .rdc-map-edit-button { border:1px solid rgba(36,43,120,.16); border-radius:999px; padding:10px 14px; background:#fff; color:#242b78; font-weight:900; white-space:nowrap; cursor:pointer; }
    .rdc-map-edit-button:hover { background:#eef2ff; }
    .vme-backdrop { position:fixed; inset:0; z-index:100000; display:grid; place-items:center; padding:18px; background:rgba(15,23,42,.66); backdrop-filter:blur(5px); }
    .vme-modal { width:min(1280px,98vw); max-height:94vh; overflow:auto; border-radius:24px; background:#fff; box-shadow:0 35px 100px rgba(15,23,42,.4); }
    .vme-header { position:sticky; top:0; z-index:5; display:flex; justify-content:space-between; gap:18px; align-items:flex-start; padding:18px 20px; border-bottom:1px solid #e5e8ed; background:rgba(255,255,255,.97); backdrop-filter:blur(10px); }
    .vme-header h2 { margin:0 0 5px; color:#242b78; font-size:1.45rem; }
    .vme-header p { margin:0; color:#64748b; line-height:1.5; }
    .vme-close { width:40px; height:40px; border:0; border-radius:50%; background:#eef2f7; color:#242b78; font-size:1.25rem; font-weight:900; cursor:pointer; }
    .vme-layout { display:grid; grid-template-columns:minmax(0,1.75fr) minmax(300px,.75fr); }
    .vme-preview-wrap { min-width:0; padding:18px; background:#f5f7fb; }
    .vme-preview { position:sticky; top:88px; }
    .vme-preview .rdc-map-frame { border-radius:18px; }
    .vme-preview .village-map-shape[data-village] { cursor:pointer; }
    .vme-preview .village-map-shape.vme-selected { filter:drop-shadow(0 0 8px #e6007e); stroke:#e6007e; stroke-width:4; }
    .vme-controls { display:grid; align-content:start; gap:14px; padding:18px; border-left:1px solid #e5e8ed; }
    .vme-section { display:grid; gap:10px; padding:14px; border:1px solid #e5e8ed; border-radius:16px; background:#fbfcfe; }
    .vme-section h3 { margin:0; color:#242b78; font-size:1rem; }
    .vme-field { display:grid; gap:6px; color:#475569; font-size:.82rem; font-weight:850; }
    .vme-field input,.vme-field select { width:100%; padding:10px 11px; border:1px solid #d8dee8; border-radius:10px; background:#fff; color:#172033; font:inherit; }
    .vme-range-row { display:grid; grid-template-columns:1fr 86px; gap:8px; align-items:center; }
    .vme-range-row input[type=range] { padding:0; }
    .vme-nudge-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
    .vme-nudge-grid button,.vme-actions button { border:0; border-radius:10px; padding:10px; font-weight:900; cursor:pointer; }
    .vme-nudge-grid button { background:#eef2f7; color:#242b78; }
    .vme-nudge-grid .blank { visibility:hidden; }
    .vme-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .vme-primary { background:linear-gradient(90deg,#e6007e,#ff8500); color:#fff; }
    .vme-secondary { background:#eef2f7; color:#242b78; }
    .vme-danger { grid-column:1/-1; background:#fff0f3; color:#b4233f; }
    .vme-note { padding:11px 12px; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b; background:#fff; font-size:.8rem; line-height:1.55; }
    .vme-status { min-height:22px; color:#087454; font-size:.82rem; font-weight:850; }
    body.village-map-editing .rdc-village-map-section .village-map-shape[data-village] { cursor:crosshair; }
    @media(max-width:900px){.vme-layout{grid-template-columns:1fr}.vme-controls{border-left:0;border-top:1px solid #e5e8ed}.vme-preview{position:static}.rdc-map-head-actions{width:100%;justify-content:stretch}.rdc-map-head-actions button{flex:1}}
    @media(max-width:540px){.vme-backdrop{padding:7px}.vme-modal{border-radius:16px}.vme-actions{grid-template-columns:1fr}.vme-danger{grid-column:auto}}
  `;
  document.head.appendChild(style);
}

async function loadIdentity() {
  const { data } = await supabase.auth.getSession();
  state.user = data?.session?.user || null;
  if (!state.user) return;
  if (String(state.user.email || "").toLowerCase() === ADMIN_EMAIL) {
    state.isAdmin = true;
    return;
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", state.user.id).maybeSingle();
  state.isAdmin = String(profile?.role || "").toLowerCase() === "admin";
}

async function loadEdits() {
  const { data, error } = await supabase.from(TABLE).select("village_name, translate_x, translate_y, scale");
  if (error) {
    console.warn("Village map edits could not be loaded", error);
    return;
  }
  state.edits = new Map((data || []).map((row) => [row.village_name, cleanEdit(row)]));
  applyAllEdits();
  if (state.modal) renderEditorPreview();
}

function makeHeaderActions() {
  const header = document.querySelector(".rdc-village-map-section .rdc-map-head");
  if (!header) return;
  let actions = header.querySelector(".rdc-map-head-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.className = "rdc-map-head-actions";
    const open = header.querySelector(".rdc-map-open");
    if (open) actions.appendChild(open);
    header.appendChild(actions);
  }
  if (!state.isAdmin || actions.querySelector(".rdc-map-edit-button")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rdc-map-edit-button";
  button.textContent = "Edit Village Map";
  button.addEventListener("click", openEditor);
  actions.appendChild(button);
}

function setStatus(message, isError = false) {
  const target = state.modal?.querySelector(".vme-status");
  if (!target) return;
  target.textContent = message;
  target.style.color = isError ? "#b4233f" : "#087454";
  window.clearTimeout(state.statusTimer);
  state.statusTimer = window.setTimeout(() => { if (target.textContent === message) target.textContent = ""; }, 4000);
}

function selectedVillageMeta() {
  return mapData()?.villages?.find((village) => village.name === state.selectedVillage) || null;
}

function setDraft(next, { remember = true } = {}) {
  if (remember) state.history.push({ ...state.draft });
  state.draft = cleanEdit(next);
  syncControls();
  renderEditorPreview();
}

function selectVillage(name) {
  if (!villageNames().includes(name)) return;
  state.selectedVillage = name;
  state.draft = { ...(state.edits.get(name) || DEFAULT_EDIT) };
  state.history = [];
  syncControls();
  renderEditorPreview();
}

function syncControls() {
  if (!state.modal) return;
  const select = state.modal.querySelector("[name=village]");
  if (select) select.value = state.selectedVillage;
  const values = {
    translateX: state.draft.translateX,
    translateY: state.draft.translateY,
    scaleRange: state.draft.scale,
    scaleNumber: state.draft.scale,
  };
  Object.entries(values).forEach(([name, value]) => {
    const input = state.modal.querySelector(`[name=${name}]`);
    if (input) input.value = String(value);
  });
  const meta = selectedVillageMeta();
  const label = state.modal.querySelector(".vme-selected-label");
  if (label && meta) label.textContent = `${meta.name} — ${meta.arabic}`;
}

function renderEditorPreview() {
  if (!state.modal || !mapData()) return;
  const preview = state.modal.querySelector(".vme-preview");
  if (!preview) return;
  preview.innerHTML = mapData().svg();
  applyAllEdits(preview);
  applyEditToSvg(preview.querySelector("svg"), state.selectedVillage, state.draft);
  preview.querySelectorAll(".village-map-shape[data-village]").forEach((shape) => {
    const official = villageNames().includes(shape.dataset.village);
    if (!official) return;
    shape.classList.toggle("vme-selected", shape.dataset.village === state.selectedVillage);
    shape.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectVillage(shape.dataset.village);
    });
  });
}

function editorMarkup() {
  const data = mapData();
  return `
    <article class="vme-modal" role="dialog" aria-modal="true" aria-label="Edit Village Map">
      <header class="vme-header">
        <div><h2>Edit Village Map</h2><p>Adjust a village's displayed size and position. Click a polygon or choose a village from the list.</p></div>
        <button type="button" class="vme-close" aria-label="Close">×</button>
      </header>
      <div class="vme-layout">
        <div class="vme-preview-wrap"><div class="vme-preview"></div></div>
        <aside class="vme-controls">
          <section class="vme-section">
            <h3>Village</h3>
            <label class="vme-field">Choose village<select name="village">${data.villages.map((village) => `<option value="${escapeHtml(village.name)}">${escapeHtml(village.name)} — ${escapeHtml(village.arabic)}</option>`).join("")}</select></label>
            <strong class="vme-selected-label"></strong>
          </section>
          <section class="vme-section">
            <h3>Size</h3>
            <label class="vme-field">Scale<div class="vme-range-row"><input name="scaleRange" type="range" min="0.5" max="2" step="0.01"><input name="scaleNumber" type="number" min="0.5" max="2" step="0.01"></div></label>
            <div class="vme-actions"><button type="button" class="vme-secondary" data-size="-0.05">Smaller</button><button type="button" class="vme-secondary" data-size="0.05">Larger</button></div>
          </section>
          <section class="vme-section">
            <h3>Position</h3>
            <div class="vme-nudge-grid"><span class="blank"></span><button type="button" data-move="0,-5">↑</button><span class="blank"></span><button type="button" data-move="-5,0">←</button><button type="button" data-move="0,5">↓</button><button type="button" data-move="5,0">→</button></div>
            <label class="vme-field">Horizontal position<input name="translateX" type="number" min="-250" max="250" step="1"></label>
            <label class="vme-field">Vertical position<input name="translateY" type="number" min="-250" max="250" step="1"></label>
          </section>
          <section class="vme-section">
            <div class="vme-actions">
              <button type="button" class="vme-secondary" data-action="undo">Undo</button>
              <button type="button" class="vme-secondary" data-action="reset-draft">Reset preview</button>
              <button type="button" class="vme-primary" data-action="save">Save changes</button>
              <button type="button" class="vme-secondary" data-action="close">Close</button>
              <button type="button" class="vme-danger" data-action="restore-source">Restore source shape</button>
            </div>
            <div class="vme-status" role="status"></div>
          </section>
          <div class="vme-note"><strong>Important:</strong> this editor changes the visual display only. It does not change official cadastral or legal boundaries. Scaling a village may overlap nearby areas, so review the full map before saving.</div>
        </aside>
      </div>
    </article>`;
}

function bindEditor() {
  const modal = state.modal;
  modal.querySelector(".vme-close").addEventListener("click", closeEditor);
  modal.addEventListener("click", (event) => { if (event.target === modal) closeEditor(); });
  modal.querySelector("[name=village]").addEventListener("change", (event) => selectVillage(event.target.value));

  const updateFromInputs = () => setDraft({
    translateX: modal.querySelector("[name=translateX]").value,
    translateY: modal.querySelector("[name=translateY]").value,
    scale: modal.querySelector("[name=scaleNumber]").value,
  });

  modal.querySelector("[name=translateX]").addEventListener("change", updateFromInputs);
  modal.querySelector("[name=translateY]").addEventListener("change", updateFromInputs);
  modal.querySelector("[name=scaleNumber]").addEventListener("change", updateFromInputs);
  modal.querySelector("[name=scaleRange]").addEventListener("input", (event) => {
    setDraft({ ...state.draft, scale: event.target.value });
  });

  modal.querySelectorAll("[data-size]").forEach((button) => button.addEventListener("click", () => {
    setDraft({ ...state.draft, scale: state.draft.scale + Number(button.dataset.size) });
  }));
  modal.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => {
    const [x, y] = button.dataset.move.split(",").map(Number);
    setDraft({ ...state.draft, translateX: state.draft.translateX + x, translateY: state.draft.translateY + y });
  }));

  modal.querySelector("[data-action=undo]").addEventListener("click", () => {
    const previous = state.history.pop();
    if (!previous) return setStatus("Nothing to undo.", true);
    state.draft = cleanEdit(previous);
    syncControls();
    renderEditorPreview();
  });
  modal.querySelector("[data-action=reset-draft]").addEventListener("click", () => setDraft(DEFAULT_EDIT));
  modal.querySelector("[data-action=save]").addEventListener("click", saveCurrentEdit);
  modal.querySelector("[data-action=restore-source]").addEventListener("click", restoreSourceShape);
  modal.querySelector("[data-action=close]").addEventListener("click", closeEditor);
}

function openEditor() {
  if (!state.isAdmin || !mapData()) return;
  document.querySelector(".vme-backdrop")?.remove();
  const backdrop = document.createElement("div");
  backdrop.className = "vme-backdrop";
  backdrop.innerHTML = editorMarkup();
  document.body.appendChild(backdrop);
  document.body.classList.add("village-map-editing");
  document.body.style.overflow = "hidden";
  state.modal = backdrop;
  bindEditor();
  selectVillage(state.selectedVillage || villageNames()[0]);
}

function closeEditor() {
  state.modal?.remove();
  state.modal = null;
  document.body.classList.remove("village-map-editing");
  document.body.style.overflow = "";
  state.history = [];
}

async function saveCurrentEdit() {
  if (!state.isAdmin || !state.user || !state.selectedVillage) return;
  const payload = {
    village_name: state.selectedVillage,
    translate_x: state.draft.translateX,
    translate_y: state.draft.translateY,
    scale: state.draft.scale,
    updated_by: state.user.id,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "village_name" });
  if (error) return setStatus(error.message || "Could not save the map change.", true);
  state.edits.set(state.selectedVillage, { ...state.draft });
  state.history = [];
  applyAllEdits();
  renderEditorPreview();
  setStatus(`Saved ${state.selectedVillage}. All users will see the new map.`);
}

async function restoreSourceShape() {
  if (!state.isAdmin || !state.selectedVillage) return;
  const confirmed = window.confirm(`Restore ${state.selectedVillage} to the original uploaded-map shape and position?`);
  if (!confirmed) return;
  const { error } = await supabase.from(TABLE).delete().eq("village_name", state.selectedVillage);
  if (error) return setStatus(error.message || "Could not restore the source shape.", true);
  state.edits.delete(state.selectedVillage);
  state.draft = { ...DEFAULT_EDIT };
  state.history = [];
  syncControls();
  applyAllEdits();
  renderEditorPreview();
  setStatus(`${state.selectedVillage} was restored to the source map.`);
}

function interceptMapClickWhileEditing(event) {
  if (!state.modal) return;
  const shape = event.target.closest?.(".rdc-village-map-section .village-map-shape[data-village]");
  if (!shape || !villageNames().includes(shape.dataset.village)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  selectVillage(shape.dataset.village);
}

function observePage() {
  let timer;
  const refresh = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      makeHeaderActions();
      applyAllEdits();
    }, 100);
  };
  new MutationObserver(refresh).observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  refresh();
}

async function start() {
  installStyles();
  await loadIdentity();
  await loadEdits();
  observePage();
  document.addEventListener("click", interceptMapClickWhileEditing, true);
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && state.modal) closeEditor(); });

  supabase.channel("village-map-edits-live")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => loadEdits())
    .subscribe();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
