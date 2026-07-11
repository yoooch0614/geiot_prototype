import { playAudio, esc } from "../shared/utils.js";

export const MissionScreen = {
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
    root.querySelector("[data-tap]").onclick = () => {
      ctx.session.completeMission({
        missionId: page.id, missionText: page.prompt,
        caption: page.diaryCaption || page.prompt, photoUrl: null,
      });
      ctx.go("ACHIEVE", { page });
    };
  },
};
