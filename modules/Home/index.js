export const HomeScreen = {
  render(ctx) {
    return `
      <div class="screen center screen--sky">
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
        <button class="back" data-back>‹</button>
        <h1 class="brand">なにして あそぶ？</h1>
        <div class="mode-grid">
          <button class="mode-card mode-card--child" data-go="SELECT">
            <span class="mode-icon mode-icon--book" aria-hidden="true"></span><span>えほん</span>
          </button>
          <button class="mode-card mode-card--memory" data-go="SELECT" data-view="memories">
            <span class="mode-icon mode-icon--memory" aria-hidden="true"></span><span>おもいで</span>
          </button>
        </div>
        <button class="bookmark-launch" data-go="BOOKMARKS">
          <span aria-hidden="true">☆</span> しおり <span class="bookmark-count">${ctx.session.bookmarks.length}</span>
        </button>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    root.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => ctx.go(b.dataset.go, b.dataset.view ? { view: b.dataset.view } : {});
    });
  },
};
