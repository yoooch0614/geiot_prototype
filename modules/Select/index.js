import { esc } from "../shared/utils.js";

function bookCard(ctx, b) {
  return `
    <button class="book-card" data-book="${b.id}">
      <img src="${ctx.repo.assetUrl(b.cover)}" alt="">
      <span class="book-title">${esc(b.title)}</span>
      <span class="book-age">${esc(b.ageRange)}さい</span>
    </button>`;
}

// 本を2冊ずつ棚の段に分ける
function shelfRows(ctx) {
  const books = ctx.repo.books;
  const rows = [];
  for (let i = 0; i < books.length; i += 2) rows.push(books.slice(i, i + 2));
  return rows
    .map((row, i) => `
      <div class="shelf-row">${row.map((b) => bookCard(ctx, b)).join("")}</div>
      ${i < rows.length - 1 ? '<div class="shelf-board"></div>' : ""}`)
    .join("");
}

export const SelectScreen = {
  render(ctx) {
    return `
      <div class="screen">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title">どの えほんを よむ？</h2>
        <div class="shelf">
          <div class="shelf-top"><span class="shelf-emblem">📖</span></div>
          <div class="shelf-body">${shelfRows(ctx)}</div>
          <div class="shelf-base"></div>
        </div>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
    root.querySelectorAll("[data-book]").forEach((b) => {
      b.onclick = () => { ctx.session.startBook(b.dataset.book); ctx.showPage(); };
    });
  },
};
