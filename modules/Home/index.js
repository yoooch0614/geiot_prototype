import { esc } from "../shared/utils.js";
import { openGuide } from "../shared/guide.js";
import { askResume } from "../Select/index.js";
import { avatarSvg, avatarColorValue, openAvatarPicker } from "../shared/avatars.js?v=photo-fill-switch-20260821";

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
    action: "ゆびを みぎへ すべらせる！",
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

// きょうのミッション（1日1さつ）のカード。おうちのひとが対象の絵本を
// 指定していればその表紙とタイトルを、未指定なら「えほんを1さつ」を出す。
// クリアずみの日は緑のチェック表示に変わる（責めない・没収しない）。
function dailyMissionCard(ctx) {
  const mission = ctx.session.getDailyMission();
  if (!mission.enabled) return "";
  const book = mission.bookId ? ctx.repo.book(mission.bookId) : null;
  const done = ctx.session.isDailyMissionDoneToday();
  const label = book ? `『${esc(book.title)}』を よもう！` : "えほんを 1さつ よもう！";
  const art = book?.cover
    ? `<img class="daily-mission-cover" src="${ctx.repo.assetUrl(book.cover)}" alt="" draggable="false">`
    : `<span class="daily-mission-icon" aria-hidden="true">📖</span>`;
  return `
    <button class="daily-mission${done ? " is-done" : ""}" type="button" data-daily-mission>
      ${art}
      <span class="daily-mission-copy">
        <span class="daily-mission-kicker">きょうの ミッション</span>
        <span class="daily-mission-label">${label}</span>
      </span>
      <span class="daily-mission-status">${done ? "✓ クリア！" : "やってみる ›"}</span>
    </button>`;
}

// 右上の「じぶん」ボタン。えらんだアバターの顔を出し、まだなら「？」を出す。
// タップでアバターづくりのモーダルが開く（何度でも作りなおせる）。
function avatarLaunch(ctx) {
  const avatar = ctx.session.getAvatar();
  const face = avatar.animal
    ? avatarSvg(avatar)
    : `<span class="avatar-launch-empty" aria-hidden="true">？</span>`;
  return `
    <button class="avatar-launch" type="button" data-avatar aria-label="じぶんの アバターを つくる">
      <span class="avatar-launch-face" style="background:${avatarColorValue(avatar.color)}">${face}</span>
      <span class="avatar-launch-label">${esc(avatar.name || "じぶん")}</span>
    </button>`;
}

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
        ${avatarLaunch(ctx)}
        <h1 class="brand">なにして あそぶ？</h1>
        ${dailyMissionCard(ctx)}
        <button class="login-map-launch" type="button" data-login-map>
          <span class="login-map-launch-icon" aria-hidden="true">🗺️</span>
          <span><strong>まちの おさんぽ</strong><small>れんぞく ${ctx.session.getLoginStatus().streak || 0} 日</small></span>
          <span aria-hidden="true">›</span>
        </button>
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
        <button class="settings-launch" data-settings type="button">⚙ せってい</button>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    root.querySelector("[data-login-map]").onclick = () => ctx.go("LOGIN_REWARD", { returnTo: "HOME" });
    root.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => ctx.go(b.dataset.go, b.dataset.view ? { view: b.dataset.view } : {});
    });
    // じぶんアバター：つくり終えたら HOME を描き直して右上の顔を更新する
    root.querySelector("[data-avatar]").onclick = () =>
      openAvatarPicker(ctx, root, { onChange: () => ctx.go("HOME") });
    // きょうのミッション：指定の絵本があればすぐ開く（読みかけがあれば本人にたずねる）。
    // 「どの絵本でもOK」のときは本だなへ。クリアずみなら開かずにほめるだけ。
    const missionButton = root.querySelector("[data-daily-mission]");
    if (missionButton) {
      missionButton.onclick = () => {
        if (ctx.session.isDailyMissionDoneToday()) {
          ctx.notify?.("きょうの ミッションは クリアしたよ！");
          return;
        }
        const { bookId } = ctx.session.getDailyMission();
        if (!bookId || !ctx.repo.book(bookId)) return ctx.go("SELECT");
        if (ctx.session.hasResume(bookId)) return askResume(ctx, bookId, root);
        ctx.session.startBook(bookId);
        ctx.showPage();
      };
    }
    const showGuide = () => openGuide(ctx, root, {
      steps: GUIDE_STEPS,
      onComplete: () => ctx.session.markGuideSeen(),
    });
    root.querySelector("[data-guide-open]").onclick = showGuide;
    root.querySelector("[data-settings]").onclick = () => ctx.go("SETTINGS", { from: "HOME" });
    if (ctx.session.mode === "child" && !ctx.session.hasSeenGuide()) showGuide();
  },
};
