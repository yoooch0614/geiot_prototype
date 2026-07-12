import { esc } from "../shared/utils.js";

function pageBookmarkCard(ctx, bookmark) {
  const title = bookmark.bookTitle || ctx.repo.book(bookmark.bookId)?.title || bookmark.bookId;
  const image = bookmark.image ? ctx.repo.assetUrl(bookmark.image) : null;
  return `
    <article class="bookmark-card" data-bookmark-card="${esc(bookmark.id)}">
      <button type="button" class="bookmark-remove" data-remove-bookmark="${esc(bookmark.id)}" aria-label="しおりをはずす">×</button>
      <button type="button" class="bookmark-open" data-open-page="${esc(bookmark.id)}">
        <div class="bookmark-thumb">${image ? `<img src="${esc(image)}" alt="">` : `<span class="bookmark-placeholder">☆</span>`}</div>
        <span class="bookmark-info">
          <span class="bookmark-type">ページのしおり</span>
          <strong>${esc(title)}</strong>
          <span>${esc(bookmark.text || "お気に入りのページ")}</span>
        </span>
      </button>
    </article>`;
}

function memoryBookmarkCard(ctx, bookmark) {
  const memory = ctx.session.memories.find((m) => m.id === bookmark.memoryId);
  const entry = memory?.entries?.[bookmark.entryIndex];
  const title = bookmark.bookTitle || memory?.bookTitle || "おもいで";
  const image = entry?.kind === "mission"
    ? entry.photoUrl || ctx.repo.assetUrl(entry.missionImage)
    : ctx.repo.assetUrl(entry?.image);
  const label = bookmark.label || (entry?.kind === "story" ? "挿絵" : "写真");
  const text = entry?.kind === "mission"
    ? entry.caption || entry.missionText || "お気に入りの写真"
    : "お気に入りの挿絵";
  return `
    <article class="bookmark-card" data-bookmark-card="${esc(bookmark.id)}">
      <button type="button" class="bookmark-remove" data-remove-bookmark="${esc(bookmark.id)}" aria-label="お気に入りをはずす">×</button>
      <button type="button" class="bookmark-open" data-open-memory="${esc(bookmark.memoryId)}">
        <div class="bookmark-thumb bookmark-thumb--memory">${image ? `<img src="${esc(image)}" alt="">` : `<span class="bookmark-placeholder">☆</span>`}</div>
        <span class="bookmark-info">
          <span class="bookmark-type">${esc(label)}</span>
          <strong>${esc(title)}</strong>
          <span>${esc(text)}</span>
        </span>
      </button>
    </article>`;
}

function bookmarkCard(ctx, bookmark) {
  return bookmark.kind === "memory"
    ? memoryBookmarkCard(ctx, bookmark)
    : pageBookmarkCard(ctx, bookmark);
}

export const BookmarksScreen = {
  render(ctx) {
    const bookmarks = ctx.session.bookmarks ?? [];
    const cards = bookmarks.length
      ? bookmarks.map((bookmark) => bookmarkCard(ctx, bookmark)).join("")
      : `<div class="bookmark-empty">
           <span class="bookmark-empty-star">☆</span>
           <p>まだ しおりが ありません。</p>
           <p>えほんのページや おもいでの写真に<br>☆をつけると、ここに まとまります。</p>
         </div>`;
    return `
      <div class="screen bookmarks">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title">しおり</h2>
        <p class="bookmarks-lead">お気に入りを いつでも みられるよ</p>
        <div class="bookmark-list">${cards}</div>
      </div>`;
  },
  mount(ctx, _params, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
    root.querySelectorAll("[data-remove-bookmark]").forEach((button) => {
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        ctx.session.removeBookmark(button.dataset.removeBookmark);
        ctx.go("BOOKMARKS");
      };
    });
    root.querySelectorAll("[data-open-page]").forEach((button) => {
      button.onclick = () => {
        const bookmark = ctx.session.bookmarks.find((b) => b.id === button.dataset.openPage);
        if (!bookmark) return;
        ctx.session.startBook(bookmark.bookId);
        ctx.session.goTo(Number(bookmark.pageIndex) || 0);
        ctx.showPage();
      };
    });
    root.querySelectorAll("[data-open-memory]").forEach((button) => {
      button.onclick = () => {
        const memory = ctx.session.memories.find((m) => m.id === button.dataset.openMemory);
        if (memory) ctx.go("DIARY", { memory, fromPlay: false, fromBookmarks: true });
      };
    });
  },
};
