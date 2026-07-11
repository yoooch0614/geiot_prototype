import { playAudio, esc } from "../shared/utils.js";

export const StoryScreen = {
  render(ctx, { page }) {
    const img = ctx.repo.assetUrl(page.image);
    const count = ctx.repo.pageCount(ctx.session.bookId);
    return `
      <div class="screen reader page--in">
        <button class="back" data-back>‹</button>
        <span class="progress">${ctx.session.pageIndex + 1} / ${count}</span>
        <div class="scene"><img src="${img}" alt="" onerror="this.style.opacity=0"></div>
        <p class="lead">${esc(page.text)}</p>
        <button class="big-next" data-next>つぎへ ›</button>
      </div>`;
  },
  mount(ctx, { page }, root) {
    playAudio(ctx.repo.assetUrl(page.audio));
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
    root.querySelector("[data-next]").onclick = () => ctx.advance();
  },
};
