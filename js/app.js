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
    await repo.load();
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
