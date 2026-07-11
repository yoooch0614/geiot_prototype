export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
);

export function playAudio(url) {
  if (!url) return;
  new Audio(url).play().catch(() => {});
}

// 読み聞かせ系の画面（おはなし・ミッション・撮影プレビュー・達成・完了）を
// 横向きタブレット基準（4:3）の「ステージ」に収め、はみ出す分は上下/左右に帯を入れる。
export const stage = (html) => `
  <div class="stage-outer">
    <div class="stage">${html}</div>
  </div>`;

// 背景写真（.scene の1枚目）の上に、gifキャラクターを重ねて表示する<img>を作る。
export const characterLayer = (url) =>
  url ? `<img class="character" src="${url}" alt="" onerror="this.remove()">` : "";
