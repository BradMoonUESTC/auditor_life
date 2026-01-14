import { $ } from "./dom.js?v=33";
import { escapeHtml } from "./utils.js?v=33";
import { t } from "./i18n.js?v=33";

export function openModal({ title, body, actions }) {
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  const host = $("#modalActions");
  host.innerHTML = "";
  for (const a of actions || []) {
    const btn = document.createElement("button");
    btn.className = `btn ${a.kind === "primary" ? "btn--primary" : ""}`;
    btn.textContent = a.label;
    btn.addEventListener("click", () => a.onClick?.());
    host.appendChild(btn);
  }
  $("#modal").classList.remove("is-hidden");
}

export function closeModal() {
  $("#modal").classList.add("is-hidden");
}

export function toast(text) {
  // 兼容旧签名：toast(text) 或 toast(state, text)
  let state = null;
  let msg = text;
  if (typeof text === "object" && text) {
    state = text;
    msg = arguments[1];
  }
  // 自动化期间不弹 toast，避免打断流程/抢焦点
  if (state?.settings?.auto?.enabled) return;
  openModal({
    title: t(state, "modal.toast.title"),
    body: `<div>${escapeHtml(String(msg ?? ""))}</div>`,
    actions: [{ label: t(state, "modal.toast.ok"), kind: "primary", onClick: closeModal }],
  });
}

