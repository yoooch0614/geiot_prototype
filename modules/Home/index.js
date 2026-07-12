import { openGuide } from "../shared/guide.js";

const GUIDE_STEPS = [
  {
    number: "1",
    image: "assets/cover-nono.png",
    type: "tap",
    title: "えほん！",
    action: "「えほん」を タッチ！",
    text: "すきな ほんを えらぶよ",
    focus: '[data-go="SELECT"]:not([data-view])',
  },
  {
    number: "2",
    image: "assets/niji/p1.png",
    type: "swipe",
    title: "みぎへ スーッ！",
    action: "ゆびで すべらせる！",
    text: "ページが めくれるよ",
  },
  {
    number: "3",
    image: "assets/char-cat.webp",
    type: "camera",
    title: "しゃしん！",
    action: "「とってみよう！」を タッチ！",
    text: "いっしょに やってみよう",
  },
];

export const HomeScreen = {
  render(ctx) {
    return `
      <div class="screen center screen--sky">
        <div class="sky-scene" aria-hidden="true">
          <span class="sky-sun"></span>
          <span class="sky-moon"></span>
          <span class="sky-cloud sky-cloud--1"></span>
          <span class="sky-cloud sky-cloud--2"></span>
          <span class="sky-star sky-star--1"></span>
          <span class="sky-star sky-star--2"></span>
          <span class="sky-star sky-star--3"></span>
          <span class="sky-star sky-star--4"></span>
        </div>
        <button class="back" data-back>‹</button>
        <h1 class="brand">なにして あそぶ？</h1>
        <div class="mode-grid">
          <button class="mode-card mode-card--child" data-go="SELECT">
            <span class="mode-icon mode-icon--book" aria-hidden="true"></span><span>えほん</span>
          </button>
          <button class="mode-card mode-card--memory" data-go="SELECT" data-view="memories">
            <span class="mode-icon mode-icon--memory" aria-hidden="true"></span><span>おもいで</span>
          </button>
        </div>
        <button class="bookmark-launch" data-go="BOOKMARKS">
          <span aria-hidden="true">☆</span> しおり <span class="bookmark-count">${ctx.session.bookmarks.length}</span>
        </button>
        <button class="guide-launch" type="button" data-guide-open>？ あそびかた</button>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    root.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => ctx.go(b.dataset.go, b.dataset.view ? { view: b.dataset.view } : {});
    });
    const showGuide = () => openGuide(ctx, root, {
      steps: GUIDE_STEPS,
      onComplete: () => ctx.session.markGuideSeen(),
    });
    root.querySelector("[data-guide-open]").onclick = showGuide;
    if (ctx.session.mode === "child" && !ctx.session.hasSeenGuide()) showGuide();
  },
};
