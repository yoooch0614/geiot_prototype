import { stage } from "../shared/utils.js";

export const AchieveScreen = {
  render(ctx) {
    const sticker = ctx.repo.assetUrl("assets/sticker-star.svg");
    return stage(`
      <div class="screen center achieve">
        <div class="sparkle">✨</div>
        <img class="sticker" src="${sticker}" alt="">
        <p class="lead">やったね！</p>
      </div>`);
  },
  mount(ctx) {
    setTimeout(() => ctx.advance(), 1600);
  },
};
