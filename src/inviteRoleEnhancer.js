const inviteRoleOptions = [
  ["viewer", "Full Viewer — can view all dashboards"],
  ["stakeholder", "Full Stakeholder — can add activity data and view all dashboards"],
  ["financial", "Financial Viewer — financial tab only"],
  ["financial_stakeholder", "Financial Stakeholder — financial tab only + add/edit financial data"],
];

function installInviteRoleStyles() {
  if (document.getElementById("invite-role-enhancer-style")) return;
  const style = document.createElement("style");
  style.id = "invite-role-enhancer-style";
  style.textContent = `
    .invite-role-field {
      min-width: 220px;
    }

    .invite-role-help {
      display: block;
      margin-top: 5px;
      color: var(--muted, #6a7188);
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.35;
    }

    @media (max-width: 1100px) {
      .invite-role-field {
        grid-column: span 2;
      }
    }

    @media (max-width: 720px) {
      .invite-role-field {
        grid-column: span 1;
      }
    }
  `;
  document.head.appendChild(style);
}

function addInviteRoleSelector() {
  const form = document.querySelector("form.invite-form");
  if (!form || form.querySelector(".invite-role-field")) return;

  const submitButton = form.querySelector("button[type='submit'], button.primary");
  const label = document.createElement("label");
  label.className = "invite-role-field";
  label.innerHTML = `
    Access level
    <select class="invite-role-select" aria-label="Invited user access level">
      ${inviteRoleOptions.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}
    </select>
    <small class="invite-role-help">Choose what this person can see and edit before sending the invitation.</small>
  `;

  if (submitButton) {
    form.insertBefore(label, submitButton);
  } else {
    form.appendChild(label);
  }
}

function selectedInviteRole() {
  return document.querySelector(".invite-role-select")?.value || "viewer";
}

function patchInviteFunctionPayload() {
  if (window.__inviteRoleFetchPatchInstalled) return;
  window.__inviteRoleFetchPatchInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (resource, init = {}) => {
    const url = typeof resource === "string" ? resource : resource?.url || "";
    const isInviteFunction = url.includes("/functions/v1/invite-user");

    if (isInviteFunction && init?.body) {
      try {
        const payload = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        if (payload && typeof payload === "object") {
          payload.role = payload.role || selectedInviteRole();
          init = {
            ...init,
            body: JSON.stringify(payload),
          };
        }
      } catch {
        // Leave the original request unchanged if the body is not JSON.
      }
    }

    return originalFetch(resource, init);
  };
}

function startInviteRoleEnhancer() {
  installInviteRoleStyles();
  addInviteRoleSelector();
  patchInviteFunctionPayload();

  const observer = new MutationObserver(() => addInviteRoleSelector());
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startInviteRoleEnhancer);
} else {
  startInviteRoleEnhancer();
}
