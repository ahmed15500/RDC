const ARABIC_LABELS = new Set([
  "arabic",
  "العربية",
  "عربي",
  "العربي",
  "switch to arabic",
  "change to arabic",
]);

const LANGUAGE_HINTS = ["language", "lang", "locale", "translation", "arabic"];

function normalized(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function controlMetadata(element) {
  return normalized([
    element.id,
    element.className,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("name"),
    element.getAttribute("data-language"),
    element.getAttribute("data-lang"),
    element.getAttribute("data-locale"),
  ].filter(Boolean).join(" "));
}

function isArabicLanguageControl(element) {
  if (!(element instanceof HTMLElement)) return false;

  const text = normalized(element.textContent);
  const metadata = controlMetadata(element);
  const hasLanguageHint = LANGUAGE_HINTS.some((hint) => metadata.includes(hint));

  if (ARABIC_LABELS.has(text)) return true;
  if (metadata.includes("arabic")) return true;
  if (hasLanguageHint && ["ar", "ع", "en / ar", "ar / en", "english / arabic", "arabic / english"].includes(text)) return true;

  return false;
}

function enforceEnglishDocument() {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body?.setAttribute("dir", "ltr");
}

function removeArabicLanguageControls(root = document) {
  const selectors = [
    "button",
    "a",
    "[role='button']",
    "select",
    ".language-toggle",
    ".language-switcher",
    ".lang-toggle",
    ".lang-switcher",
    ".locale-toggle",
    ".locale-switcher",
  ].join(",");

  root.querySelectorAll?.(selectors).forEach((element) => {
    if (isArabicLanguageControl(element)) element.remove();
  });
}

function applyEnglishOnlyMode() {
  enforceEnglishDocument();
  removeArabicLanguageControls();
}

function startEnglishOnlyMode() {
  applyEnglishOnlyMode();

  const observer = new MutationObserver(() => applyEnglishOnlyMode());
  observer.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startEnglishOnlyMode);
} else {
  startEnglishOnlyMode();
}
