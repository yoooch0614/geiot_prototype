import { esc, fillArtworkHoles, recolorVehicleImage } from "../shared/utils.js";
import { avatarBuddy } from "../shared/avatars.js";
import { localizeText } from "../shared/i18n.js";

export const DiaryScreen = {
  render(ctx, { memory, fromPlay }) {
    // ページ背景にはその絵本の表紙をぼかして敷く
    const cover = ctx.repo.assetUrl(ctx.repo.book(memory.bookId)?.cover);
    const bookmarkButton = (entryIndex, label) => {
      const bookmarked = ctx.session.isMemoryBookmarked(memory.id, entryIndex);
      return `<button type="button" class="memory-bookmark${bookmarked ? " is-active" : ""}"
        data-bookmark-memory data-entry-index="${entryIndex}" aria-pressed="${bookmarked}"
        aria-label="${bookmarked ? "お気に入りをはずす" : `${esc(label)}をお気に入りに追加`}"
        title="${bookmarked ? "お気に入りをはずす" : "お気に入りに追加"}">${bookmarked ? "★" : "☆"}</button>`;
    };
    const photoChoice = (photoUrl, blankUrl) => `
      <div class="photo-choice" data-photo-choice>
        <div class="photo-scene">
          <img data-photo-filled src="${photoUrl}" alt="しゃしんを はった えほん">
          <img data-photo-blank src="${blankUrl}" alt="いろを つけるまえの えほん" hidden>
        </div>
        <label class="photo-choice-switch">
          <span class="photo-choice-side">写真を はる</span>
          <input type="checkbox" data-photo-blank-toggle aria-label="白いままにする">
          <span class="photo-choice-slider" aria-hidden="true"></span>
          <span class="photo-choice-side">白いまま</span>
        </label>
        <p class="photo-choice-hint" data-photo-choice-hint>写真を はった じょうたい</p>
      </div>`;
    const entries = memory.entries.map((e, entryIndex) => {
      const colorFills = (e.colorFills ?? []).filter((fill) => memory.bookColorPhotos?.[fill.from]);
      const hasColorFills = colorFills.length > 0;
      // おはなしの挿絵は1枚の絵として見せる（キャプションなし）。
      // 挿絵に透明な部分（くるま・おうち）があるページは、おはなし画面と同じように
      // こどもの写真をうしろに敷く。敷かないと、そこだけ色のない絵のままになる。
      if (e.kind === "story") {
        return `
      <div class="diary-entry">
        ${bookmarkButton(entryIndex, "挿絵")}
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
        ${bookmarkButton(entryIndex, "写真")}
        ${e.photoUrl
          ? photoChoice(e.photoUrl, fallback)
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
          ${memory.reader?.animal ? `
          <div class="diary-reader">
            ${avatarBuddy({ ...memory.reader, name: null })}
            <span class="diary-reader-text">${memory.reader.name ? `${esc(memory.reader.name)}が よんだよ` : "いっしょに よんだよ"}</span>
          </div>` : ""}
        </div>
        ${entries}
        <button class="big-next" data-close>本棚にもどる</button>
      </div>`;
  },
  mount(ctx, params = {}, root) {
    const { view, memory, fromBookmarks } = params;
    root.querySelector("[data-close]").onclick = () => {
      if (fromBookmarks) {
        ctx.go("BOOKMARKS");
      } else if (view === "memories") {
        ctx.go("SELECT", { view: "memories" });
      } else {
        ctx.go("SELECT");
      }
    };
    root.querySelectorAll("[data-bookmark-memory]").forEach((button) => {
      const entryIndex = Number(button.dataset.entryIndex);
      const entry = memory.entries[entryIndex];
      const label = entry?.kind === "story" ? "挿絵" : "写真";
      const sync = () => {
        const active = ctx.session.isMemoryBookmarked(memory.id, entryIndex);
        button.classList.toggle("is-active", active);
        button.textContent = active ? "★" : "☆";
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", localizeText(active ? "お気に入りをはずす" : `${label}をお気に入りに追加`));
      };
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        ctx.session.toggleMemoryBookmark({
          memoryId: memory.id,
          bookTitle: memory.bookTitle,
          entryIndex,
          label,
        });
        sync();
      };
    });
    root.querySelectorAll("[data-photo-choice]").forEach((choice) => {
      const toggle = choice.querySelector("[data-photo-blank-toggle]");
      const filled = choice.querySelector("[data-photo-filled]");
      const blank = choice.querySelector("[data-photo-blank]");
      const hint = choice.querySelector("[data-photo-choice-hint]");
      const sync = () => {
        const showBlank = toggle.checked;
        filled.hidden = showBlank;
        blank.hidden = !showBlank;
        hint.textContent = showBlank
          ? "いろを つけるまえの、白いままの えほん"
          : "写真を はった じょうたい";
      };
      toggle.addEventListener("change", sync);
    });
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
