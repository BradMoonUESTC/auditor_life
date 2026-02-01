import { $ } from "./dom.js?v=63";
import { escapeHtml } from "./utils.js?v=63";

export function openModal({ title, body, actions, wide = false }) {
  const modalEl = $("#modal");
  if (modalEl) modalEl.classList.toggle("modal--wide", Boolean(wide));
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
  modalEl?.classList.remove("is-hidden");
}

export function closeModal() {
  const modalEl = $("#modal");
  modalEl.classList.add("is-hidden");
  modalEl.classList.remove("modal--wide");
}

export function toast(text) {
  // 兼容旧签名：toast(text) 或 toast(state, text)
  let state = null;
  let msg = text;
  if (typeof text === "object" && text) {
    state = text;
    msg = arguments[1];
  }
  // 旧逻辑里“自动化期间不弹 toast”，这里保留兼容（如果未来还有 auto）
  if (state?.settings?.auto?.enabled) return;
  openModal({
    title: "提示",
    body: `<div>${escapeHtml(String(msg ?? ""))}</div>`,
    actions: [{ label: "知道了", kind: "primary", onClick: closeModal }],
  });
}

