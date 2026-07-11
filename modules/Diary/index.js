import { esc } from "../shared/utils.js";

export const DiaryScreen = {
  render(_ctx, { memory, fromPlay }) {
    const entries = memory.entries.map((e) => `
      <div class="diary-entry">
        ${e.photoUrl
          ? `<img src="${e.photoUrl}" alt="">`
          : `<div class="no-photo">📷 しゃしんなし</div>`}
        <p class="diary-caption">${esc(e.caption)}</p>
      </div>`).join("") || `<p class="empty">きろくが ありません</p>`;
    return `
      <div class="screen diary">
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
