import { stage } from "../shared/utils.js";

export const AchieveScreen = {
  render(ctx) {
    return `
      <div class="screen center achieve">
        <div class="confetti-layer" data-confetti></div>
        <div class="sparkle-burst">
          <span class="sparkle-shape s1"></span>
          <span class="sparkle-shape s2"></span>
          <span class="sparkle-shape s3"></span>
          <span class="sparkle-shape s4"></span>
          <span class="sparkle-shape s5"></span>
          <span class="sparkle-shape s6"></span>
        </div>
        <div class="sticker" aria-hidden="true"></div>
        <p class="lead">やったね！</p>
      </div>`;
  },
  mount(ctx, _params, root) {
    const layer = root.querySelector("[data-confetti]");
    const shapes = ["circle", "square", "star"];
    const colors = ["#FFD166", "#EF476F", "#06D6A0", "#118AB2", "#FF7BAC"];

    for (let i = 0; i < 20; i++) {
      const p = document.createElement("span");
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      p.className = `confetti-piece confetti-${shape}`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = `${Math.random() * 0.4}s`;
      p.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
      const size = 8 + Math.random() * 8;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      layer.appendChild(p);
    }

    setTimeout(() => ctx.advance(), 1800);
  },
};