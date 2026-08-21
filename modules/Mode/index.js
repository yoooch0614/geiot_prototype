import { openGuide } from "../shared/guide.js";

const WELCOME_STEPS = [
  {
    number: "1",
    image: "assets/cover-nono.png",
    type: "tap",
    target: "こども",
    title: "こどもで はじめる",
    action: "「こども」を タッチ！",
    text: "えほんを よんで、ミッションに ちょうせんするよ",
    focus: '[data-go="child"]',
  },
  {
    number: "2",
    image: "assets/scene-cheer.svg",
    type: "parent",
    gesture: "🔒",
    target: "おうちのひと",
    title: "おうちのひと",
    action: "「おうちのひと」を タッチ！",
    text: "PINを 入れると、きろくや おもいでを みられるよ",
    focus: '[data-go="parent"]',
  },
  {
    number: "3",
    image: "assets/char-cat.webp",
    type: "camera",
    title: "しゃしんミッション",
    action: "ミッションで しゃしんを とろう！",
    text: "「とってみよう！」で しゃしんを とって、えほんを つくるよ",
  },
];

export const ModeScreen = {
  render(ctx) {
    const cat = ctx.repo.assetUrl("assets/char-cat.webp");
    const icon = ctx.repo.assetUrl("assets/logotitle_ver2.png");
    const bird = ctx.repo.assetUrl("assets/bird.gif");
    // 1. 歩くきつねのGIFアセットを読み込む
    const fox = ctx.repo.assetUrl("assets/wolk_foxy.gif");

    return `
      <div class="screen center title-screen screen--sky">
        <div class="sky-scene" aria-hidden="true">
          <span class="sky-sun"></span>
          <span class="sky-moon"></span>
          <span class="sky-cloud sky-cloud--1"></span>
          <span class="sky-cloud sky-cloud--2"></span>
          <span class="sky-star sky-star--1"></span>
          <span class="sky-star sky-star--2"></span>
          <span class="sky-star sky-star--3"></span>
          <span class="sky-star sky-star--4"></span>
          ${bird ? `<span class="sky-bird"><img src="${bird}" alt=""></span>` : ""}
        </div>
        <div class="title-hills" aria-hidden="true">
          <span class="title-hill title-hill--far"></span>
          <span class="title-hill title-hill--near"></span>
          
          <!-- 2. きつねの要素を追加（手前の丘の上に表示されるようにここに配置） -->
          ${cat ? `<img class="title-cat" src="${cat}" alt="">` : ""}
          ${fox ? `<img class="title-fox" src="${fox}" alt="">` : ""}
          
        </div>
        <div class="title-logo">
          <img class="title-icon" src="${icon}" alt="えほえほ" onerror="this.remove()">
        </div>
        <p class="title-ask">だれと はじめる？</p>
        <div class="mode-grid">
          <button class="mode-card mode-card--child" data-go="child">
            <span>こども</span>
          </button>
          <button class="mode-card mode-card--parent" data-go="parent">
            <span>おうちのひと</span>
          </button>
        </div>
        <button class="guide-launch" type="button" data-guide-open>？ はじめてのかたへ</button>
        <button class="settings-launch" data-settings type="button">⚙ せってい</button>
      </div>`;
  },
  mount(ctx, _p, root) {
    const showWelcomeGuide = () => openGuide(ctx, root, {
      steps: WELCOME_STEPS,
      kicker: "はじめてのかたへ",
      title: "つかいかた",
      finalLabel: "はじめよう！",
      onComplete: () => ctx.session.markWelcomeGuideSeen(),
    });
    root.querySelector('[data-go="child"]').onclick = () => {
      ctx.session.setMode("child"); ctx.go("HOME");
    };
    root.querySelector('[data-go="parent"]').onclick = () => {
      ctx.session.setMode("parent"); ctx.go("PIN");
    };
    root.querySelector("[data-guide-open]").onclick = showWelcomeGuide;
    root.querySelector("[data-settings]").onclick = () => ctx.go("SETTINGS", { from: "MODE" });
    if (!ctx.session.hasSeenWelcomeGuide()) showWelcomeGuide();
  },
};
