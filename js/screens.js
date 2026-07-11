/*
 * screens.js ── プレゼンテーション層
 * ------------------------------------------------------------
 * 画面ごとに { render, mount } を持つ。UIを変えたいときは主にここと style.css。
 * ctx = { repo, session, go, showPage, advance, els } が各画面に渡ってくる。
 *
 * 画面一覧（Flutter版の再現）:
 *   MODE   モード選択（こども / おうちのひと）
 *   PIN    おうちのひとゲート
 *   PARENT 大人レポート（モック）
 *   HOME   こどもホーム（えほん / おもいで）
 *   SELECT 絵本選択
 *   STORY  物語パート
 *   MISSION ミッション提示（撮る / できた）
 *   PREVIEW 撮った写真の確認
 *   ACHIEVE 達成演出
 *   COMPLETE 絵本完了
 *   DIARY  絵本日記
 *   GALLERY 思い出ギャラリー
 */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function playAudio(url) {
  if (!url) return;
  new Audio(url).play().catch(() => {});
}

export const Screens = {
  // ── モード選択 ──────────────────────────────
  MODE: {
    render() {
      return `
        <div class="screen center">
          <h1 class="brand">そとであそぼ！<br>えほん</h1>
          <div class="mode-grid">
            <button class="mode-card mode-card--child" data-go="child">
              <span class="mode-emoji">🧒</span><span>こども</span>
            </button>
            <button class="mode-card mode-card--parent" data-go="parent">
              <span class="mode-emoji">👨‍👩‍👧</span><span>おうちのひと</span>
            </button>
          </div>
        </div>`;
    },
    mount(ctx, _p, root) {
      root.querySelector('[data-go="child"]').onclick = () => {
        ctx.session.setMode("child"); ctx.go("HOME");
      };
      root.querySelector('[data-go="parent"]').onclick = () => {
        ctx.session.setMode("parent"); ctx.go("PIN");
      };
    },
  },

  // ── おうちのひとゲート ───────────────────────
  PIN: {
    render() {
      const keys = [1,2,3,4,5,6,7,8,9,"",0,"←"];
      return `
        <div class="screen center">
          <button class="back" data-back>‹ もどる</button>
          <p class="pin-label">あんしょうばんごうを いれてね</p>
          <div class="pin-dots" id="pin-dots"></div>
          <div class="keypad">
            ${keys.map((k) => k === ""
              ? `<span></span>`
              : `<button class="key" data-key="${k}">${k}</button>`).join("")}
          </div>
          <p class="pin-hint">（プロト用: ${"0000"}）</p>
        </div>`;
    },
    mount(ctx, _p, root) {
      let buf = "";
      const dots = root.querySelector("#pin-dots");
      const draw = () => {
        dots.textContent = "● ".repeat(buf.length) + "○ ".repeat(4 - buf.length);
      };
      draw();
      root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
      root.querySelectorAll("[data-key]").forEach((b) => {
        b.onclick = () => {
          const k = b.dataset.key;
          if (k === "←") buf = buf.slice(0, -1);
          else if (buf.length < 4) buf += k;
          draw();
          if (buf.length === 4) {
            if (ctx.session.checkPin(buf)) ctx.go("PARENT");
            else { dots.classList.add("shake"); setTimeout(() => { buf = ""; draw(); dots.classList.remove("shake"); }, 500); }
          }
        };
      });
    },
  },

  // ── 大人レポート（モック）────────────────────
  PARENT: {
    render(ctx) {
      const s = ctx.session;
      const week = s.activityDaysThisWeek();
      const total = s.activityDayCount();
      const log = s.memoryLog;
      const logHtml = log.length
        ? log.map((m) => `
            <li class="log-row">
              <span class="log-date">${esc(m.date)}</span>
              <span class="log-book">${esc(m.bookTitle)}</span>
              <span class="log-count">${m.count}こ たっせい</span>
            </li>`).join("")
        : `<li class="empty">まだ きろくが ありません。「こども」で あそんでみてね。</li>`;
      return `
        <div class="screen parent">
          <button class="back" data-back>‹ もどる</button>
          <h2 class="parent-title">おうちのひと レポート</h2>
          <div class="stat-row">
            <div class="stat"><b>${week}</b><span>今週 そとで あそんだ日</span></div>
            <div class="stat"><b>${total}</b><span>これまで あそんだ日</span></div>
          </div>
          <p class="note">※ ストリークは「外で活動した日数」に付き、途切れても没収しません（健全設計）。</p>
          <h3 class="log-title">きろく</h3>
          <ul class="log">${logHtml}</ul>
          <button class="ghost" data-reset>デモ用: きろくをリセット</button>
        </div>`;
    },
    mount(ctx, _p, root) {
      root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
      root.querySelector("[data-reset]").onclick = () => { ctx.session.reset(); ctx.go("PARENT"); };
    },
  },

  // ── こどもホーム ───────────────────────────
  HOME: {
    render() {
      return `
        <div class="screen center">
          <button class="back" data-back>‹</button>
          <h1 class="brand">なにして あそぶ？</h1>
          <div class="mode-grid">
            <button class="mode-card mode-card--child" data-go="SELECT">
              <span class="mode-emoji">📖</span><span>えほん</span>
            </button>
            <button class="mode-card mode-card--memory" data-go="GALLERY">
              <span class="mode-emoji">🌟</span><span>おもいで</span>
            </button>
          </div>
        </div>`;
    },
    mount(ctx, _p, root) {
      root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
      root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => ctx.go(b.dataset.go));
    },
  },

  // ── 絵本選択 ──────────────────────────────
  SELECT: {
    render(ctx) {
      const cards = ctx.repo.books.map((b) => `
        <button class="book-card" data-book="${b.id}">
          <img src="${ctx.repo.assetUrl(b.cover)}" alt="">
          <span class="book-title">${esc(b.title)}</span>
          <span class="book-age">${esc(b.ageRange)}さい</span>
        </button>`).join("");
      return `
        <div class="screen">
          <button class="back" data-back>‹ もどる</button>
          <h2 class="section-title">どの えほんを よむ？</h2>
          <div class="book-grid">${cards}</div>
        </div>`;
    },
    mount(ctx, _p, root) {
      root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
      root.querySelectorAll("[data-book]").forEach((b) => {
        b.onclick = () => { ctx.session.startBook(b.dataset.book); ctx.showPage(); };
      });
    },
  },

  // ── 物語パート ─────────────────────────────
  STORY: {
    render(ctx, { page }) {
      const img = ctx.repo.assetUrl(page.image);
      const count = ctx.repo.pageCount(ctx.session.bookId);
      return `
        <div class="screen reader page--in">
          <button class="back" data-back>‹</button>
          <span class="progress">${ctx.session.pageIndex + 1} / ${count}</span>
          <div class="scene"><img src="${img}" alt="" onerror="this.style.opacity=0"></div>
          <p class="lead">${esc(page.text)}</p>
          <button class="big-next" data-next>つぎへ ›</button>
        </div>`;
    },
    mount(ctx, { page }, root) {
      playAudio(ctx.repo.assetUrl(page.audio));
      root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
      root.querySelector("[data-next]").onclick = () => ctx.advance();
    },
  },

  // ── ミッション提示 ─────────────────────────
  MISSION: {
    render(ctx, { page }) {
      const img = ctx.repo.assetUrl(page.image);
      return `
        <div class="screen reader page--in">
          <button class="back" data-back>‹</button>
          <div class="scene"><img src="${img}" alt="" onerror="this.style.opacity=0"></div>
          <p class="lead">${esc(page.text)}</p>
          <p class="prompt">${esc(page.prompt)}</p>
          <button class="mission-shoot" data-shoot>📷 ${esc(page.doneLabel || "とってみよう！")}</button>
          <button class="tapdone" data-tap>できた！（しゃしんなし）</button>
        </div>`;
    },
    mount(ctx, { page }, root) {
      playAudio(ctx.repo.assetUrl(page.audio));
      root.querySelector("[data-back]").onclick = () => ctx.go("HOME");

      const input = ctx.els.camera;
      const openCamera = () => {
        input.value = "";
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => ctx.go("PREVIEW", { page, dataUrl: reader.result });
          reader.readAsDataURL(file);
        };
        input.click();
      };
      root.querySelector("[data-shoot]").onclick = openCamera;

      // カメラを使わない / 使えないときのフォールバック（TAPDONE）
      root.querySelector("[data-tap]").onclick = () => {
        ctx.session.completeMission({
          missionId: page.id, missionText: page.prompt,
          caption: page.diaryCaption || page.prompt, photoUrl: null,
        });
        ctx.go("ACHIEVE", { page });
      };
    },
  },

  // ── プレビュー（これにする / もう一回）─────────
  PREVIEW: {
    render(_ctx, { dataUrl }) {
      return `
        <div class="screen reader">
          <p class="lead">これで いい？</p>
          <div class="scene photo"><img src="${dataUrl}" alt="とったしゃしん"></div>
          <div class="preview-actions">
            <button class="retry" data-retry>🔄 もういちど</button>
            <button class="mission-shoot" data-keep>✓ これにする</button>
          </div>
        </div>`;
    },
    mount(ctx, { page, dataUrl }, root) {
      root.querySelector("[data-keep]").onclick = () => {
        ctx.session.completeMission({
          missionId: page.id, missionText: page.prompt,
          caption: page.diaryCaption || page.prompt, photoUrl: dataUrl,
        });
        ctx.go("ACHIEVE", { page });
      };
      root.querySelector("[data-retry]").onclick = () => {
        const input = ctx.els.camera;
        input.value = "";
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => ctx.go("PREVIEW", { page, dataUrl: reader.result });
          reader.readAsDataURL(file);
        };
        input.click();
      };
    },
  },

  // ── 達成演出（1〜2秒で物語に戻る）──────────────
  ACHIEVE: {
    render(ctx) {
      const sticker = ctx.repo.assetUrl("assets/sticker-star.svg");
      return `
        <div class="screen center achieve">
          <div class="sparkle">✨</div>
          <img class="sticker" src="${sticker}" alt="">
          <p class="lead">やったね！</p>
        </div>`;
    },
    mount(ctx) {
      setTimeout(() => ctx.advance(), 1600);
    },
  },

  // ── 絵本完了 → 日記生成 ─────────────────────
  COMPLETE: {
    render(_ctx, { page }) {
      return `
        <div class="screen center achieve">
          <div class="sparkle">🎉</div>
          <p class="lead">1さつ よめたね！</p>
          <p class="sub">${esc(page?.text || "")}</p>
        </div>`;
    },
    mount(ctx) {
      const book = ctx.repo.book(ctx.session.bookId);
      const memory = ctx.session.buildMemory(book);
      setTimeout(() => ctx.go("DIARY", { memory, fromPlay: true }), 1500);
    },
  },

  // ── 絵本日記 ──────────────────────────────
  DIARY: {
    render(_ctx, { memory, fromPlay }) {
      const entries = memory.entries.map((e) => `
        <div class="diary-entry">
          ${e.photoUrl
            ? `<img src="${e.photoUrl}" alt="">`
            : `<div class="no-photo">📷 しゃしんなし</div>`}
          <p class="diary-caption">${esc(e.caption)}</p>
        </div>`).join("") || `<p class="empty">きろくが ありません</p>`;
      return `
        <div class="screen diary">
          <div class="diary-cover">
            <span class="diary-date">${esc(memory.date)}</span>
            <h2>${esc(memory.bookTitle)} の きろく</h2>
          </div>
          ${entries}
          <button class="big-next" data-close>${fromPlay ? "とじる" : "‹ もどる"}</button>
        </div>`;
    },
    mount(ctx, { fromPlay }, root) {
      root.querySelector("[data-close]").onclick = () => ctx.go("GALLERY");
    },
  },

  // ── 思い出ギャラリー ──────────────────────
  GALLERY: {
    render(ctx) {
      const list = ctx.session.memories;
      const cards = list.length
        ? list.map((m) => {
            const cover = m.entries.find((e) => e.photoUrl)?.photoUrl;
            return `
              <button class="memory-card" data-mem="${m.id}">
                ${cover ? `<img src="${cover}" alt="">` : `<div class="no-photo">🌟</div>`}
                <span class="book-title">${esc(m.bookTitle)}</span>
                <span class="book-age">${esc(m.date)}</span>
              </button>`;
          }).join("")
        : `<p class="empty">まだ おもいでが ありません。<br>えほんを よんで つくろう！</p>`;
      return `
        <div class="screen">
          <button class="back" data-back>‹ もどる</button>
          <h2 class="section-title">おもいで</h2>
          <div class="book-grid">${cards}</div>
        </div>`;
    },
    mount(ctx, _p, root) {
      root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
      root.querySelectorAll("[data-mem]").forEach((b) => {
        b.onclick = () => {
          const memory = ctx.session.memories.find((m) => m.id === b.dataset.mem);
          if (memory) ctx.go("DIARY", { memory, fromPlay: false });
        };
      });
    },
  },
};
