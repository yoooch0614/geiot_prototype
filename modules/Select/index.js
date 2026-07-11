import { esc } from "../shared/utils.js";

const BOOKS_PER_SHELF = 4; // 1つの棚 = 2段 x 2冊

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

function bookCard(ctx, b) {
  if (!b) {
    return `
      <div class="book-card book-card--ghost" aria-hidden="true">
        <div class="book-cover book-cover--ghost"><span>✨</span></div>
        <span class="book-title book-title--ghost">おたのしみに</span>
      </div>`;
  }
  return `
    <button class="book-card" data-book="${b.id}">
      <div class="book-cover">
        <img src="${ctx.repo.assetUrl(b.cover)}" alt="" draggable="false">
        <span class="book-age-badge">${esc(b.ageRange)}さい</span>
      </div>
      <span class="book-title">${esc(b.title)}</span>
    </button>`;
}

// 本を2冊ずつ棚の段に分ける
function shelfRows(ctx, books) {
  const rows = chunk(padPage(books), 2);
  return rows
    .map((row, i) => `
      <div class="shelf-row">${row.map((b) => bookCard(ctx, b)).join("")}</div>
      ${i < rows.length - 1 ? '<div class="shelf-board"></div>' : ""}`)
    .join("");
}

function shelfPage(ctx, books) {
  return `
    <div class="shelf-page">
      <div class="shelf">
        <div class="shelf-awning"><span class="shelf-emblem">📖</span></div>
        <span class="shelf-deco shelf-deco--plant" aria-hidden="true">🌱</span>
        <span class="shelf-deco shelf-deco--books" aria-hidden="true">📚</span>
        <div class="shelf-body">${shelfRows(ctx, books)}</div>
        <div class="shelf-base"></div>
      </div>
    </div>`;
}

export const SelectScreen = {
  render(ctx) {
    const pages = chunk(ctx.repo.books, BOOKS_PER_SHELF);
    const dots = pages
      .map((_, i) => `<button class="shelf-dot" data-dot="${i}" aria-label="${i + 1}ばんめの たな"></button>`)
      .join("");
    return `
      <div class="screen screen--select">
        <div class="select-sky" aria-hidden="true">
          <span style="top:5%;left:7%">✨</span>
          <span style="top:11%;right:9%;animation-delay:.9s">⭐</span>
          <span style="top:34%;left:3%;animation-delay:1.6s">🌟</span>
          <span style="top:28%;right:4%;animation-delay:2.2s">🦋</span>
          <span style="bottom:16%;left:9%;animation-delay:1.2s">✨</span>
          <span style="bottom:12%;right:11%;animation-delay:.5s">⭐</span>
        </div>
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title select-title">どの えほんを よむ？</h2>
        <div class="shelf-pager" data-pager>${pages.map((p) => shelfPage(ctx, p)).join("")}</div>
        ${pages.length > 1 ? `<div class="shelf-dots" data-dots>${dots}</div>` : ""}
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");
    root.querySelectorAll("[data-book]").forEach((b) => {
      b.onclick = () => { ctx.session.startBook(b.dataset.book); ctx.showPage(); };
    });

    const pager = root.querySelector("[data-pager]");
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
