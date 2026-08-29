import { stage, composeMissionPhoto, extractPhotoColor } from "../shared/utils.js?v=suki-no-tane-camera-fix-20260829-v2";
import { t } from "../shared/i18n.js";

export const PreviewScreen = {
  render(ctx, { page, dataUrl }) {
    const backgroundUrl = ctx.repo.assetUrl(page.image);
    const hasRepeatObjects = (page.repeatGroups?.length ?? 0) > 0;
    return stage(`
      <div class="screen reader">
        <p class="lead">しゃしんを うごかしてね</p>
        <div class="scene photo-positioner" data-positioner>
          <img class="photo-background" src="${backgroundUrl}" alt="">
          <img class="photo-movable" data-photo src="${dataUrl}" alt="とったしゃしん" draggable="false">
        </div>
        <p class="drag-hint">☝ ゆびで うごかす　🔍 おおきさも かえられるよ</p>
        ${hasRepeatObjects ? `<p class="repeat-hint">この範囲の かたちと かずに、そのまま いろづけするよ。</p>` : ""}
        <div class="photo-zoom" aria-label="しゃしんのおおきさ">
          <button type="button" class="zoom-button" data-zoom-out aria-label="ちいさくする">−</button>
          <input data-zoom type="range" min="0.6" max="2" step="0.05" value="1" aria-label="しゃしんの大きさ">
          <button type="button" class="zoom-button" data-zoom-in aria-label="おおきくする">＋</button>
          <output data-zoom-value>100%</output>
        </div>
        <div class="preview-actions">
          <button class="retry" data-retry>もういちど</button>
          <button class="mission-shoot" data-keep>✓ これにする</button>
        </div>
      </div>`);
  },
  mount(ctx, { page, dataUrl }, root) {
    const positioner = root.querySelector("[data-positioner]");
    const photo = root.querySelector("[data-photo]");
    let offsetX = 0;
    let offsetY = 0;
    let zoom = 1;
    let drag = null;
    const zoomInput = root.querySelector("[data-zoom]");
    const zoomValue = root.querySelector("[data-zoom-value]");
    const clampZoom = (value) => Math.max(0.6, Math.min(2, Number(value) || 1));
    const clampOffset = () => {
      const rect = positioner.getBoundingClientRect();
      const halfW = photo.offsetWidth * zoom / 2;
      const halfH = photo.offsetHeight * zoom / 2;
      offsetX = Math.max(-rect.width / 2 + halfW, Math.min(rect.width / 2 - halfW, offsetX));
      offsetY = Math.max(-rect.height / 2 + halfH, Math.min(rect.height / 2 - halfH, offsetY));
    };
    const draw = () => {
      photo.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom})`;
      if (zoomInput) zoomInput.value = String(zoom);
      if (zoomValue) zoomValue.textContent = `${Math.round(zoom * 100)}%`;
    };
    const setZoom = (value) => {
      zoom = clampZoom(value);
      clampOffset();
      draw();
    };

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

    root.querySelector("[data-keep]").onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = t("preview.busy");
      try {
        const rect = positioner.getBoundingClientRect();
        const vehicleColor = await extractPhotoColor(dataUrl);
        const composedUrl = await composeMissionPhoto(
          ctx.repo.assetUrl(page.image), dataUrl, page.frame,
          {
            dx: offsetX / rect.width,
            dy: offsetY / rect.height,
            scale: zoom,
            removeBackground: false,
            repeatGroups: page.repeatGroups || [],
            maskUrl: page.photoMask ? ctx.repo.assetUrl(page.photoMask) : null,
          },
        );
        ctx.session.completeMission({
          missionId: page.id, missionText: page.prompt,
          caption: page.diaryCaption || page.prompt, photoUrl: composedUrl,
          missionImage: page.image,
          vehicleColor,
          vehicleSourceUrl: dataUrl,
          vehicleTextureScale: zoom,
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
