import { playAudio, esc, stage, characterLayer, layersMarkup, fillLayer, openCamera, createRepeatableSound } from "../shared/utils.js";

// 物語ページとミッションページを、いまのページを含む「1冊にできる範囲」で取り出す。
// ・ end ページの手前で必ず区切る（達成の演出は別画面 COMPLETE が受け持つため）。
// ・ 未達成のミッションページの先は、まだ含めない（そこから先はミッション達成待ち＝
//   本の続きがまだ用意できていない）。達成すると、次にこの画面を開いたときに
//   その先まで含めた新しい本が作られる。
function bookChapter(ctx) {
  const bookId = ctx.session.bookId;
  const count = ctx.repo.pageCount(bookId);
  const all = Array.from({ length: count }, (_, i) => ctx.repo.pageAt(bookId, i));
  const canPassThrough = (page) => page.type !== "mission" || ctx.session.isMissionDone(page.id);

  let start = ctx.session.pageIndex;
  let end = ctx.session.pageIndex;
  while (start > 0 && all[start - 1].type !== "end") start--;
  while (end < count - 1 && all[end + 1].type !== "end" && canPassThrough(all[end])) end++;
  return { pages: all.slice(start, end + 1), start, count, all };
}

function pageMarkup(ctx, page, { index, showFinish }) {
  const img = ctx.repo.assetUrl(page.image);
  const character = ctx.repo.assetUrl(page.character);
  const scene = `
    <div class="scene">
      ${fillLayer(ctx, page)}
      <img class="art" src="${img}" alt="" onerror="this.style.opacity=0">
      ${characterLayer(character)}
      ${layersMarkup(ctx, page.layers)}
    </div>`;
  const finishBtn = showFinish ? `<button class="big-next" data-finish>つぎへ ›</button>` : "";

  if (page.type === "mission") {
    const action = ctx.session.isMissionDone(page.id)
      ? `<p class="tapdone">✓ できたよ！</p>`
      : `<button class="mission-shoot" data-shoot="${index}">${esc(page.doneLabel || "とってみよう！")}</button>`;
    return `
      <div class="flip-page">
        ${scene}
        <p class="lead">${esc(page.text)}</p>
        <p class="prompt">${esc(page.prompt)}</p>
        ${action}
        ${finishBtn}
      </div>`;
  }
  return `
    <div class="flip-page">
      ${scene}
      <p class="lead">${esc(page.text)}</p>
      ${finishBtn}
    </div>`;
}

// mount() の外（＝画面をまたいで）から destroy() を呼べるように、いまの本をここに持っておく。
let currentFlip = null;

export const StoryScreen = {
  render(ctx) {
    const { pages, start, count, all } = bookChapter(ctx);
    const tailIsEnd = all[start + pages.length]?.type === "end";
    const lastIdx = pages.length - 1;
    const lastPage = pages[lastIdx];
    const lastPageDone = lastPage.type !== "mission" || ctx.session.isMissionDone(lastPage.id);
    const body = pages
      .map((p, i) => pageMarkup(ctx, p, { index: i, showFinish: i === lastIdx && tailIsEnd && lastPageDone }))
      .join("");
    return stage(`
      <div class="screen reader page--in">
        <button class="back" data-back>‹</button>
        <span class="progress" data-progress>${ctx.session.pageIndex + 1} / ${count}</span>
        <div class="flipbook"><div class="flip-book" data-flipbook>${body}</div></div>
      </div>`);
  },
  mount(ctx, _params, root) {
    const { pages, start, count } = bookChapter(ctx);
    const offset = ctx.session.pageIndex - start;
    const bookEl = root.querySelector("[data-flipbook]");
    const progressEl = root.querySelector("[data-progress]");
    const playPageAudio = (localIdx) => playAudio(ctx.repo.assetUrl(pages[localIdx].audio));
    // 本を開いた時点で先読みしておき、めくるたびに巻き戻して再生するだけにする
    // （毎回 new Audio() だと取得が間に合わず鳴らないことがあったため）。
    const playPageTurnSound = createRepeatableSound(ctx.repo.assetUrl("assets/page_sound.mp3"));

    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");

    root.querySelectorAll("[data-shoot]").forEach((btn) => {
      const idx = Number(btn.dataset.shoot);
      // 写真はプレビューで位置を決めたあと、確定時に背景と合成する。
      btn.onclick = () => openCamera(ctx, (dataUrl) => {
        const page = pages[idx];
        ctx.go("PREVIEW", { page, dataUrl });
      });
    });
    root.querySelector("[data-finish]")?.addEventListener("click", () => ctx.advance());

    // 物語もミッションも同じ1冊として読み込む。まだ達成していないミッションの先は
    // 本に含まれていないので、そこから先はスワイプでもめくれない
    // （＝ミッションを済ませないと物語が続かない）。
    const flip = new St.PageFlip(bookEl, {
      width: 380, height: 560,
      size: "stretch",
      minWidth: 240, maxWidth: 460, minHeight: 340, maxHeight: 760,
      startPage: offset,
      showCover: false,
      maxShadowOpacity: 0.3,
      // 途中で指を離しても、残りの角度ぶん律儀に長く再生せず早めにめくり切るための短さ
      // （St.PageFlip は「残り角度 ÷ 全体 × flippingTime」で自動めくりの時間を決めるため、
      // 値そのものを小さくすると早い段階で離してもすぐにめくれる）。
      flippingTime: 300,
      useMouseEvents: true,
      swipeDistance: 30,
      mobileScrollSupport: true,
      // 角をねらってつままなくても、ページのどこからでもスワイプ／タップでめくれるようにする
      // （子ども向けなので、角だけに限定すると難しすぎる）。
      disableFlipByClick: false,
    });

    // St.PageFlip は初期表示（loadFromHTML直後）にも内部的に "flip" を発火することがあるため、
    // めくり音は "init" が済んだあと＝実際にユーザーがめくった時だけ鳴らす。
    let initialized = false;
    flip.on("init", (e) => { initialized = true; playPageAudio(e.data.page); });
    flip.on("flip", (e) => {
      const localIdx = e.data;
      ctx.session.goTo(start + localIdx);
      progressEl.textContent = `${start + localIdx + 1} / ${count}`;
      if (initialized) playPageTurnSound();
      playPageAudio(localIdx);
    });

    flip.loadFromHTML(bookEl.querySelectorAll(".flip-page"));
    currentFlip = flip;
  },
  unmount() {
    currentFlip?.destroy();
    currentFlip = null;
  },
};
