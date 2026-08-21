import { esc } from "../shared/utils.js";
import { openGuide } from "../shared/guide.js";
import { t } from "../shared/i18n.js";

const BOOKS_PER_SHELF = 4; // 1つの棚 = 2段 x 2冊

const PARENT_GUIDE_STEPS = [
  {
    number: "1",
    image: "assets/cover-nono.png",
    type: "tap",
    target: "ほん",
    title: "おもいでを ひらく",
    action: "本棚の ほんを タッチ",
    text: "かんせいした えほんと しゃしんを みられます",
    focus: "[data-book]",
  },
  {
    number: "2",
    image: "assets/scene-cheer.svg",
    type: "tap",
    target: "活動履歴",
    title: "活動履歴を みる",
    action: "「活動履歴」を タッチ",
    text: "あそんだ日と ミッションの数を みられます",
    focus: '[data-go="PARENT"]',
  },
  {
    number: "3",
    image: "assets/scene-meadow.svg",
    type: "tap",
    target: "分析",
    title: "特性分析を みる",
    action: "「子どもの特性分析」を タッチ",
    text: "こどもの あそびの ようすを みられます",
    focus: '[data-go="ANALYSIS"]',
  },
];

// 読みかけの本を選んだとき、「つづきから」か「はじめから」かをたずねる。
// 黙って続きから始めると、読み直したいのに戻れない。逆に黙って最初からにすると、
// せっかく撮った写真が消える。どちらも本人にしか決められないので、必ず聞く。
// （ホームの「きょうのミッション」から本を開くときも同じ理由で使う）
export function askResume(ctx, bookId, root) {
  const title = ctx.repo.book(bookId)?.title ?? "";
  const dialog = document.createElement("div");
  dialog.className = "resume-ask";
  dialog.innerHTML = `
    <div class="resume-card">
      <p class="resume-title">${esc(title)}</p>
      <p class="resume-sub">よみかけが あるよ。<br>どうする？</p>
      <div class="resume-actions">
        <button class="big-next" data-resume>つづきから</button>
        <button class="retry" data-restart>はじめから</button>
      </div>
      <p class="resume-note">「はじめから」に すると、この えほんで とった しゃしんは きえます</p>
      <button class="tapdone" data-cancel>やめる</button>
    </div>`;
  root.appendChild(dialog);

  const start = (restart) => {
    ctx.session.startBook(bookId, { restart });
    ctx.showPage();
  };
  dialog.querySelector("[data-resume]").onclick = () => start(false);
  dialog.querySelector("[data-restart]").onclick = () => start(true);
  dialog.querySelector("[data-cancel]").onclick = () => dialog.remove();
  // 外側（黒い部分）をタップしても閉じる
  dialog.onclick = (event) => { if (event.target === dialog) dialog.remove(); };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 最後の棚が半端なとき、空きマスに「おたのしみに」のゴーストを詰める
function padPage(books) {
  const padded = books.slice();
  while (padded.length < BOOKS_PER_SHELF) padded.push(null);
  return padded;
}

function bookCard(ctx, b, { labelType = "age" } = {}) {
  if (!b) {
    return `
      <div class="book-card book-card--ghost" aria-hidden="true">
        <div class="book-cover book-cover--ghost"></div>
        <span class="book-title book-title--ghost">おたのしみに</span>
      </div>`;
  }
  const cover = ctx.repo.book(b.id)?.cover ?? b.cover;
  const age = ctx.repo.book(b.id)?.ageRange ?? b.ageRange;
  const title = ctx.repo.book(b.id)?.title ?? b.title;
  const badgeText = labelType === "date"
    ? esc(b.createdAt || "")
    : `${esc(age)}さい`;
  // 読みかけの本には「つづきから」バッジを出す（こどもの本棚のみ）
  const resume = labelType === "age" && ctx.session.hasResume?.(b.id);
  return `
    <button class="book-card" data-book="${b.id}">
      <div class="book-cover">
        <img src="${ctx.repo.assetUrl(cover)}" alt="" draggable="false">
        <span class="book-age-badge">${badgeText}</span>
        ${resume ? `<span class="book-resume-badge">つづきから</span>` : ""}
      </div>
      <span class="book-title">${esc(title)}</span>
    </button>`;
}

// 本を2冊ずつ棚の段に分ける
function shelfRows(ctx, books, labelType) {
  const rows = chunk(padPage(books), 2);
  return rows
    .map((row, i) => `
      <div class="shelf-row">${row.map((b) => bookCard(ctx, b, { labelType })).join("")}</div>
      ${i < rows.length - 1 ? '<div class="shelf-board"></div>' : ""}`)
    .join("");
}

function shelfPage(ctx, books, labelType) {
  return `
    <div class="shelf-page">
      <div class="shelf">
        <div class="shelf-awning"><span class="shelf-emblem" aria-hidden="true"></span></div>
        <span class="shelf-deco shelf-deco--plant" aria-hidden="true"></span>
        <span class="shelf-deco shelf-deco--books" aria-hidden="true"></span>
        <div class="shelf-body">${shelfRows(ctx, books, labelType)}</div>
        <div class="shelf-base"></div>
      </div>
    </div>`;
}

function parentBooks(ctx) {
  return ctx.session.memories
    .map((memory) => ({
      id: memory.bookId,
      title: memory.bookTitle,
      createdAt: memory.date,
      ageRange: ctx.repo.book(memory.bookId)?.ageRange ?? "",
      cover: ctx.repo.book(memory.bookId)?.cover ?? null,
    }))
    .filter((book) => book.id);
}

export const SelectScreen = {
  render(ctx, params = {}) {
    const isMemoryView = params.view === "memories";
    const isParent = ctx.session.mode === "parent" || isMemoryView;
    const books = isParent ? parentBooks(ctx) : ctx.repo.books;
    const hasContentError = !isParent && (ctx.repo.errors?.length ?? 0) > 0;
    const pages = books.length ? chunk(books, BOOKS_PER_SHELF) : [];
    const dots = pages
      .map((_, i) => `<button class="shelf-dot" data-dot="${i}" aria-label="${i + 1}ばんめの たな"></button>`)
      .join("");
    const parentActions = isParent && !isMemoryView ? `
      <div class="select-toolbar">
        <button class="select-action" data-go="PARENT">活動履歴</button>
        <button class="select-action" data-go="ANALYSIS">子どもの特性分析</button>
        <button class="select-action" data-parent-guide>操作方法</button>
      </div>` : "";
    const emptyState = books.length === 0 ? `
      <div class="select-empty">
        ${hasContentError
          ? "<p>えほんを よみこめませんでした。</p><p>もういちど ためしてみてね。</p>"
          : isParent
            ? "<p>まだ こどもが つくった えほんは ありません。</p><p>えほんを よんで できたら、ここに すぐ あらわれます。</p>"
            : "<p>まだ えほんが ありません。</p><p>読み込みが おわるまで まってみてね。</p>"}
        ${hasContentError ? '<button class="select-action" type="button" data-retry-content>もういちど</button>' : ""}
      </div>` : "";
    const contentWarning = hasContentError && books.length > 0 ? `
      <div class="select-error" role="alert">
        <span>一部の えほんを よみこめませんでした。</span>
        <button class="select-action" type="button" data-retry-content>もういちど</button>
      </div>` : "";
    const badgeType = isMemoryView ? "date" : "age";
    return `
      <div class="screen screen--select${isParent ? " screen--select--memory" : ""}">
        <div class="select-sky" aria-hidden="true">
          <span class="sky-shape sky-shape--sparkle" style="top:5%;left:7%"></span>
          <span class="sky-shape sky-shape--star" style="top:11%;right:9%;animation-delay:.9s"></span>
          <span class="sky-shape sky-shape--burst" style="top:34%;left:3%;animation-delay:1.6s"></span>
          <span class="sky-shape sky-shape--butterfly" style="top:28%;right:4%;animation-delay:2.2s"></span>
          <span class="sky-shape sky-shape--sparkle" style="bottom:16%;left:9%;animation-delay:1.2s"></span>
          <span class="sky-shape sky-shape--star" style="bottom:12%;right:11%;animation-delay:.5s"></span>
        </div>
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title select-title">${isParent ? "おもいで" : "どの えほんを よむ？"}</h2>
        ${parentActions}
        ${contentWarning}
        ${emptyState || `<div class="shelf-pager" data-pager>${pages.map((p) => shelfPage(ctx, p, badgeType)).join("")}</div>${pages.length > 1 ? `<div class="shelf-dots" data-dots>${dots}</div>` : ""}`}
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go(ctx.session.mode === "parent" ? "MODE" : "HOME");
    root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => ctx.go(b.dataset.go));
    root.querySelector("[data-retry-content]")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = t("select.loading");
      try {
        await ctx.repo.load();
        ctx.go("SELECT", _p);
      } catch (_) {
        button.disabled = false;
        button.textContent = t("common.retry");
        ctx.notify?.("読み込みに しっぱいしました", "error");
      }
    });
    const showParentGuide = () => openGuide(ctx, root, {
      steps: PARENT_GUIDE_STEPS,
      kicker: "おうちのひとへ",
      title: "操作方法",
      finalLabel: "わかった！",
      onComplete: () => ctx.session.markParentGuideSeen(),
    });
    root.querySelector("[data-parent-guide]")?.addEventListener("click", showParentGuide);
    if (ctx.session.mode === "parent" && !_p?.view && !ctx.session.hasSeenParentGuide()) showParentGuide();
    root.querySelectorAll("[data-book]").forEach((b) => {
      b.onclick = () => {
        const memory = ctx.session.memories.find((m) => m.bookId === b.dataset.book);
        const bookId = b.dataset.book;
        if ((ctx.session.mode === "parent" || _p?.view === "memories") && memory) {
          ctx.go("DIARY", { memory, fromPlay: false, view: _p?.view });
        } else if (ctx.session.hasResume(bookId)) {
          askResume(ctx, bookId, root);   // 読みかけがある本は、つづきか最初かをたずねる
        } else {
          ctx.session.startBook(bookId);
          ctx.showPage();
        }
      };
    });

    const pager = root.querySelector("[data-pager]");
    if (!pager) return;
    const pageEls = [...root.querySelectorAll(".shelf-page")];
    const dots = [...root.querySelectorAll("[data-dot]")];
    if (pageEls.length === 0) return;

    function currentIndex() {
      const center = pager.getBoundingClientRect().left + pager.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      pageEls.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - center);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    }
    function updateDots() {
      const i = currentIndex();
      dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
    }
    dots.forEach((d, i) => {
      d.onclick = () => pageEls[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
    updateDots();

    if (pageEls.length < 2) return;

    let scrollTimer = null;
    pager.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(updateDots, 80);
    }, { passive: true });

    // タッチ/トラックパッドは標準のスクロールに任せる。マウスだけ横スクロールの手段がないのでドラッグを足す
    const DRAG_THRESHOLD = 40;
    let startX = 0, startScroll = 0, startIndex = 0, dragging = false, moved = false;
    pager.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragging = true; moved = false;
      startX = e.clientX; startScroll = pager.scrollLeft; startIndex = currentIndex();
      // ここで setPointerCapture してはいけない：キャプチャすると click が
      // 本のボタンではなく pager に配送され、本が開けなくなる
    });
    pager.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      // しきい値未満のブレはクリック扱いのまま。超えて初めてドラッグとみなし、
      // そこからはみ出してもいいようにポインタをキャプチャする
      if (!moved && Math.abs(dx) > DRAG_THRESHOLD) {
        moved = true;
        try { pager.setPointerCapture(e.pointerId); } catch (_) {}
      }
      if (moved) pager.scrollLeft = startScroll - dx;
    });
    function endMouseDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      const dx = e && typeof e.clientX === "number" ? e.clientX - startX : 0;
      // カーソルを左へドラッグ＝コンテンツが左へついてくる＝つぎの棚（右へドラッグで前の棚）
      let target = startIndex;
      if (dx < -DRAG_THRESHOLD) target = startIndex + 1;
      else if (dx > DRAG_THRESHOLD) target = startIndex - 1;
      target = Math.max(0, Math.min(pageEls.length - 1, target));
      pageEls[target].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
    pager.addEventListener("pointerup", endMouseDrag);
    pager.addEventListener("pointercancel", endMouseDrag);
    // ドラッグの直後に発火する click で本を開いてしまわないようガード
    pager.addEventListener("click", (e) => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  },
};
