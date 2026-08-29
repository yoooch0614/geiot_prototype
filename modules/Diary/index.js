import { esc, formatJapaneseCopy, fillArtworkHoles, recolorVehicleImage } from "../shared/utils.js?v=suki-no-tane-camera-fix-20260829-v2";
import { avatarBuddy } from "../shared/avatars.js";
import { localizeText } from "../shared/i18n.js";

function resolveImage(ctx, value) {
  if (!value) return null;
  if (/^(?:data:|https?:|blob:)/i.test(value)) return value;
  return ctx.repo.assetUrl(value);
}

function storedPage(value, fallback) {
  if (typeof value === "string") return { ...fallback, image: value };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...fallback, ...value };
  }
  return fallback;
}

// 絵本の元データ（content/books/*.json）は、写真や色ぬりでは絶対に書き換わらない
// 唯一の「本当の元絵」。保存された originalPage がどんな経路で作られていても
// （過去のバージョンの記録・保存の不具合など）、ここで見つかった元絵を最優先にすることで、
// スクラッチボードに完成後の写真が紛れ込む余地をなくす。
function canonicalPageImage(book, pageId) {
  return book?.pages?.find((p) => p.id === pageId)?.image ?? null;
}

function originalPageFor(book, entry, page) {
  const pageId = entry.kind === "story" ? page.id : entry.missionId;
  const stored = storedPage(entry.originalPage, {
    id: page.id,
    type: page.type,
    image: entry.kind === "story" ? (entry.image || page.image) : (entry.missionImage || page.image),
  });
  const canonicalImage = canonicalPageImage(book, pageId);
  return canonicalImage ? { ...stored, image: canonicalImage } : stored;
}

function completedPageFor(ctx, memory, entry, page) {
  const fallback = page.type === "story"
    ? {
        id: page.id,
        type: "story",
        image: page.image,
        fillPhoto: entry.fillPhoto || (page.fillFrom ? memory.bookColorPhotos?.[page.fillFrom] : null),
        colorFills: entry.colorFills ?? page.colorFills ?? null,
      }
    : {
        id: page.id,
        type: "mission",
        image: entry.photoUrl || entry.missionImage || page.image,
        photoUrl: entry.photoUrl || null,
      };
  return storedPage(entry.completedPage, fallback);
}

function pictureBookScene(ctx, memory, page, entry) {
  const completedPage = completedPageFor(ctx, memory, entry, page);
  const source = resolveImage(ctx, completedPage.image || page.image);
  // book-niji は colorFills が各ページ自身の透明部分へ写真を入れる。
  // 別ページの完成画像を下に重ねると、撮影した位置と絵の位置がずれる。
  const fillPhoto = memory.bookId === "book-niji"
    ? null
    : completedPage.fillPhoto || (page.fillFrom ? memory.bookColorPhotos?.[page.fillFrom] : null);
  const colorFills = (completedPage.colorFills ?? []).filter((fill) => memory.bookColorPhotos?.[fill.from]);
  return `
    <div class="storybook-scene${colorFills.length ? " has-book-color" : ""}"
      ${colorFills.length ? `data-memory-color data-memory-source="${source}" data-memory-fills='${esc(JSON.stringify(colorFills))}'` : ""}>
      ${fillPhoto ? `<img class="fill" src="${esc(fillPhoto)}" alt="">` : ""}
      <img class="art" src="${source}" alt="">
      ${colorFills.map((_, i) => `<img class="book-color-art" data-memory-color-layer data-memory-fill-index="${i}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="">`).join("")}
    </div>`;
}

function pictureBookPages(ctx, memory, book, bookmarkButton) {
  const entriesByKey = new Map(memory.entries.map((entry, index) => [
    entry.kind === "story" ? `story:${entry.image}` : `mission:${entry.missionId}`,
    { entry, index },
  ]));
  return (book.pages ?? [])
    .filter((page) => page.type !== "end")
    .map((page) => {
      const key = page.type === "story" ? `story:${page.image}` : `mission:${page.id}`;
      const match = entriesByKey.get(key);
      if (!match) return "";
      const { entry, index } = match;
      if (page.type === "story") {
        return `
      <article class="storybook-page">
        ${bookmarkButton(index, "挿絵")}
        ${pictureBookScene(ctx, memory, page, entry)}
        <p class="storybook-text">${formatJapaneseCopy(page.text)}</p>
      </article>`;
      }
      const image = entry.photoUrl || ctx.repo.assetUrl(entry.missionImage) || ctx.repo.assetUrl(page.image);
      const completedPage = completedPageFor(ctx, memory, entry, page);
      const completedImage = resolveImage(completedPage.photoUrl || completedPage.image || page.image);
      return `
      <article class="storybook-page storybook-page--mission">
        ${bookmarkButton(index, "写真")}
        <img class="storybook-mission-image" src="${esc(completedImage || image)}" alt="">
        <p class="storybook-text">${formatJapaneseCopy(page.text)}</p>
        ${page.prompt ? `<p class="storybook-prompt">${formatJapaneseCopy(page.prompt)}</p>` : ""}
      </article>`;
    })
    .join("") || `<p class="empty">きろくが ありません</p>`;
}

export const DiaryScreen = {
  render(ctx, { memory, fromPlay }) {
    const book = ctx.repo.book(memory.bookId);
    // ページ背景にはその絵本の表紙をぼかして敷く
    const cover = ctx.repo.assetUrl(book?.cover);
    const bookmarkButton = (entryIndex, label) => {
      const bookmarked = ctx.session.isMemoryBookmarked(memory.id, entryIndex);
      return `<button type="button" class="memory-bookmark${bookmarked ? " is-active" : ""}"
        data-bookmark-memory data-entry-index="${entryIndex}" aria-pressed="${bookmarked}"
        aria-label="${bookmarked ? "お気に入りをはずす" : `${esc(label)}をお気に入りに追加`}"
        title="${bookmarked ? "お気に入りをはずす" : "お気に入りに追加"}">${bookmarked ? "★" : "☆"}</button>`;
    };
    const scratchboardEntries = memory.entries.map((e, entryIndex) => {
      const page = e.originalPage || e.completedPage || {
        id: e.kind === "story" ? e.image : e.missionId,
        type: e.kind,
        image: e.kind === "story" ? e.image : e.missionImage,
      };
      const originalPage = originalPageFor(book, e, page);
      const originalImage = resolveImage(ctx, originalPage.image);
      // おはなしの挿絵は1枚の絵として見せる（キャプションなし）。
      // スクラッチボードでは、完成後の写真・色レイヤーを一切重ねず、元画像だけを見せる。
      if (e.kind === "story") {
        return `
      <div class="diary-entry">
        ${bookmarkButton(entryIndex, "挿絵")}
        <div class="diary-scene">
          <img class="art" src="${esc(originalImage || "")}" alt="">
        </div>
      </div>`;
      }
      // ミッションも、写真を貼る前の元ページだけを表示する。
      return `
      <div class="diary-entry">
        ${bookmarkButton(entryIndex, "写真")}
        <div class="photo-scene scratchboard-original-scene">
          <img src="${esc(originalImage || cover || "")}" alt="しゃしんを はるまえの えほん">
        </div>
        <p class="diary-caption">${esc(e.caption)}</p>
      </div>`;
    }).join("") || `<p class="empty">きろくが ありません</p>`;
    const pictureBookEntries = book
      ? pictureBookPages(ctx, memory, book, bookmarkButton)
      : `<p class="empty">きろくが ありません</p>`;
    return `
      <div class="screen diary">
        ${cover ? `<div class="diary-bg" aria-hidden="true" style="background-image:url('${cover}')"></div>` : ""}
        <div class="diary-view-switch" role="tablist" aria-label="表示方法をえらぶ">
          <button type="button" class="diary-view-button is-active" data-diary-view-button="scratchboard" aria-pressed="true">スクラッチボード</button>
          <button type="button" class="diary-view-button" data-diary-view-button="picture-book" aria-pressed="false">絵本</button>
        </div>
        <div class="diary-cover">
          <span class="diary-date">${esc(memory.date)}</span>
          <h2>${esc(memory.bookTitle)} の きろく</h2>
          ${memory.reader?.animal ? `
          <div class="diary-reader">
            ${avatarBuddy({ ...memory.reader, name: null })}
            <span class="diary-reader-text">${memory.reader.name ? `${esc(memory.reader.name)}が よんだよ` : "いっしょに よんだよ"}</span>
          </div>` : ""}
        </div>
        <section class="diary-panel scratchboard-preview" data-diary-panel="scratchboard">
          ${scratchboardEntries}
        </section>
        <section class="diary-panel storybook-preview" data-diary-panel="picture-book" hidden>
          ${pictureBookEntries}
        </section>
        <button class="big-next" data-close>本棚にもどる</button>
      </div>`;
  },
  mount(ctx, params = {}, root) {
    const { view, memory, fromBookmarks } = params;
    const viewButtons = [...root.querySelectorAll("[data-diary-view-button]")];
    const viewPanels = [...root.querySelectorAll("[data-diary-panel]")];
    const setDiaryView = (viewMode) => {
      viewButtons.forEach((button) => {
        const active = button.dataset.diaryViewButton === viewMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      viewPanels.forEach((panel) => {
        panel.hidden = panel.dataset.diaryPanel !== viewMode;
      });
    };
    viewButtons.forEach((button) => {
      button.onclick = () => setDiaryView(button.dataset.diaryViewButton);
    });
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
