import { esc } from "../shared/utils.js";

export const SelectScreen = {
  render(ctx) {
    const cards = ctx.repo.books.map((b) => `
      <button class="book-card" data-book="${b.id}">
        <img src="${ctx.repo.assetUrl(b.cover)}" alt="">
        <span class="book-title">${esc(b.title)}</span>
        <span class="book-age">${esc(b.ageRange)}さい</span>
      </button>`).join("");
    return `
      <div class="screen">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title">どの えほんを よむ？</h2>
        <div class="book-grid">${cards}</div>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
    root.querySelectorAll("[data-book]").forEach((b) => {
      b.onclick = () => { ctx.session.startBook(b.dataset.book); ctx.showPage(); };
    });
  },
};
