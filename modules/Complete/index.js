import { esc } from "../shared/utils.js";

export const CompleteScreen = {
  render(_ctx, { page }) {
    return `
      <div class="screen center complete">
        <div class="rays"></div>
        <div class="ribbon-fly ribbon-left"></div>
        <div class="ribbon-fly ribbon-right"></div>
        <div class="medal-wrap">
          <div class="medal-tail tail-left"></div>
          <div class="medal-tail tail-right"></div>
          <div class="medal-disc">
            <div class="medal-inner"></div>
          </div>
        </div>
        <p class="lead">1さつ よめたね！</p>
        <p class="sub">${esc(page?.text || "")}</p>
        <button class="next-btn" data-next>つぎへ ›</button>
      </div>`;
  },
  mount(ctx, { page }, root) {
    const book = ctx.repo.book(ctx.session.bookId);
    const memory = ctx.session.buildMemory(book);

    // 初期状態はCSS側で「すでに見えている」のがデフォルト。
    // ここでは登場演出用のクラスを1フレーム後に付与するだけ。
    requestAnimationFrame(() => {
      root
        .querySelectorAll(
          ".medal-disc, .medal-tail, .rays, .ribbon-fly, .lead, .sub, .next-btn"
        )
        .forEach((el) => el.classList.add("pop-in"));
    });

    // 自動遷移はしない。ボタンを押したときだけ次の画面へ。
    root.querySelector("[data-next]").onclick = () => {
      ctx.go("DIARY", { memory, fromPlay: true });
    };
  },
};