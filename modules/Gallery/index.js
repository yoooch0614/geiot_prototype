import { esc, fillArtworkHoles, recolorVehicleImage } from "../shared/utils.js";

export const GalleryScreen = {
  render(ctx) {
    const list = ctx.session.memories;
    const cards = list.length
      ? list.map((m) => {
          // 挿絵もしゃしんも、その回の絵を全部ならべる（1枚だけなら大きく見せる）
          const photos = m.entries
            .map((e) => e.kind === "story"
              ? { entry: e }
              : { src: e.photoUrl || ctx.repo.assetUrl(e.missionImage) })
            .filter((p) => p.entry?.image || p.src);
          const photoGrid = photos.length
            ? `<div class="memory-photos">${photos
                .map((p) => p.entry
                  ? `<span class="memory-photo memory-story-scene"${p.entry.colorFills?.length ? ` data-memory-color data-memory-source="${ctx.repo.assetUrl(p.entry.image)}" data-memory-fills='${esc(JSON.stringify(p.entry.colorFills))}'` : ""}>
                      ${p.entry.fillPhoto ? `<img class="fill" src="${p.entry.fillPhoto}" alt="">` : ""}
                      <img class="art" src="${ctx.repo.assetUrl(p.entry.image)}" alt="">
                      ${(p.entry.colorFills || []).map((_, i) => `<img class="book-color-art" data-memory-color-layer data-memory-fill-index="${i}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="">`).join("")}
                    </span>`
                  : `<span class="memory-photo"><img src="${p.src}" alt=""></span>`)
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
    root.querySelectorAll("[data-memory-color]").forEach(async (scene) => {
      const memoryId = scene.closest("[data-mem]")?.dataset.mem;
      const memory = ctx.session.memories.find((item) => item.id === memoryId);
      const fills = JSON.parse(scene.dataset.memoryFills || "[]");
      scene.querySelectorAll("[data-memory-color-layer]").forEach(async (layer) => {
        const fill = fills[Number(layer.dataset.memoryFillIndex)];
        const photo = memory?.bookColorPhotos?.[fill?.from];
        const filled = fill?.tone === "dark"
          ? await recolorVehicleImage(scene.dataset.memorySource, memory?.bookColorValues?.[fill?.from] || null, fill.region, "dark")
          : await fillArtworkHoles(scene.dataset.memorySource, photo, memory?.bookColorScales?.[fill?.from] || 1, fill?.region);
        if (filled) { layer.src = filled; layer.style.opacity = "1"; } else layer.remove();
      });
    });
  },
};
