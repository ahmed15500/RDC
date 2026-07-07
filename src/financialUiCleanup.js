import { supabase } from "./lib/supabaseClient";

const css = `
  body.external-financial-view main.workspace > *:not(.topbar):not(.financial-projects-page) {
    display: none !important;
  }

  body.external-financial-view .app-message,
  body.external-financial-view .role-notice,
  body.external-financial-view .modern-command-center {
    display: none !important;
  }

  body.external-financial-view .topbar {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start !important;
    gap: 12px !important;
    margin-bottom: 10px !important;
  }

  body.external-financial-view .topbar > div:first-child {
    min-width: 0;
  }

  body.external-financial-view .topbar h1 {
    margin-top: 4px;
    font-size: clamp(2rem, 7vw, 3.2rem) !important;
    line-height: 0.98 !important;
  }

  body.external-financial-view .topbar p {
    max-width: 760px;
    font-size: clamp(1rem, 3.8vw, 1.25rem);
    line-height: 1.45;
  }

  body.external-financial-view .top-actions {
    display: none !important;
  }

  body.external-financial-view .financial-projects-page {
    margin-top: 4px;
  }

  body.external-financial-view .financial-header-row {
    align-items: center;
    padding: 12px 0 6px;
    border-top: 1px solid rgba(36, 43, 120, 0.08);
  }

  body.external-financial-view .financial-title-block h2 {
    font-size: clamp(1.15rem, 3.8vw, 1.7rem);
  }

  body.external-financial-view .financial-title-block p {
    max-width: 720px;
    font-size: 0.92rem;
  }

  body.external-financial-view .financial-actions {
    align-items: center;
  }

  body.external-financial-view .financial-actions button {
    min-height: 38px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 0.84rem;
  }

  body.external-financial-view .financial-card {
    box-shadow: none !important;
  }

  body.external-financial-view .financial-utility-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
    margin: -2px 0 8px;
  }

  body.external-financial-view .financial-utility-bar button {
    border: 1px solid #e7eaee;
    border-radius: 999px;
    padding: 8px 12px;
    background: white;
    color: #26313d;
    font-size: 0.82rem;
    font-weight: 900;
  }

  @media (max-width: 760px) {
    body.external-financial-view .workspace {
      padding: 18px 16px !important;
    }

    body.external-financial-view .topbar {
      grid-template-columns: 1fr auto;
      margin-bottom: 6px !important;
    }

    body.external-financial-view .menu-toggle {
      margin-bottom: 8px;
      padding: 8px 12px;
    }

    body.external-financial-view .topbar h1 {
      font-size: clamp(2.15rem, 11vw, 3.15rem) !important;
      letter-spacing: -0.055em;
    }

    body.external-financial-view .topbar p {
      font-size: 1.05rem;
    }

    body.external-financial-view .financial-header-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 2px;
      padding-top: 10px;
    }

    body.external-financial-view .financial-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      justify-content: stretch;
      width: 100%;
    }

    body.external-financial-view .financial-dashboard-grid {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    body.external-financial-view .financial-card {
      min-height: auto !important;
      padding: 14px !important;
    }

    body.external-financial-view .financial-donut {
      width: min(190px, 62vw) !important;
    }

    body.external-financial-view .financial-money-card strong {
      font-size: clamp(1.8rem, 10vw, 2.6rem) !important;
      white-space: normal !important;
    }

    body.external-financial-view .financial-wide {
      min-height: auto !important;
    }

    body.external-financial-view .financial-utility-bar {
      justify-content: stretch;
    }

    body.external-financial-view .financial-utility-bar button {
      flex: 1;
    }
  }
`;

function installFinancialUiCleanupStyles() {
  if (document.getElementById("financial-ui-cleanup-style")) return;
  const style = document.createElement("style");
  style.id = "financial-ui-cleanup-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function ensureFinancialUtilityBar() {
  const page = document.querySelector(".financial-projects-page");
  if (!document.body.classList.contains("external-financial-view") || !page) return;
  if (page.querySelector(".financial-utility-bar")) return;

  const bar = document.createElement("div");
  bar.className = "financial-utility-bar";
  bar.innerHTML = `
    <button type="button" class="financial-utility-refresh">Refresh page</button>
    <button type="button" class="financial-utility-logout">Logout</button>
  `;
  page.prepend(bar);

  bar.querySelector(".financial-utility-refresh")?.addEventListener("click", () => {
    document.querySelector(".financial-refresh")?.click();
  });

  bar.querySelector(".financial-utility-logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  });
}

function startFinancialUiCleanup() {
  installFinancialUiCleanupStyles();
  ensureFinancialUtilityBar();

  const observer = new MutationObserver(() => ensureFinancialUtilityBar());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFinancialUiCleanup);
} else {
  startFinancialUiCleanup();
}
