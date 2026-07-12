import { stage, composeMissionPhoto } from "../shared/utils.js";

export const PreviewScreen = {
  render(ctx, { page, dataUrl }) {
    const backgroundUrl = ctx.repo.assetUrl(page.image);
    return stage(`
      <div class="screen reader">
        <p class="lead">しゃしんを うごかしてね</p>
        <div class="scene photo-positioner" data-positioner>
          <img class="photo-background" src="${backgroundUrl}" alt="">
          <img class="photo-movable" data-photo src="${dataUrl}" alt="とったしゃしん" draggable="false">
        </div>
        <p class="drag-hint">☝ ゆびで すきな ばしょへ</p>
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
    let drag = null;
    const draw = () => { photo.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`; };

    positioner.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offsetX, offsetY };
      positioner.setPointerCapture?.(event.pointerId);
      positioner.classList.add("is-dragging");
    });
    positioner.addEventListener("pointermove", (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const rect = positioner.getBoundingClientRect();
      const halfW = photo.offsetWidth / 2;
      const halfH = photo.offsetHeight / 2;
      offsetX = Math.max(-rect.width / 2 + halfW, Math.min(rect.width / 2 - halfW, drag.offsetX + event.clientX - drag.x));
      offsetY = Math.max(-rect.height / 2 + halfH, Math.min(rect.height / 2 - halfH, drag.offsetY + event.clientY - drag.y));
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
      button.textContent = "つくっているよ…";
      const rect = positioner.getBoundingClientRect();
      const composedUrl = await composeMissionPhoto(
        ctx.repo.assetUrl(page.image), dataUrl, page.frame,
        { dx: offsetX / rect.width, dy: offsetY / rect.height },
      );
      ctx.session.completeMission({
        missionId: page.id, missionText: page.prompt,
        caption: page.diaryCaption || page.prompt, photoUrl: composedUrl,
        missionImage: page.image,
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
};
