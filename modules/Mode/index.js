export const ModeScreen = {
  render(ctx) {
    const cat = ctx.repo.assetUrl("assets/char-cat.gif");
    return `
      <div class="screen center title-screen screen--sunny">
        <div class="sunny-sky" aria-hidden="true">
          <span class="sunny-sun"></span>
          <span class="sunny-cloud sunny-cloud--1"></span>
          <span class="sunny-cloud sunny-cloud--2"></span>
        </div>
        <div class="title-hills" aria-hidden="true">
          <span class="title-hill title-hill--far"></span>
          <span class="title-hill title-hill--near"></span>
          ${cat ? `<img class="title-cat" src="${cat}" alt="">` : ""}
        </div>
        <div class="title-plate">
          <span class="title-eyebrow">そとが すきになる えほん</span>
          <h1 class="brand">そとであそぼ！<br>えほん</h1>
        </div>
        <p class="title-ask">だれと はじめる？</p>
        <div class="mode-grid">
          <button class="mode-card mode-card--child" data-go="child">
            <span>こども</span>
          </button>
          <button class="mode-card mode-card--parent" data-go="parent">
            <span>おうちのひと</span>
          </button>
        </div>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector('[data-go="child"]').onclick = () => {
      ctx.session.setMode("child"); ctx.go("HOME");
    };
    root.querySelector('[data-go="parent"]').onclick = () => {
      ctx.session.setMode("parent"); ctx.go("PIN");
    };
  },
};
