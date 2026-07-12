/*
 * app.js ── コントローラ（画面のルーター）
 * ------------------------------------------------------------
 * ContentRepository / Session / Screens をつなぐ。
 * go(name, params) で画面を切り替えるだけ。個々の見た目は screens.js。
 */
import { ContentRepository } from "./ContentRepository.js";
import { Session } from "./Session.js";
import { Screens } from "./screens.js";
import {
  unlockAudio, preloadAudio, playAudio, playBgm, stopBgm,
  CELEBRATION_SOUNDS, CLICK_SOUND, HOME_BGM,
} from "../modules/shared/utils.js";

// BGMを流す画面。トップ（MODE）・あそびえらび（HOME）・本だな（SELECT）の3つ。
// 絵本を読みはじめたら止める（おはなしの音やページめくり音の邪魔になるため）。
// 3画面とも同じ曲なので、この中を行き来しているあいだは鳴りっぱなしで途切れない。
const BGM_SCREENS = new Set(["MODE", "HOME", "SELECT"]);

const root = document.getElementById("app");
const themeToggle = document.getElementById("theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const repo = new ContentRepository();
const session = new Session();

// UI は端末のローカル時刻で切り替える。06:00〜17:59 は朝/昼、18:00〜05:59 は夜。
const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 18;
let themeOverride = null; // テストボタンを押した間だけ "day" / "night"
let themeTimer = null;

function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour < DAY_START_HOUR || hour >= NIGHT_START_HOUR;
}

function updateThemeToggle(isNight, mode) {
  if (!themeToggle) return;
  themeToggle.textContent = isNight ? "☀️ テスト：朝" : "🌙 テスト：夜";
  themeToggle.dataset.themeMode = mode;
  themeToggle.setAttribute(
    "aria-label",
    `${mode === "auto" ? "自動判定中。" : "テスト表示中。"} クリックで${isNight ? "朝" : "夜"}に切り替え`
  );
  themeToggle.title = mode === "auto"
    ? `端末時刻で自動判定中（${isNight ? "夜" : "朝/昼"}）。クリックでテスト切替。`
    : "テスト切替中。ページを更新すると端末時刻の自動判定に戻ります。";
}

function applyTheme(mode = "auto") {
  const isNight = mode === "auto" ? isNightTime() : mode === "night";
  document.body.classList.toggle("night-theme", isNight);
  document.body.dataset.themeMode = mode;
  themeMeta?.setAttribute("content", isNight ? "#101c36" : "#6bbf59");
  updateThemeToggle(isNight, mode);
}

function scheduleThemeSync() {
  if (themeTimer) window.clearTimeout(themeTimer);
  if (themeOverride) return;

  const now = new Date();
  const next = new Date(now);
  const hour = now.getHours();
  if (hour < DAY_START_HOUR) {
    next.setHours(DAY_START_HOUR, 0, 0, 0);
  } else if (hour < NIGHT_START_HOUR) {
    next.setHours(NIGHT_START_HOUR, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(DAY_START_HOUR, 0, 0, 0);
  }

  // 页面一直开着时，也会在下一个切换时间自动更新，不需要重新加载。
  themeTimer = window.setTimeout(() => {
    if (themeOverride) return;
    applyTheme("auto");
    scheduleThemeSync();
  }, Math.max(1000, next.getTime() - now.getTime() + 100));
}

// 先立即按设备时间渲染，避免等待内容加载时主题不正确。
applyTheme("auto");
scheduleThemeSync();
themeToggle?.addEventListener("click", () => {
  const nextMode = document.body.classList.contains("night-theme") ? "day" : "night";
  themeOverride = nextMode;
  if (themeTimer) window.clearTimeout(themeTimer);
  themeTimer = null;
  applyTheme(nextMode);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !themeOverride) {
    applyTheme("auto");
    scheduleThemeSync();
  }
});

const ctx = {
  repo,
  session,
  els: { camera: document.getElementById("camera-input") },
  go,
  showPage,
  advance,
};

let currentScreen = null;

// 画面を描画
function go(name, params = {}) {
  const screen = Screens[name];
  if (!screen) return;
  currentScreen?.unmount?.(ctx);
  root.innerHTML = screen.render(ctx, params);
  root.querySelector(".screen")?.classList.add("page--in"); // 画面切り替えの入場アニメを全画面に統一
  screen.mount?.(ctx, params, root);
  currentScreen = screen;
  root.scrollTop = 0;
  root.querySelector(".screen")?.scrollTo(0, 0);

  if (BGM_SCREENS.has(name)) playBgm(repo.assetUrl(HOME_BGM));
  else stopBgm();
}

// いまのページを種類に応じた画面へ振り分け（物語・ミッション/おわり）
// 物語とミッションは同じ StoryScreen（1冊の本）が受け持つ。
function showPage() {
  const page = repo.pageAt(session.bookId, session.pageIndex);
  if (!page) return go("HOME");
  if (page.type === "end") return go("COMPLETE", { page });
  return go("STORY", { page });
}

// 次のページへ進む
function advance() {
  const count = repo.pageCount(session.bookId);
  if (session.pageIndex < count - 1) {
    session.next(count);
    showPage();
  } else {
    go("HOME");
  }
}

// iOS/Safari は最初のユーザー操作より前の再生を拒否する。最初のタップで再生許可を取っておくと、
// 撮影のあとのお祝い音のように「操作から離れて鳴る音」も確実に鳴るようになる。
["pointerdown", "touchstart", "keydown"].forEach((type) =>
  window.addEventListener(type, unlockAudio, { once: true, capture: true })
);

// ボタンを押した手ごたえのクリック音。画面ごとに書くと付け忘れるので、ここでまとめて拾う。
// 指を離すのを待たず、押した瞬間（pointerdown）に鳴らしたほうが反応がよく感じられる。
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) playAudio(repo.assetUrl(CLICK_SOUND));
}, { capture: true });

async function boot() {
  try {
    // コンテンツの読み込みと、保存済みデータ（思い出・読みかけの本）の復元を並行で待つ。
    // session.restore() は失敗しても例外を出さない（保存が効かないだけで動く）。
    await Promise.all([repo.load(), session.restore()]);
  } catch (err) {
    showServerHint();
    return;
  }
  // 鳴らす場面で取得待ちにならないよう、いつでも鳴りうる音は先に読み込んでおく。
  preloadAudio(
    [CLICK_SOUND, HOME_BGM, "assets/page_sound.mp3", ...CELEBRATION_SOUNDS].map((s) => repo.assetUrl(s))
  );
  go("MODE");
}

// file:// で開いたとき用の案内（白画面を防ぐ）
function showServerHint() {
  root.innerHTML = `
    <div class="screen center">
      <div class="hint">
        <p class="lead">ローカルサーバーで ひらいてね</p>
        <p>このフォルダで つぎを じっこう：</p>
        <code>python3 serve.py</code>
        <p>ひょうじされた <b>http://…:8000</b> を ブラウザで ひらく</p>
      </div>
    </div>`;
}

boot();
