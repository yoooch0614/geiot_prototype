export const ModeScreen = {
  render(ctx) {
    const cat = ctx.repo.assetUrl("assets/char-cat.webp");
    const icon = ctx.repo.assetUrl("assets/icon.webp");
    const bird = ctx.repo.assetUrl("assets/bird.gif");
    // 1. 歩くきつねのGIFアセットを読み込む
    const fox = ctx.repo.assetUrl("assets/wolk_foxy.gif");

    return `
      <div class="screen center title-screen screen--sky">
        <div class="sky-scene" aria-hidden="true">
          <span class="sky-sun"></span>
          <span class="sky-moon"></span>
          <span class="sky-cloud sky-cloud--1"></span>
          <span class="sky-cloud sky-cloud--2"></span>
          <span class="sky-star sky-star--1"></span>
          <span class="sky-star sky-star--2"></span>
          <span class="sky-star sky-star--3"></span>
          <span class="sky-star sky-star--4"></span>
          ${bird ? `<span class="sky-bird"><img src="${bird}" alt=""></span>` : ""}
        </div>
        <div class="title-hills" aria-hidden="true">
          <span class="title-hill title-hill--far"></span>
          <span class="title-hill title-hill--near"></span>
          
          <!-- 2. きつねの要素を追加（手前の丘の上に表示されるようにここに配置） -->
          ${cat ? `<img class="title-cat" src="${cat}" alt="">` : ""}
          ${fox ? `<img class="title-fox" src="${fox}" alt="">` : ""}
          
        </div>
        <div class="title-logo">
          <img class="title-icon" src="${icon}" alt="えほえほ" onerror="this.remove()">
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