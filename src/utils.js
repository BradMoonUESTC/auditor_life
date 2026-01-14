export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const rnd = (a, b) => Math.random() * (b - a) + a;
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr) => arr[ri(0, arr.length - 1)];

export const money = (n) => `¥${Math.round(n).toLocaleString("zh-CN")}`;

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

