function installRdcVillageMapCss(){
if(document.getElementById("rdc-village-map-css"))return;
const s=document.createElement("style");s.id="rdc-village-map-css";s.textContent=`
.rdc-village-map-section{padding:0!important;overflow:hidden}
.rdc-map-head,.rdc-map-dir-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.rdc-map-head{padding:20px 22px;border-bottom:1px solid #e8ebf0}
.rdc-map-head h2,.rdc-map-dir h3{margin:0 0 5px;color:#242b78}
.rdc-map-head p,.rdc-map-dir p,.rdc-map-note{margin:0;color:#64748b;line-height:1.55}
.rdc-map-open{border:0;border-radius:999px;padding:10px 14px;background:#242b78;color:#fff;font-weight:900;white-space:nowrap}
.rdc-map-layout{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(260px,.7fr)}
.rdc-map-canvas{padding:16px;background:linear-gradient(#ffffffd9,#ffffffd9),repeating-linear-gradient(0deg,transparent 0 47px,#242b7810 48px),repeating-linear-gradient(90deg,transparent 0 47px,#242b7810 48px),#dfe8dc}
.rdc-map-frame{overflow:hidden;border:1px solid #0f172a40;border-radius:18px;background:radial-gradient(circle at 18% 20%,#3e764c47,transparent 30%),linear-gradient(145deg,#d8e4d0,#f3e6c9 68%,#e8d5b3);box-shadow:0 16px 38px #0f172a20}
.rdc-map-frame svg{display:block;width:100%;aspect-ratio:1000/708}
.rdc-map-grid{fill:none;stroke:#334155;stroke-width:.8;opacity:.22}
.village-map-shape{stroke:#0f172a90;stroke-width:1.4;vector-effect:non-scaling-stroke;cursor:pointer;transition:.15s;transform-box:fill-box;transform-origin:center}
.village-map-shape:hover,.village-map-shape:focus,.village-map-shape.is-active{filter:drop-shadow(0 5px 7px #0f172a55);transform:scale(1.012);outline:none}
.reference-shape{stroke-dasharray:6 4}.canal-shape{pointer-events:none;opacity:.9;stroke:#2474c6;stroke-width:2}
.village-map-label{pointer-events:none;font-family:Inter,system-ui;font-weight:900;paint-order:stroke;stroke:#ffffff80;stroke-width:1.2px}
.rdc-map-north{font:950 18px Inter,system-ui;fill:#172033}.rdc-map-coords{font-family:Inter,system-ui;font-weight:800;fill:#172033}.rdc-map-frame svg g text{font-family:Inter,system-ui;font-weight:800}
.rdc-map-side{display:grid;align-content:start;gap:12px;padding:18px;border-left:1px solid #e8ebf0;background:#f8fafccc}
.rdc-map-side h3{margin:0;color:#242b78}.rdc-map-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rdc-map-fact,.rdc-map-note{padding:11px;border:1px solid #e2e6ec;border-radius:13px;background:#fff}
.rdc-map-fact strong{display:block;color:#242b78}.rdc-map-fact span{font-size:.74rem;color:#64748b;font-weight:800}
.rdc-map-refs{display:grid;gap:7px}.rdc-map-ref{display:flex;align-items:center;gap:8px;font-size:.8rem;font-weight:850;color:#334155}
.rdc-map-swatch{width:17px;height:17px;border:1px solid #0f172a33;border-radius:4px}
.rdc-map-dir{padding:18px 22px 22px;border-top:1px solid #e8ebf0}.rdc-map-dir-head{align-items:flex-end;margin-bottom:12px}
.rdc-map-search{width:min(300px,100%);padding:10px 12px;border:1px solid #d8dee8;border-radius:10px}
.rdc-map-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.rdc-map-card{position:relative;display:grid;gap:6px;padding:13px 13px 13px 17px;border:1px solid #e2e6ec;border-radius:14px;background:#fff;text-align:left;cursor:pointer;transition:.15s}
.rdc-map-card:before{content:"";position:absolute;inset:0 auto 0 0;width:6px;border-radius:14px 0 0 14px;background:var(--c)}
.rdc-map-card:hover,.rdc-map-card:focus,.rdc-map-card.is-active{transform:translateY(-2px);box-shadow:0 10px 26px #141e5418;outline:none}
.rdc-map-card strong{color:#242b78}.rdc-map-card small{color:#64748b;direction:rtl;text-align:left}
.rdc-map-state{width:fit-content;padding:4px 7px;border-radius:999px;background:#eef2f7;color:#475569;font-size:.68rem;font-weight:900}.rdc-map-state.has{background:#1496691f;color:#087454}
.rdc-map-dialog{width:min(1120px,95vw);max-height:92vh;border:0;border-radius:22px;padding:0;box-shadow:0 30px 90px #0f172a66}.rdc-map-dialog::backdrop{background:#0f172aa8;backdrop-filter:blur(4px)}
.rdc-map-dialog-head{display:flex;justify-content:space-between;align-items:center;padding:15px 18px;border-bottom:1px solid #e8ebf0}.rdc-map-dialog-head h2{margin:0;color:#242b78}.rdc-map-dialog-close{width:38px;height:38px;border:0;border-radius:50%;font-size:1.2rem;font-weight:900}.rdc-map-dialog-body{padding:16px}
@media(max-width:1000px){.rdc-map-layout{grid-template-columns:1fr}.rdc-map-side{border-left:0;border-top:1px solid #e8ebf0}.rdc-map-cards{grid-template-columns:repeat(3,1fr)}}
@media(max-width:720px){.rdc-map-head,.rdc-map-dir-head{display:grid}.rdc-map-open{width:100%}.rdc-map-cards{grid-template-columns:repeat(2,1fr)}.rdc-map-canvas,.rdc-map-side,.rdc-map-dir{padding:13px}}
@media(max-width:460px){.rdc-map-cards{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
installRdcVillageMapCss();