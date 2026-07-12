// 子ども向け／おうちのひと向けで共通して使う操作ガイド。
// step は { number, image, type, title, action, text } の形で指定する。
export function openGuide(ctx, root, {
  steps,
  kicker = "かんたん 3ステップ",
  title = "あそびかた",
  finalLabel = "はじめよう！",
  onComplete = () => {},
} = {}) {
  if (root.querySelector("[data-guide-modal]") || !steps?.length) return;

  const modal = document.createElement("div");
  modal.className = "guide-modal";
  modal.dataset.guideModal = "";
  modal.innerHTML = `
    <div class="guide-card" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <button class="guide-close" type="button" data-guide-close aria-label="あとで見る">×</button>
      <p class="guide-kicker">${kicker}</p>
      <h2 id="guide-title" class="guide-title">${title}</h2>
      <div class="guide-steps" aria-live="polite">
        ${steps.map((step, i) => `
          <section class="guide-step" data-guide-step="${i}" aria-hidden="${i !== 0}">
            <div class="guide-illustration guide-illustration--${step.type}" aria-hidden="true">
              <img src="${ctx.repo.assetUrl(step.image)}" alt="" onerror="this.remove()">
              <span class="guide-number">${step.number}</span>
              ${gestureMarkup(step)}
            </div>
            <h3>${step.title}</h3>
            <p class="guide-action">${step.action}</p>
            <p class="guide-note">${step.text}</p>
          </section>`).join("")}
      </div>
      <div class="guide-dots" aria-hidden="true">
        ${steps.map((_, i) => `<span data-guide-dot="${i}"></span>`).join("")}
      </div>
      <div class="guide-actions">
        <button class="guide-prev" type="button" data-guide-prev>‹ もどる</button>
        <button class="guide-next" type="button" data-guide-next>つぎへ ›</button>
      </div>
      <button class="guide-later" type="button" data-guide-close>あとで</button>
    </div>`;
  root.appendChild(modal);

  const stepEls = [...modal.querySelectorAll("[data-guide-step]")];
  const dots = [...modal.querySelectorAll("[data-guide-dot]")];
  const prev = modal.querySelector("[data-guide-prev]");
  const next = modal.querySelector("[data-guide-next]");
  let index = 0;
  let focusedTargets = [];
  let focusCleanups = [];

  function clearFocus() {
    focusedTargets.forEach((target) => target.classList.remove("guide-focus"));
    focusCleanups.forEach((cleanup) => cleanup());
    modal.classList.remove("guide-modal--focus");
    focusedTargets = [];
    focusCleanups = [];
  }

  const close = () => {
    clearFocus();
    modal.remove();
  };

  function syncFocus() {
    clearFocus();
    const focus = steps[index]?.focus;
    const selectors = Array.isArray(focus) ? focus : [focus];
    const targets = selectors.filter(Boolean)
      .map((selector) => root.querySelector(selector))
      .filter(Boolean);
    if (!targets.length) return;

    focusedTargets = targets;
    modal.classList.add("guide-modal--focus");
    const completeFromTarget = () => {
      onComplete();
      close();
    };
    targets.forEach((target) => {
      target.classList.add("guide-focus");
      target.addEventListener("pointerdown", completeFromTarget, { once: true });
      focusCleanups.push(() => target.removeEventListener("pointerdown", completeFromTarget));
    });
  }

  function sync() {
    stepEls.forEach((step, i) => {
      const active = i === index;
      step.hidden = !active;
      step.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
    prev.hidden = index === 0;
    next.textContent = index === stepEls.length - 1 ? finalLabel : "つぎへ ›";
    syncFocus();
  }

  modal.querySelectorAll("[data-guide-close]").forEach((button) => { button.onclick = close; });
  prev.onclick = () => { if (index > 0) { index--; sync(); } };
  next.onclick = () => {
    if (index < stepEls.length - 1) {
      index++;
      sync();
      return;
    }
    onComplete();
    close();
  };
  modal.onclick = (event) => { if (event.target === modal) close(); };
  sync();
}

function gestureMarkup(step) {
  if (step.type === "tap") {
    return `<span class="guide-gesture guide-gesture--tap">👆</span><span class="guide-target">${step.target ?? "えほん"}</span>`;
  }
  if (step.type === "swipe") {
    return '<span class="guide-gesture guide-gesture--swipe">👆</span><span class="guide-swipe-trail" aria-hidden="true"></span><span class="guide-swipe-arrow">←</span>';
  }
  if (step.type === "camera") {
    return '<span class="guide-gesture guide-gesture--camera">📷</span>';
  }
  if (step.type === "parent") {
    return `<span class="guide-gesture guide-gesture--parent">${step.gesture ?? "📊"}</span>`;
  }
  return "";
}
