import { esc, fillArtworkHoles, recolorVehicleImage } from "../shared/utils.js";

export const DiaryScreen = {
  render(ctx, { memory, fromPlay }) {
    // ページ背景にはその絵本の表紙をぼかして敷く
    const cover = ctx.repo.assetUrl(ctx.repo.book(memory.bookId)?.cover);
    const entries = memory.entries.map((e) => {
      const colorFills = (e.colorFills ?? []).filter((fill) => memory.bookColorPhotos?.[fill.from]);
      const hasColorFills = colorFills.length > 0;
      // おはなしの挿絵は1枚の絵として見せる（キャプションなし）。
      // 挿絵に透明な部分（くるま・おうち）があるページは、おはなし画面と同じように
      // こどもの写真をうしろに敷く。敷かないと、そこだけ色のない絵のままになる。
      if (e.kind === "story") {
        return `
      <div class="diary-entry">
        <div class="diary-scene${hasColorFills ? " has-book-color" : ""}"${hasColorFills ? ` data-memory-color data-memory-source="${ctx.repo.assetUrl(e.image)}" data-memory-fills='${esc(JSON.stringify(colorFills))}'` : ""}>
          ${e.fillPhoto ? `<img class="fill" src="${e.fillPhoto}" alt="">` : ""}
          <img class="art" src="${ctx.repo.assetUrl(e.image)}" alt="">
          ${colorFills.map((_, i) => `<img class="book-color-art" data-memory-color-layer data-memory-fill-index="${i}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="">`).join("")}
        </div>
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
               <span class="no-photo-label"><span class="camera-icon" aria-hidden="true"></span> しゃしんなし</span>
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
        <button class="big-next" data-close>本棚にもどる</button>
      </div>`;
  },
  mount(ctx, params = {}, root) {
    const { view, memory } = params;
    root.querySelector("[data-close]").onclick = () => {
      if (view === "memories") {
        ctx.go("SELECT", { view: "memories" });
      } else {
        ctx.go("SELECT");
      }
    };
    root.querySelectorAll("[data-memory-color]").forEach(async (scene) => {
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
