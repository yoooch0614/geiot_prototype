import { esc } from "../shared/utils.js";

export const CompleteScreen = {
  render(_ctx, { page }) {
    return `
      <div class="screen center achieve">
        <div class="sparkle">🎉</div>
        <p class="lead">1さつ よめたね！</p>
        <p class="sub">${esc(page?.text || "")}</p>
      </div>`;
  },
  mount(ctx) {
    const book = ctx.repo.book(ctx.session.bookId);
    const memory = ctx.session.buildMemory(book);
    setTimeout(() => ctx.go("DIARY", { memory, fromPlay: true }), 1500);
  },
};
