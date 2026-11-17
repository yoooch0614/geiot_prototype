import { playCelebrationSound, esc } from "../shared/utils.js?v=suki-no-tane-camera-fix-20260829-v2";
import { avatarBuddy, avatarRewardForMissionCount } from "../shared/avatars.js?v=photo-fill-switch-20260821";

const TEACHER_RABBIT_ASSET = "content/assets/teacher-rabbit.png";

// 描いたあとの仕掛け（もうひとつ・きもち）。タップだけを遊びの記録に残す。
const MOODS = [
  { value: "happy", label: "たのしい", mouth: "M20 38 Q32 50 44 38", fill: "#ffe08a" },
  { value: "normal", label: "ふつう", mouth: "M22 42 L42 42", fill: "#d9e8f5" },
  { value: "hard", label: "むずかしかった", mouth: "M22 46 Q32 36 42 46", fill: "#f3c9c0" },
];

const faceSvg = (mood) => `
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    <circle cx="32" cy="32" r="28" fill="${mood.fill}" stroke="#3a4a3f" stroke-width="3"/>
    <circle cx="23" cy="26" r="3" fill="#3a4a3f"/><circle cx="41" cy="26" r="3" fill="#3a4a3f"/>
    <path d="${mood.mouth}" fill="none" stroke="#3a4a3f" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

function askAfter(ctx, page, root, done) {
  const panel = document.createElement("div");
  panel.className = "play-after";
  root.querySelector(".achieve").append(panel);
  const askMood = () => {
    panel.innerHTML = `
      <p class="play-after__q">かいてみて、どうだった？</p>
      <div class="play-after__row">${MOODS.map((mood) => `
        <button type="button" class="play-mood" data-mood="${mood.value}">${faceSvg(mood)}<span>${esc(mood.label)}</span></button>`).join("")}
      </div>`;
    panel.querySelectorAll("[data-mood]").forEach((button) => {
      button.onclick = () => {
        ctx.session.recordPlay(page.id, { mood: button.dataset.mood }, { closing: true });
        done();
      };
    });
  };
  if (page?.play?.more) {
    panel.innerHTML = `
      <p class="play-after__q">${esc(page.play.more)}</p>
      <div class="play-after__row">
        <button type="button" class="play-card" data-more="yes">かく</button>
        <button type="button" class="play-card" data-more="no">おしまい</button>
      </div>`;
    panel.querySelectorAll("[data-more]").forEach((button) => {
      button.onclick = () => {
        ctx.session.recordPlay(page.id, { addMore: button.dataset.more === "yes" }, { closing: true });
        askMood();
      };
    });
  } else {
    askMood();
  }
}

export const AchieveScreen = {
  render(ctx) {
    const avatar = ctx.session.getAvatar();
    const completionMessage = avatar.name
      ? `${esc(avatar.name)}、やったね！`
      : "やったね！";
    return `
      <div class="screen center achieve">
        <div class="confetti-layer" data-confetti></div>
        <div class="sparkle-burst">
          <span class="sparkle-shape s1"></span>
          <span class="sparkle-shape s2"></span>
          <span class="sparkle-shape s3"></span>
          <span class="sparkle-shape s4"></span>
          <span class="sparkle-shape s5"></span>
          <span class="sparkle-shape s6"></span>
        </div>
        <div class="teacher-rabbit-stage">
          <div class="teacher-rabbit-speech" role="status" aria-live="polite">${completionMessage}</div>
          <img class="teacher-rabbit-image" src="${TEACHER_RABBIT_ASSET}" alt="戴眼镜的白色兔兔老师">
        </div>
        ${avatarBuddy(avatar, "avatar-buddy--achieve")}
      </div>`;
  },
  mount(ctx, params, root) {
    playCelebrationSound(ctx);
    const completion = ctx.session.takeLastMissionCompletion?.();
    const reward = completion?.isNewMission
      ? avatarRewardForMissionCount(completion.completedMissionCount)
      : null;
    ctx.notify?.(reward
      ? `ミッション かんりょう！ ${reward.label}が つかえるようになったよ！`
      : "ミッション かんりょう！");

    const layer = root.querySelector("[data-confetti]");
    const shapes = ["circle", "square", "star"];
    const colors = ["#FFD166", "#EF476F", "#06D6A0", "#118AB2", "#FF7BAC"];

    for (let i = 0; i < 20; i++) {
      const p = document.createElement("span");
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      p.className = `confetti-piece confetti-${shape}`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = `${Math.random() * 0.4}s`;
      p.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
      const size = 8 + Math.random() * 8;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      layer.appendChild(p);
    }

    // お祝いのあと、描いたあとの質問（もうひとつ・きもち）に答えてから次へ進む。
    const page = params?.page;
    const next = () => ctx.advance();
    setTimeout(() => (page?.id ? askAfter(ctx, page, root, next) : next()), 1800);
  },
};
