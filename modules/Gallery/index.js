import { esc } from "../shared/utils.js";

export const GalleryScreen = {
  render(ctx) {
    const list = ctx.session.memories;
    const cards = list.length
      ? list.map((m) => {
          // 挿絵もしゃしんも、その回の絵を全部ならべる（1枚だけなら大きく見せる）
          const photos = m.entries
            .map((e) => e.kind === "story"
              ? { src: ctx.repo.assetUrl(e.image) }
              : { src: e.photoUrl || ctx.repo.assetUrl(e.missionImage) })
            .filter((p) => p.src);
          const photoGrid = photos.length
            ? `<div class="memory-photos">${photos
                .map((p) => `
                  <span class="memory-photo">
                    <img src="${p.src}" alt="">
                  </span>`)
                .join("")}</div>`
            : `<div class="no-photo"><span class="no-photo-icon" aria-hidden="true"></span></div>`;
          return `
            <button class="memory-card" data-mem="${m.id}">
              ${photoGrid}
              <span class="book-title">${esc(m.bookTitle)}</span>
              <span class="book-age">${esc(m.date)}</span>
            </button>`;
        }).join("")
      : `<p class="empty">まだ おもいでが ありません。<br>えほんを よんで つくろう！</p>`;
    return `
      <div class="screen">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title">おもいで</h2>
        <div class="memory-list">${cards}</div>
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
