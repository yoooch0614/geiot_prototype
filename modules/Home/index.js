export const HomeScreen = {
  render() {
    return `
      <div class="screen center">
        <button class="back" data-back>‹</button>
        <h1 class="brand">なにして あそぶ？</h1>
        <div class="mode-grid">
          <button class="mode-card mode-card--child" data-go="SELECT">
            <span class="mode-emoji">📖</span><span>えほん</span>
          </button>
          <button class="mode-card mode-card--memory" data-go="GALLERY">
            <span class="mode-emoji">🌟</span><span>おもいで</span>
          </button>
        </div>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    root.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => ctx.go(b.dataset.go));
  },
};
