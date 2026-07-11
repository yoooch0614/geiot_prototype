export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
);

export function playAudio(url) {
  if (!url) return;
  new Audio(url).play().catch(() => {});
}
