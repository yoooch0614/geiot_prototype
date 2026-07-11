export const PreviewScreen = {
  render(_ctx, { dataUrl }) {
    return `
      <div class="screen reader">
        <p class="lead">これで いい？</p>
        <div class="scene photo"><img src="${dataUrl}" alt="とったしゃしん"></div>
        <div class="preview-actions">
          <button class="retry" data-retry>🔄 もういちど</button>
          <button class="mission-shoot" data-keep>✓ これにする</button>
        </div>
      </div>`;
  },
  mount(ctx, { page, dataUrl }, root) {
    root.querySelector("[data-keep]").onclick = () => {
      ctx.session.completeMission({
        missionId: page.id, missionText: page.prompt,
        caption: page.diaryCaption || page.prompt, photoUrl: dataUrl,
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
