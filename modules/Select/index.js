import { esc } from "../shared/utils.js";

const BOOKS_PER_SHELF = 4; // 1つの棚 = 2段 x 2冊
const SWIPE_THRESHOLD = 40; // これ以上ドラッグしたらページを切り替える

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function bookCard(ctx, b) {
  return `
    <button class="book-card" data-book="${b.id}">
      <img src="${ctx.repo.assetUrl(b.cover)}" alt="" draggable="false">
      <span class="book-title">${esc(b.title)}</span>
      <span class="book-age">${esc(b.ageRange)}さい</span>
    </button>`;
}

// 本を2冊ずつ棚の段に分ける
function shelfRows(ctx, books) {
  const rows = chunk(books, 2);
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
        <div class="shelf-top"><span class="shelf-emblem">📖</span></div>
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
      <div class="screen">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="section-title">どの えほんを よむ？</h2>
        <div class="shelf-pager" data-pager>
          <div class="shelf-track" data-track>${pages.map((p) => shelfPage(ctx, p)).join("")}</div>
        </div>
        ${pages.length > 1 ? `<div class="shelf-dots" data-dots>${dots}</div>` : ""}
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");

    root.querySelectorAll("[data-book]").forEach((b) => {
      b.onclick = () => { ctx.session.startBook(b.dataset.book); ctx.showPage(); };
    });

    const pager = root.querySelector("[data-pager]");
    const track = root.querySelector("[data-track]");
    const dots = [...root.querySelectorAll("[data-dot]")];
    const pageCount = track.children.length;
    if (pageCount === 0) return;
    let page = 0;

    function update() {
      track.style.transform = `translateX(-${page * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === page));
    }
    function goTo(i) {
      page = Math.max(0, Math.min(pageCount - 1, i));
      update();
    }
    dots.forEach((d, i) => d.onclick = () => goTo(i));
    update();

    if (pageCount < 2) return;

    let startX = 0, dx = 0, dragging = false, suppressClick = false;
    pager.style.touchAction = "pan-y";
    // スワイプの直後に発火する click で本を開いてしまわないようガード
    pager.addEventListener("click", (e) => {
      if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
    }, true);
    pager.addEventListener("pointerdown", (e) => {
      dragging = true; dx = 0; startX = e.clientX;
      // マウスでドラッグしても最後まで pointermove/up を拾えるようにする
      pager.setPointerCapture?.(e.pointerId);
    });
    pager.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (e && typeof e.clientX === "number") dx = e.clientX - startX;
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        suppressClick = true;
        // 右にスワイプ → つぎの棚、左にスワイプ → まえの棚
        goTo(dx > 0 ? page + 1 : page - 1);
      }
    }
    pager.addEventListener("pointerup", endDrag);
    pager.addEventListener("pointercancel", endDrag);
    pager.addEventListener("pointerleave", endDrag);

    // MacBookなどトラックパッドの2本指スワイプは pointer ではなく wheel イベントで来る
    let wheelAccum = 0, wheelLocked = false, wheelResetTimer = null;
    pager.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // たて方向は無視
      e.preventDefault();
      if (wheelLocked) return;
      wheelAccum += e.deltaX;
      clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(() => { wheelAccum = 0; }, 200);
      if (Math.abs(wheelAccum) > SWIPE_THRESHOLD) {
        wheelLocked = true;
        // 指を右へ（ナチュラルスクロールでは deltaX が負になる）→ つぎの棚
        goTo(wheelAccum < 0 ? page + 1 : page - 1);
        wheelAccum = 0;
        setTimeout(() => { wheelLocked = false; }, 450);
      }
    }, { passive: false });
  },
};
