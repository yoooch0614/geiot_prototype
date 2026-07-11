import { esc } from "../shared/utils.js";

export const GalleryScreen = {
  render(ctx) {
    const list = ctx.session.memories;
    const cards = list.length
      ? list.map((m) => {
          const cover = m.entries.find((e) => e.photoUrl)?.photoUrl;
          return `
            <button class="memory-card" data-mem="${m.id}">
              ${cover ? `<img src="${cover}" alt="">` : `<div class="no-photo">🌟</div>`}
              <span class="book-title">${esc(m.bookTitle)}</span>
              <span class="book-age">${esc(m.date)}</span>
            </button>`;
        }).join("")
      : `<p class="empty">まだ おもいでが ありません。<br>えほんを よんで つくろう！</p>`;
    return `
      <div class="screen">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title">おもいで</h2>
        <div class="book-grid">${cards}</div>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
    root.querySelectorAll("[data-mem]").forEach((b) => {
      b.onclick = () => {
        const memory = ctx.session.memories.find((m) => m.id === b.dataset.mem);
        if (memory) ctx.go("DIARY", { memory, fromPlay: false });
      };
    });
  },
};
