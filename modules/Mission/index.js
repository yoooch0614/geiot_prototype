import { playNarration, esc, formatJapaneseCopy, stage, characterLayer, openMissionCamera, completeMissionPhoto } from "../shared/utils.js?v=suki-no-tane-final-switch-20260821";

export const MissionScreen = {
  render(ctx, { page }) {
    const img = ctx.repo.assetUrl(page.image);
    const character = ctx.repo.assetUrl(page.character);
    return stage(`
      <div class="screen reader page--in">
        <button class="back" data-back>‹</button>
        <div class="scene">
          <img src="${img}" alt="" onerror="this.style.opacity=0">
          ${characterLayer(character)}
        </div>
        <p class="lead">${formatJapaneseCopy(page.text)}</p>
        <p class="prompt">${formatJapaneseCopy(page.prompt)}</p>
        <button class="mission-shoot" data-shoot> ${esc(page.doneLabel || "とってみよう！")}</button>
      </div>`);
  },
  mount(ctx, { page }, root) {
    playNarration(ctx.repo.assetUrl(page.audio));
    root.querySelector("[data-back]").onclick = () => ctx.go("HOME");

    root.querySelector("[data-shoot]").onclick = () => openMissionCamera(ctx, page, {
      onGuidedCapture: async (dataUrl, guide) => {
        await completeMissionPhoto(ctx, page, dataUrl, { captureWindow: guide.frame });
        ctx.notify?.("しゃしんを 保存したよ！");
        ctx.go("ACHIEVE", { page });
      },
      onFallback: (dataUrl) => ctx.go("PREVIEW", { page, dataUrl }),
    });
    // 「しゃしんなし」ボタンは撤去済み。要素が無いのに onclick を触るとエラーになるためガード
    const tap = root.querySelector("[data-tap]");
    if (tap) {
      tap.onclick = () => {
        ctx.session.completeMission({
          missionId: page.id, missionText: page.prompt,
          caption: page.diaryCaption || page.prompt, photoUrl: null,
          missionImage: page.image, missionCharacter: page.character,
        });
        ctx.go("ACHIEVE", { page });
      };
    }
  },
};
