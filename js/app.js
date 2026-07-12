/*
 * app.js ── コントローラ（画面のルーター）
 * ------------------------------------------------------------
 * ContentRepository / Session / Screens をつなぐ。
 * go(name, params) で画面を切り替えるだけ。個々の見た目は screens.js。
 */
import { ContentRepository } from "./ContentRepository.js";
import { Session } from "./Session.js";
import { Screens } from "./screens.js";
import { unlockAudio, preloadAudio, playAudio, CELEBRATION_SOUNDS, CLICK_SOUND } from "../modules/shared/utils.js";

const root = document.getElementById("app");
const repo = new ContentRepository();
const session = new Session();

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
    [CLICK_SOUND, "assets/page_sound.mp3", ...CELEBRATION_SOUNDS].map((s) => repo.assetUrl(s))
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
