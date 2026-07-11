import { esc } from "../shared/utils.js";

export const DiaryScreen = {
  render(ctx, { memory, fromPlay }) {
    // ページ背景にはその絵本の表紙をぼかして敷く
    const cover = ctx.repo.assetUrl(ctx.repo.book(memory.bookId)?.cover);
    const entries = memory.entries.map((e) => {
      // おはなしの挿絵はそのまま1枚の絵として見せる（キャプションなし）
      if (e.kind === "story") {
        return `
      <div class="diary-entry">
        <img src="${ctx.repo.assetUrl(e.image)}" alt="">
      </div>`;
      }
      // 写真がないときは、そのミッションの挿絵（撮影画面に出ていた絵）を代わりに見せる
      const fallback = ctx.repo.assetUrl(e.missionImage) || cover;
      return `
      <div class="diary-entry">
        ${e.photoUrl
          ? `<div class="photo-scene">
               <img src="${e.photoUrl}" alt="">
             </div>`
          : `<div class="no-photo"${fallback ? ` style="background-image:url('${fallback}')"` : ""}>
               <span class="no-photo-label">📷 しゃしんなし</span>
             </div>`}
        <p class="diary-caption">${esc(e.caption)}</p>
      </div>`;
    }).join("") || `<p class="empty">きろくが ありません</p>`;
    return `
      <div class="screen diary">
        ${cover ? `<div class="diary-bg" aria-hidden="true" style="background-image:url('${cover}')"></div>` : ""}
        <div class="diary-cover">
          <span class="diary-date">${esc(memory.date)}</span>
          <h2>${esc(memory.bookTitle)} の きろく</h2>
        </div>
        ${entries}
        <button class="big-next" data-close>${fromPlay ? "とじる" : "‹ もどる"}</button>
      </div>`;
  },
  mount(ctx, { fromPlay }, root) {
    root.querySelector("[data-close]").onclick = () => ctx.go("GALLERY");
  },
};
