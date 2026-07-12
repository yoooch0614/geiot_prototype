export const ModeScreen = {
  render(ctx) {
    // gifは背景（うすいクリーム色）を消せないので、透過つきの webp にした。
    // gifのままだと丘の緑と混ぜて消すしかなく、きつねまで暗くなってしまう。
    const cat = ctx.repo.assetUrl("assets/char-cat.webp");
    // タイトルはアイコンそのもの（「えほえほ」のロゴが絵に入っている）。
    // 白い看板は置かず、空にふわふわ浮かんでいるように見せる。
    // png(455KB)ではなく webp(46KB)を使う。重いと、Wi-Fi経由のiPadで
    // 読み込み途中の「上半分だけ」が見えてしまうため。
    const icon = ctx.repo.assetUrl("assets/icon.webp");
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
        </div>
        <div class="title-hills" aria-hidden="true">
          <span class="title-hill title-hill--far"></span>
          <span class="title-hill title-hill--near"></span>
          ${cat ? `<img class="title-cat" src="${cat}" alt="">` : ""}
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
