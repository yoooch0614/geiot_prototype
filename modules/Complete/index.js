import { esc, playCelebrationSound } from "../shared/utils.js";
import { avatarBuddy } from "../shared/avatars.js";

const TEACHER_RABBIT_ASSET = "content/assets/teacher-rabbit.png";

export const CompleteScreen = {
  render(ctx, { page }) {
    const avatar = ctx.session.getAvatar();
    const completionTitle = `${avatar.name ? `${esc(avatar.name)}、` : ""}1冊読めたね！`;
    const completionDetail = esc(page?.text || "");
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
        <div class="teacher-rabbit-stage teacher-rabbit-stage--complete">
          <div class="teacher-rabbit-speech teacher-rabbit-speech--complete" role="status" aria-live="polite">
            <span class="teacher-rabbit-speech-title">${completionTitle}</span>
            ${completionDetail ? `<span class="teacher-rabbit-speech-detail">${completionDetail}</span>` : ""}
          </div>
          <img class="teacher-rabbit-image" src="${TEACHER_RABBIT_ASSET}" alt="戴眼镜的白色兔兔老师">
        </div>
        <section class="book-reward" data-book-reward aria-label="絵本を読んだごほうび">
          <p class="book-reward-copy" data-book-reward-copy>ごほうびの はこが とどいたよ！</p>
          <button class="book-reward-box" type="button" data-book-gift aria-label="ごほうびをひらく">🎁</button>
          <div class="book-reward-reveal" data-book-reward-reveal hidden>
            <span class="book-reward-label">新しいアイテムをゲット！</span>
            <span class="book-reward-item"><span data-book-reward-image aria-hidden="true"></span><strong data-book-reward-name></strong></span>
          </div>
          <p class="book-reward-hint" data-book-reward-hint>タッチして あけてね</p>
        </section>
        ${avatarBuddy(avatar, "avatar-buddy--achieve")}
        <button class="next-btn" data-next hidden>つぎへ ›</button>
      </div>`;
  },
  mount(ctx, params = {}, root) {
    const { page, view } = params;
    const book = ctx.repo.book(ctx.session.bookId);
    const memory = ctx.session.buildMemory(book);

    // 1さつ読み終えたお祝いの音。メダルの登場演出と合わせて鳴らす。
    playCelebrationSound(ctx);
    ctx.notify?.("えほん日記を 保存したよ！");

    const reward = memory?.reward;
    const gift = root.querySelector("[data-book-gift]");
    const reveal = root.querySelector("[data-book-reward-reveal]");
    const rewardImage = root.querySelector("[data-book-reward-image]");
    const rewardName = root.querySelector("[data-book-reward-name]");
    const rewardCopy = root.querySelector("[data-book-reward-copy]");
    const rewardHint = root.querySelector("[data-book-reward-hint]");
    const next = root.querySelector("[data-next]");
    if (reward) {
      rewardImage.textContent = reward.image || "🎁";
      rewardName.textContent = reward.name || "すてきな アイテム";
      gift.onclick = () => {
        gift.disabled = true;
        gift.classList.add("is-open");
        gift.textContent = reward.image || "🎁";
        rewardCopy.textContent = reward.isNew ? "よく がんばったね！" : "また あえたね！";
        rewardHint.hidden = true;
        reveal.hidden = false;
        next.hidden = false;
        ctx.notify?.("新しいアイテムを ゲット！");
      };
    } else {
      root.querySelector("[data-book-reward]")?.remove();
      next.hidden = false;
    }

    // 初期状態はCSS側で「すでに見えている」のがデフォルト。
    // ここでは登場演出用のクラスを1フレーム後に付与するだけ。
    requestAnimationFrame(() => {
      root
        .querySelectorAll(
          ".medal-disc, .medal-tail, .rays, .ribbon-fly, .teacher-rabbit-speech, .next-btn"
        )
        .forEach((el) => el.classList.add("pop-in"));
    });

    // 自動遷移はしない。ボタンを押したときだけ次の画面へ。
    root.querySelector("[data-next]").onclick = () => {
      ctx.go("DIARY", { memory, fromPlay: true, view });
    };
  },
};
