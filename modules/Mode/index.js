export const ModeScreen = {
  render() {
    return `
      <div class="screen center">
        <h1 class="brand">そとであそぼ！<br>えほん</h1>
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
