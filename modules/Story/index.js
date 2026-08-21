import { playNarration, speakNarration, stopNarration, esc, formatJapaneseCopy, stage, characterLayer, layersMarkup, fillLayer, bookColorLayer, vehicleColorLayer, extractPhotoColor, fillArtworkHoles, recolorVehicleImage, openMissionCamera, completeMissionPhoto, createRepeatableSound } from "../shared/utils.js?v=suki-no-tane-scratchboard-white-20260821";
import { avatarBuddy } from "../shared/avatars.js";
import { localizeText } from "../shared/i18n.js";

// 物語ページとミッションページを、いまのページを含む「1冊にできる範囲」で取り出す。
// ・ end ページの手前で必ず区切る（達成の演出は別画面 COMPLETE が受け持つため）。
// ・ 未達成のミッションページの先は、まだ含めない（そこから先はミッション達成待ち＝
//   本の続きがまだ用意できていない）。写真撮影は対応するミッションページで行い、
//   達成すると次にこの画面を開いたときに、fillFrom によって後続ページの絵に
//   写真が反映された状態で、その先まで含めた新しい本が作られる。
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

function pageMarkup(ctx, page, { index, globalIndex, showFinish }) {
  const img = ctx.repo.assetUrl(page.image);
  const character = ctx.repo.assetUrl(page.character);
  const bookmarked = ctx.session.isPageBookmarked(ctx.session.bookId, page.id, globalIndex);
  const bookmark = `
    <button type="button" class="page-bookmark${bookmarked ? " is-active" : ""}"
      data-bookmark-page data-bookmark-index="${index}" aria-pressed="${bookmarked}"
      aria-label="${bookmarked ? "しおりをはずす" : "しおりに追加"}">${bookmarked ? "★" : "☆"}</button>`;
  const scene = `
    <div class="scene">
      ${fillLayer(ctx, page)}
      <img class="art" src="${img}" alt="" onerror="this.style.opacity=0">
      ${ctx.session.bookId === "book-niji" ? bookColorLayer(ctx, page) : vehicleColorLayer(ctx, page)}
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
        ${bookmark}
        ${scene}
        <p class="lead">${formatJapaneseCopy(page.text)}</p>
        <p class="prompt">${formatJapaneseCopy(page.prompt)}</p>
        ${action}
        ${finishBtn}
      </div>`;
  }
  return `
    <div class="flip-page">
      ${bookmark}
        ${scene}
        <p class="lead">${formatJapaneseCopy(page.text)}</p>
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
      .map((p, i) => pageMarkup(ctx, p, {
        index: i,
        globalIndex: start + i,
        showFinish: i === lastIdx && tailIsEnd && lastPageDone,
      }))
      .join("");
    return stage(`
      <div class="screen reader page--in">
        <button class="back" data-back>‹</button>
        <span class="progress" data-progress>${ctx.session.pageIndex + 1} / ${count}</span>
        <div class="flipbook"><div class="flip-book" data-flipbook>${body}</div></div>
        <button class="page-prev" data-prev aria-label="まえのページ">‹ まえ</button>
        ${avatarBuddy(ctx.session.getAvatar(), "avatar-buddy--reader")}
      </div>`);
  },
  mount(ctx, _params, root) {
    const { pages, start, count } = bookChapter(ctx);
    const offset = ctx.session.pageIndex - start;
    const bookEl = root.querySelector("[data-flipbook]");
    const progressEl = root.querySelector("[data-progress]");
    const playPageAudio = (localIdx) => {
      const page = pages[localIdx];
      const audioUrl = ctx.repo.assetUrl(page.audio);
      if (audioUrl) {
        playNarration(audioUrl);
      } else {
        speakNarration([page.text, page.prompt].filter(Boolean).join(" "));
      }
    };
    // 本を開いた時点で先読みしておき、めくるたびに巻き戻して再生するだけにする
    // （毎回 new Audio() だと取得が間に合わず鳴らないことがあったため）。
    const playPageTurnSound = createRepeatableSound(ctx.repo.assetUrl("assets/page_sound.mp3"));

    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");

    const book = ctx.repo.book(ctx.session.bookId);
    root.querySelectorAll("[data-bookmark-page]").forEach((button) => {
      const localIndex = Number(button.dataset.bookmarkIndex);
      const page = pages[localIndex];
      if (!page) return;
      const sync = () => {
        const active = ctx.session.isPageBookmarked(ctx.session.bookId, page.id, start + localIndex);
        button.classList.toggle("is-active", active);
        button.textContent = active ? "★" : "☆";
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", localizeText(active ? "しおりをはずす" : "しおりに追加"));
      };
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        ctx.session.togglePageBookmark({
          bookId: ctx.session.bookId,
          bookTitle: book?.title || ctx.session.bookId,
          pageId: page.id,
          pageIndex: start + localIndex,
          image: page.image,
          text: page.text,
        });
        sync();
      };
    });

    root.querySelectorAll("[data-shoot]").forEach((btn) => {
      const idx = Number(btn.dataset.shoot);
      const page = pages[idx];
      btn.onclick = () => openMissionCamera(ctx, page, {
        // カメラが起動した場合は、点線ガイドと同じ範囲をそのまま保存する。
        onGuidedCapture: async (dataUrl, guide) => {
          await completeMissionPhoto(ctx, page, dataUrl, { captureWindow: guide.frame });
          ctx.notify?.("しゃしんを 保存したよ！");
          ctx.go("ACHIEVE", { page });
        },
        // 権限・HTTPS・端末非対応などでカメラが起動しない場合だけ、従来の手動調整へ。
        onFallback: (dataUrl) => ctx.go("PREVIEW", { page, dataUrl }),
      });
    });
    root.querySelector("[data-finish]")?.addEventListener("click", () => ctx.advance());

    // 物語もミッションも同じ1冊として読み込む。ミッション未達成でも先のページを
    // 読めるようにし、写真撮影は各ミッションページのボタンから行う。
    const container = bookEl.parentElement;
    const availableWidth = Math.max(360, container?.clientWidth || window.innerWidth);
    const availableHeight = Math.max(520, container?.clientHeight || window.innerHeight);
    const flip = new St.PageFlip(bookEl, {
      width: availableWidth,
      height: availableHeight,
      size: "stretch",
      usePortrait: true,
      minWidth: availableWidth,
      maxWidth: availableWidth,
      minHeight: availableHeight,
      maxHeight: availableHeight,
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
      // 縦長表示時の St.PageFlip 内蔵クリック判定は、左右の向きを誤判定するため使わない。
      disableFlipByClick: true,
    });

    // 縦長表示（スマートフォン幅）では、内蔵のクリック判定が常に「戻る」方向になる
    // ため、ページ中央をタップしても次のページへ進めなかった。スワイプはライブラリに
    // 任せつつ、タップだけ左右で明示的に処理する。
    let touchStartX = null;
    bookEl.addEventListener("touchstart", (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
    }, { passive: true });
    bookEl.addEventListener("touchend", (event) => {
      const endX = event.changedTouches[0]?.clientX ?? null;
      if (touchStartX !== null && endX !== null && Math.abs(endX - touchStartX) > 30) {
        touchStartX = null;
        bookEl.dataset.ignoreTapUntil = String(Date.now() + 450);
        return;
      }
      touchStartX = null;
    }, { passive: true });
    // 前のページへ戻す。St.PageFlip の flipPrev() は、この縦向き表示（usePortrait）では
    // 角を指定してもしなくても何も起きない（実測。次へ進む flipNext は効く）。
    // turnToPrevPage() なら確実に戻れるので、戻るときはこちらを使う。
    // ※めくりアニメーションは付かないが、戻れないよりよい。
    const goPrevPage = () => {
      if (flip.getCurrentPageIndex() > 0) flip.turnToPrevPage();
    };

    bookEl.addEventListener("click", (event) => {
      if (event.target.closest("button, a") || Date.now() < Number(bookEl.dataset.ignoreTapUntil || 0)) return;
      const rect = bookEl.getBoundingClientRect();
      const isNext = event.clientX - rect.left >= rect.width / 2;
      const corner = event.clientY - rect.top < rect.height / 2 ? "top" : "bottom";
      if (isNext && flip.getCurrentPageIndex() < flip.getPageCount() - 1) flip.flipNext(corner);
      if (!isNext) goPrevPage();
    });

    // 「まえ」ボタン。スワイプやタップを知らないこどもでも、確実に前のページへ戻れるようにする。
    // 最初のページでは押せない（押しても何も起きないと迷うので、見た目でも分かるようにする）。
    const prevBtn = root.querySelector("[data-prev]");
    const syncPrevBtn = (localIdx) => { prevBtn.disabled = localIdx <= 0; };
    prevBtn.onclick = goPrevPage;

    // St.PageFlip は初期表示（loadFromHTML直後）にも内部的に "flip" を発火することがあるため、
    // めくり音は "init" が済んだあと＝実際にユーザーがめくった時だけ鳴らす。
    let initialized = false;
    flip.on("init", (e) => { initialized = true; playPageAudio(e.data.page); syncPrevBtn(e.data.page); });
    flip.on("flip", (e) => {
      const localIdx = e.data;
      ctx.session.goTo(start + localIdx);
      progressEl.textContent = `${start + localIdx + 1} / ${count}`;
      if (initialized) playPageTurnSound();
      playPageAudio(localIdx);
      syncPrevBtn(localIdx);
    });

    flip.loadFromHTML(bookEl.querySelectorAll(".flip-page"));
    root.querySelectorAll("[data-book-color-art]").forEach(async (overlay) => {
      const tone = overlay.dataset.bookColorTone || "transparent";
      const region = JSON.parse(overlay.dataset.bookColorRegion);
      const filled = tone === "dark"
        ? await recolorVehicleImage(overlay.dataset.bookColorSource, overlay.dataset.bookColorValue || null, region, "dark")
        : await fillArtworkHoles(overlay.dataset.bookColorSource, overlay.dataset.bookColorPhoto, Number(overlay.dataset.bookColorScale) || 1, region);
      if (filled) {
        overlay.src = filled;
        overlay.style.opacity = "1";
      } else {
        overlay.remove();
      }
    });
    root.querySelectorAll("[data-vehicle-art]").forEach(async (overlay) => {
      let color = overlay.dataset.vehicleColor;
      if (!color && overlay.dataset.vehiclePhoto) {
        // 車体カラー機能を追加する前に完了したタスクにも対応するため、古い写真から色を再抽出する。
        color = await extractPhotoColor(overlay.dataset.vehiclePhoto);
      }
      const region = JSON.parse(overlay.dataset.vehicleRegion);
      const recolored = await recolorVehicleImage(
        overlay.dataset.vehicleSource,
        color,
        region,
        overlay.dataset.vehicleTone,
        overlay.dataset.vehiclePhoto,
      );
      if (recolored) {
        overlay.src = recolored;
        overlay.style.opacity = "1";
      } else {
        overlay.remove();
      }
    });
    currentFlip = flip;
  },
  unmount() {
    currentFlip?.destroy();
    currentFlip = null;
    stopNarration();
  },
};
