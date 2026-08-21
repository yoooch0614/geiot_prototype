/*
 * app.js ── コントローラ（画面のルーター）
 * ------------------------------------------------------------
 * ContentRepository / Session / Screens をつなぐ。
 * go(name, params) で画面を切り替えるだけ。個々の見た目は screens.js。
 */
import { ContentRepository } from "./ContentRepository.js";
import { Session } from "./Session.js?v=diary-photo-choice-logo-20260821";
import { Settings } from "./Settings.js";
import { Screens } from "./screens.js?v=diary-photo-choice-logo-20260821";
import {
  unlockAudio, preloadAudio, playAudio, playBgm, stopBgm,
  stabilizeJapaneseText,
  setEmbeddedAudioEnabled,
  CELEBRATION_SOUNDS, CLICK_SOUND, HOME_BGM, HOME_NIGHT_BGM,
} from "../modules/shared/utils.js";
import { loadBigFiveData } from "../modules/Analysis/workStyles.js";
import { localizeText, localizeUi, t } from "../modules/shared/i18n.js";

// BGMを流す画面。トップ（MODE）・あそびえらび（HOME）・本だな（SELECT）の3つ。
// 絵本を読みはじめたら止める（おはなしの音やページめくり音の邪魔になるため）。
// 3画面とも同じ曲なので、この中を行き来しているあいだは鳴りっぱなしで途切れない。
const BGM_SCREENS = new Set(["MODE", "HOME", "SELECT"]);

const root = document.getElementById("app");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const repo = new ContentRepository();
const session = new Session();

// 画面遷移だけでなく、ガイドや確認ダイアログなど後から追加される文章にも
// 日本語の意味単位ごとの改行ルールを適用する。
const copyObserver = typeof MutationObserver === "function"
  ? new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1) stabilizeJapaneseText(node);
          else if (node.nodeType === 3 && node.parentElement) stabilizeJapaneseText(node.parentElement);
        });
      });
    })
  : null;
copyObserver?.observe(root, { childList: true, subtree: true });

// UI は端末のローカル時刻で切り替える。06:00〜17:59 は朝/昼、18:00〜05:59 は夜。
const DAY_START_HOUR = 6;
const NIGHT_START_HOUR = 18;
const initialTheme = Settings.get("theme");
let themeOverride = initialTheme === "auto" ? null : initialTheme;
let themeTimer = null;
let currentScreen = null;
let currentScreenName = null;
let parentSessionUnlocked = false;
let parentIdleTimer = null;

const PARENT_IDLE_MS = 5 * 60 * 1000;

function clearParentIdleTimer() {
  if (parentIdleTimer) {
    window.clearTimeout(parentIdleTimer);
    parentIdleTimer = null;
  }
}

function armParentIdleTimer() {
  clearParentIdleTimer();
  if (!parentSessionUnlocked) return;
  parentIdleTimer = window.setTimeout(() => {
    parentSessionUnlocked = false;
    session.setMode(null);
    go("MODE");
  }, PARENT_IDLE_MS);
}

function unlockParentSession() {
  parentSessionUnlocked = true;
  session.setMode("parent");
  armParentIdleTimer();
}

function endParentSession() {
  parentSessionUnlocked = false;
  clearParentIdleTimer();
  if (session.mode === "parent") session.setMode(null);
}

function lockParentSession() {
  const shouldReturn = parentSessionUnlocked || session.mode === "parent";
  endParentSession();
  if (shouldReturn && currentScreenName !== "MODE") go("MODE");
}

function noteParentActivity() {
  if (parentSessionUnlocked) armParentIdleTimer();
}

function showToast(message, type = "success") {
  document.querySelector("[data-app-toast]")?.remove();
  const toast = document.createElement("div");
  toast.className = `app-toast app-toast--${type}`;
  toast.dataset.appToast = "";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.textContent = localizeText(message);
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, 1800);
}

["pointerdown", "keydown", "touchstart", "scroll"].forEach((type) => {
  document.addEventListener(type, noteParentActivity, { capture: true, passive: true });
});

function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour < DAY_START_HOUR || hour >= NIGHT_START_HOUR;
}

function applyTheme(mode = "auto") {
  const isNight = mode === "auto" ? isNightTime() : mode === "night";
  document.body.classList.toggle("night-theme", isNight);
  document.body.dataset.themeMode = mode;
  themeMeta?.setAttribute("content", isNight ? "#101c36" : "#6bbf59");
  syncBgmForTheme();
}

function homeBgmUrl() {
  return repo.assetUrl(document.body.classList.contains("night-theme")
    ? HOME_NIGHT_BGM
    : HOME_BGM);
}

function syncBgmForTheme() {
  if (currentScreenName && BGM_SCREENS.has(currentScreenName)) {
    playBgm(homeBgmUrl());
  }
}

function applyDisplaySettings() {
  const fontSize = Settings.get("fontSize");
  const animationsEnabled = Settings.get("animationsEnabled");
  document.body.dataset.fontSize = fontSize;
  document.body.dataset.animations = animationsEnabled ? "on" : "off";
  document.documentElement.lang = Settings.get("language");
}

function setFontSize(value) {
  Settings.set("fontSize", value);
  applyDisplaySettings();
}

function setAnimationsEnabled(enabled) {
  Settings.set("animationsEnabled", Boolean(enabled));
  applyDisplaySettings();
}

function setLanguage(value) {
  const language = Settings.set("language", value);
  applyDisplaySettings();
  return language;
}

// touch-action がない古いモバイルブラウザ向けの二重タップ拡大ガード。
// 同じ場所への短時間の2回目だけを抑止し、通常のスクロール・スワイプ・
// 離れた場所への連続タップはそのまま通す。CSS側で双指ズームは許可している。
function installDoubleTapZoomGuard() {
  let lastTap = null;
  document.addEventListener("touchend", (event) => {
    if (event.defaultPrevented || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const now = Date.now();
    const isDoubleTap = lastTap &&
      now - lastTap.time < 320 &&
      Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 32;
    if (isDoubleTap) {
      event.preventDefault();
      lastTap = null;
      return;
    }
    lastTap = { time: now, x: touch.clientX, y: touch.clientY };
  }, { passive: false });
}

installDoubleTapZoomGuard();

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

  // ページを開いたままでも、次の切り替え時刻に自動更新する。
  themeTimer = window.setTimeout(() => {
    if (themeOverride) return;
    applyTheme("auto");
    scheduleThemeSync();
  }, Math.max(1000, next.getTime() - now.getTime() + 100));
}

function setThemeMode(mode = "auto") {
  const safeMode = ["auto", "day", "night"].includes(mode) ? mode : "auto";
  Settings.set("theme", safeMode);
  themeOverride = safeMode === "auto" ? null : safeMode;
  applyTheme(safeMode);
  scheduleThemeSync();
}

// 先立即按设备时间渲染，避免等待内容加载时主题不正确。
applyDisplaySettings();
applyTheme(initialTheme);
scheduleThemeSync();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !themeOverride) {
    applyTheme("auto");
    scheduleThemeSync();
  }
});

const ctx = {
  repo,
  session,
  bigFiveData: null,
  settings: Settings,
  els: { camera: document.getElementById("camera-input") },
  go,
  showPage,
  advance,
  applyDisplaySettings,
  setFontSize,
  setAnimationsEnabled,
  setLanguage,
  t,
  setThemeMode,
  unlockParent: unlockParentSession,
  lockParent: lockParentSession,
  notify: showToast,
};

// 画面を描画
function go(name, params = {}) {
  const screen = Screens[name];
  if (!screen) return;
  if (name === "MODE") endParentSession();
  currentScreenName = name;
  currentScreen?.unmount?.(ctx);
  root.innerHTML = screen.render(ctx, params);
  stabilizeJapaneseText(root);
  root.querySelector(".screen")?.classList.add("page--in"); // 画面切り替えの入場アニメを全画面に統一
  screen.mount?.(ctx, params, root);
  currentScreen = screen;
  localizeUi(root);
  root.scrollTop = 0;
  root.querySelector(".screen")?.scrollTo(0, 0);

  if (BGM_SCREENS.has(name)) playBgm(homeBgmUrl());
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

// company website の speaker と、埋め込みアプリ側の音声を同期する。
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;
  if (event.data?.type !== "pictupath-site-sound") return;
  const enabled = setEmbeddedAudioEnabled(event.data.enabled);
  if (enabled) unlockAudio();
});

// ボタンを押した手ごたえのクリック音。画面ごとに書くと付け忘れるので、ここでまとめて拾う。
// 指を離すのを待たず、押した瞬間（pointerdown）に鳴らしたほうが反応がよく感じられる。
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) playAudio(repo.assetUrl(CLICK_SOUND));
}, { capture: true });

function renderLoadingScreen() {
  root.innerHTML = `
    <div class="screen center splash" aria-live="polite">
      <img class="splash-icon" src="content/assets/logotitle_ver2.png" alt="えほえほ">
      <span class="splash-dots"><i></i><i></i><i></i></span>
      <p class="splash-label">じゅんび中…</p>
    </div>`;
}

async function boot() {
  renderLoadingScreen();
  try {
    // コンテンツの読み込みと、保存済みデータ（思い出・読みかけの本）の復元を並行で待つ。
    // session.restore() は失敗しても例外を出さない（保存が効かないだけで動く）。
    const bigFiveDataPromise = loadBigFiveData().catch((error) => {
      console.warn("Big Five の参照データを読み込めませんでした", error);
      return null;
    });
    const [, , loadedBigFiveData] = await Promise.all([
      repo.load(),
      session.restore(),
      bigFiveDataPromise,
    ]);
    ctx.bigFiveData = loadedBigFiveData;
  } catch (err) {
    showServerHint(err);
    return;
  }
  // 鳴らす場面で取得待ちにならないよう、いつでも鳴りうる音は先に読み込んでおく。
  preloadAudio(
    [CLICK_SOUND, HOME_BGM, HOME_NIGHT_BGM, "assets/page_sound.mp3", ...CELEBRATION_SOUNDS].map((s) => repo.assetUrl(s))
  );
  go("MODE");
}

// file:// / 通信エラーのとき用の案内（白画面を防ぐ）
function showServerHint(_error) {
  root.innerHTML = `
    <div class="screen center">
      <div class="hint">
        <p class="lead">読み込みに しっぱいしました</p>
        <p>ローカルサーバーと ネットワークを かくにんしてね。</p>
        <p>このフォルダで つぎを じっこう：</p>
        <code>python3 serve.py</code>
        <p>ひょうじされた <b>http://…:8000</b> を ブラウザで ひらく</p>
        <button class="big-next" type="button" data-retry>もういちど</button>
      </div>
    </div>`;
  root.querySelector("[data-retry]").onclick = boot;
}

boot();
