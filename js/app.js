/*
 * app.js ── コントローラ（画面のルーター）
 * ------------------------------------------------------------
 * ContentRepository / Session / Screens をつなぐ。
 * go(name, params) で画面を切り替えるだけ。個々の見た目は screens.js。
 */
import { ContentRepository } from "./ContentRepository.js";
import { Session } from "./Session.js";
import { Screens } from "./screens.js";

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

async function boot() {
  try {
    // コンテンツの読み込みと、保存済みデータ（思い出・読みかけの本）の復元を並行で待つ。
    // session.restore() は失敗しても例外を出さない（保存が効かないだけで動く）。
    await Promise.all([repo.load(), session.restore()]);
  } catch (err) {
    showServerHint();
    return;
  }
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
