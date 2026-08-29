import { localizeText } from "../shared/i18n.js";

let pinLockTimer = null;

export const PinScreen = {
  render(ctx) {
    const keys = [1,2,3,4,5,6,7,8,9,"",0,"←"];
    const lockedSeconds = Math.ceil(ctx.session.getPinLockRemaining() / 1000);
    return `
      <div class="screen center">
        <button class="back" data-back>‹ 戻る</button>
        <div class="pin-card">
          <p class="pin-label">暗証番号を入力してください</p>
          <div class="pin-dots" id="pin-dots"></div>
          <div class="keypad">
            ${keys.map((k) => k === ""
              ? `<span></span>`
              : `<button class="key" data-key="${k}"${lockedSeconds ? " disabled" : ""}>${k}</button>`).join("")}
          </div>
          <p class="pin-status${lockedSeconds ? " is-locked" : ""}" data-pin-status role="status" aria-live="polite">${lockedSeconds ? `3回連続で間違えたため、${lockedSeconds}秒後に再入力してください` : ""}</p>
          <p class="pin-hint">プロトタイプ用 <strong>0000</strong></p>
        </div>
      </div>`;
  },
  mount(ctx, _p, root) {
    if (pinLockTimer) {
      window.clearInterval(pinLockTimer);
      pinLockTimer = null;
    }
    let buf = "";
    const dots = root.querySelector("#pin-dots");
    const status = root.querySelector("[data-pin-status]");
    const buttons = [...root.querySelectorAll("[data-key]")];
    const draw = () => {
      dots.innerHTML = Array.from({ length: 4 }, (_, i) =>
        `<span class="pin-dot${i < buf.length ? " is-filled" : ""}"></span>`).join("");
    };
    const syncLockState = () => {
      const remaining = ctx.session.getPinLockRemaining();
      const locked = remaining > 0;
      buttons.forEach((button) => { button.disabled = locked; });
      status.classList.toggle("is-locked", locked);
      if (locked) {
        status.textContent = localizeText(`3回連続で間違えたため、${Math.ceil(remaining / 1000)}秒後に再入力してください`);
        if (!pinLockTimer) pinLockTimer = window.setInterval(syncLockState, 250);
      } else if (pinLockTimer) {
        window.clearInterval(pinLockTimer);
        pinLockTimer = null;
        status.textContent = localizeText("もう一度入力してください");
      }
    };
    draw();
    syncLockState();
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    buttons.forEach((b) => {
      b.onclick = () => {
        if (ctx.session.isPinLocked()) return;
        const k = b.dataset.key;
        status.textContent = "";
        status.classList.remove("is-locked");
        if (k === "←") buf = buf.slice(0, -1);
        else if (buf.length < 4) buf += k;
        draw();
        if (buf.length === 4) {
          if (ctx.session.checkPin(buf)) {
            ctx.session.resetPinFailures();
            if (ctx.unlockParent) ctx.unlockParent();
            else ctx.session.setMode("parent");
            ctx.go("SELECT");
          } else {
            const lockedFor = ctx.session.recordPinFailure();
            dots.classList.add("shake");
            if (lockedFor) {
              buf = "";
              draw();
              syncLockState();
            } else {
              status.textContent = localizeText(`PINが一致しません（残り${ctx.session.pinAttemptsLeft()}回）`);
              setTimeout(() => {
                if (!ctx.session.isPinLocked()) status.textContent = "";
              }, 900);
            }
            setTimeout(() => { buf = ""; draw(); dots.classList.remove("shake"); }, 500);
          }
        }
      };
    });
  },
  unmount() {
    if (pinLockTimer) {
      window.clearInterval(pinLockTimer);
      pinLockTimer = null;
    }
  },
};
