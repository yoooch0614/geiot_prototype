import { stage, composeMissionPhoto, extractPhotoColor } from "../shared/utils.js?v=photo-fill-switch-20260821";
import { t } from "../shared/i18n.js";

const EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function modeMarkup() {
  return `
    <div class="photo-mode" data-photo-mode>
      <p class="photo-mode-title">白いところの つかいかた</p>
      <label class="photo-mode-switch">
        <span class="photo-mode-side">写真で いっぱい</span>
        <input type="checkbox" data-convert aria-label="白い部分を透明にする">
        <span class="photo-mode-slider" aria-hidden="true"></span>
        <span class="photo-mode-side">白は 色なし</span>
      </label>
      <p class="convert-hint" data-convert-hint>左：白い部分も写真として残す ／ 右：白い部分は透明にする</p>
    </div>`;
}

export const PreviewScreen = {
  render(ctx, { page, dataUrl, guided = false }) {
    const backgroundUrl = ctx.repo.assetUrl(page.image);
    const resultMarkup = guided
      ? `
        <div class="scene photo-result" data-result-stage>
          <img class="photo-result-image" data-result-preview src="${EMPTY_IMAGE}" alt="しゃしんの しあがり" hidden>
          <p class="photo-result-status" data-result-status>しあがりを つくっているよ…</p>
        </div>
        <p class="guided-result-hint">点線の 位置に あわせたまま、写真を しあげるよ</p>`
      : `
        <div class="scene photo-positioner" data-positioner>
          <img class="photo-background" src="${backgroundUrl}" alt="">
          <img class="photo-movable" data-photo src="${dataUrl}" alt="とったしゃしん" draggable="false">
        </div>
        <p class="drag-hint">☝ ゆびで うごかす　🔍 おおきさも かえられるよ</p>
        <div class="photo-zoom" aria-label="しゃしんのおおきさ">
          <button type="button" class="zoom-button" data-zoom-out aria-label="ちいさくする">−</button>
          <input data-zoom type="range" min="0.6" max="2" step="0.05" value="1" aria-label="しゃしんの大きさ">
          <button type="button" class="zoom-button" data-zoom-in aria-label="おおきくする">＋</button>
          <output data-zoom-value>100%</output>
        </div>`;

    return stage(`
      <div class="screen reader">
        <p class="lead">${guided ? "しあがりを えらんでね" : "しゃしんを うごかしてね"}</p>
        ${resultMarkup}
        ${modeMarkup()}
        <div class="preview-actions">
          <button class="retry" data-retry>もういちど</button>
          <button class="mission-shoot" data-keep${guided ? " disabled" : ""}>✓ これにする</button>
        </div>
      </div>`);
  },

  mount(ctx, { page, dataUrl, guided = false, captureWindow = null }, root) {
    const positioner = root.querySelector("[data-positioner]");
    const photo = root.querySelector("[data-photo]");
    const resultStage = root.querySelector("[data-result-stage]");
    const resultPreview = root.querySelector("[data-result-preview]");
    const resultStatus = root.querySelector("[data-result-status]");
    const keepButton = root.querySelector("[data-keep]");
    const convertInput = root.querySelector("[data-convert]");
    const convertHint = root.querySelector("[data-convert-hint]");
    let offsetX = 0;
    let offsetY = 0;
    let zoom = 1;
    let drag = null;
    let composedUrl = null;
    let composeToken = 0;
    const zoomInput = root.querySelector("[data-zoom]");
    const zoomValue = root.querySelector("[data-zoom-value]");
    const clampZoom = (value) => Math.max(0.6, Math.min(2, Number(value) || 1));

    const updateConvertHint = () => {
      if (!convertHint) return;
      convertHint.textContent = convertInput.checked
        ? "白い部分は透明になり、はじめの絵が見えるよ"
        : "白い部分も写真として残り、型の中が写真でいっぱいになるよ";
    };

    const clampOffset = () => {
      if (!positioner || !photo) return;
      const rect = positioner.getBoundingClientRect();
      const halfW = photo.offsetWidth * zoom / 2;
      const halfH = photo.offsetHeight * zoom / 2;
      offsetX = Math.max(-rect.width / 2 + halfW, Math.min(rect.width / 2 - halfW, offsetX));
      offsetY = Math.max(-rect.height / 2 + halfH, Math.min(rect.height / 2 - halfH, offsetY));
    };
    const draw = () => {
      if (!photo) return;
      photo.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom})`;
      if (zoomInput) zoomInput.value = String(zoom);
      if (zoomValue) zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    };
    const setZoom = (value) => {
      zoom = clampZoom(value);
      clampOffset();
      draw();
    };

    if (!guided && zoomInput && positioner) {
      zoomInput.addEventListener("input", () => setZoom(zoomInput.value));
      root.querySelector("[data-zoom-out]").onclick = () => setZoom(zoom - 0.1);
      root.querySelector("[data-zoom-in]").onclick = () => setZoom(zoom + 0.1);

      positioner.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offsetX, offsetY };
        positioner.setPointerCapture?.(event.pointerId);
        positioner.classList.add("is-dragging");
      });
      positioner.addEventListener("pointermove", (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        offsetX = drag.offsetX + event.clientX - drag.x;
        offsetY = drag.offsetY + event.clientY - drag.y;
        clampOffset();
        draw();
      });
      const finishDrag = (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        drag = null;
        positioner.classList.remove("is-dragging");
      };
      positioner.addEventListener("pointerup", finishDrag);
      positioner.addEventListener("pointercancel", finishDrag);
    }

    const composeGuidedPreview = async () => {
      const token = ++composeToken;
      resultStatus.hidden = false;
      resultStage?.classList.remove("is-ready");
      keepButton.disabled = true;
      resultStatus.textContent = "しあがりを つくっているよ…";
      try {
        const nextUrl = await composeMissionPhoto(
          ctx.repo.assetUrl(page.image), dataUrl, page.frame,
          {
            guided: true,
            captureWindow,
            scale: 1,
            dx: 0,
            dy: 0,
            removeBackground: convertInput.checked,
          },
        );
        if (token !== composeToken) return null;
        composedUrl = nextUrl;
        resultPreview.src = nextUrl;
        resultPreview.hidden = false;
        resultStatus.hidden = true;
        resultStage?.classList.add("is-ready");
        keepButton.disabled = false;
        return nextUrl;
      } catch (error) {
        if (token !== composeToken) return null;
        resultStatus.textContent = "しあがりを つくれなかったよ。もういちど ためしてね";
        console.warn("写真のプレビュー合成に失敗しました", error);
        throw error;
      }
    };

    updateConvertHint();
    convertInput.addEventListener("change", () => {
      updateConvertHint();
      if (guided) composeGuidedPreview().catch(() => {});
    });
    if (guided) composeGuidedPreview().catch(() => {});

    keepButton.onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = t("preview.busy");
      try {
        let finalUrl = composedUrl;
        if (guided) {
          finalUrl = finalUrl || await composeGuidedPreview();
        } else {
          const rect = positioner.getBoundingClientRect();
          finalUrl = await composeMissionPhoto(
            ctx.repo.assetUrl(page.image), dataUrl, page.frame,
            {
              dx: offsetX / rect.width,
              dy: offsetY / rect.height,
              scale: zoom,
              removeBackground: convertInput.checked,
            },
          );
        }
        const vehicleColor = await extractPhotoColor(dataUrl);
        ctx.session.completeMission({
          missionId: page.id, missionText: page.prompt,
          caption: page.diaryCaption || page.prompt, photoUrl: finalUrl,
          missionImage: page.image,
          vehicleColor,
          vehicleSourceUrl: dataUrl,
          vehicleTextureScale: guided ? 1 : zoom,
        });
        ctx.notify?.("しゃしんを 保存したよ！");
        ctx.go("ACHIEVE", { page });
      } catch (error) {
        console.warn("写真の保存に失敗しました", error);
        button.disabled = false;
        button.textContent = t("preview.keep");
        ctx.notify?.("保存に しっぱいしました", "error");
      }
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
};
