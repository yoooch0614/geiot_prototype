export const PinScreen = {
  render() {
    const keys = [1,2,3,4,5,6,7,8,9,"",0,"←"];
    return `
      <div class="screen center">
        <button class="back" data-back>‹ もどる</button>
        <div class="pin-card">
          <p class="pin-label">あんしょうばんごうを いれてね</p>
          <div class="pin-dots" id="pin-dots"></div>
          <div class="keypad">
            ${keys.map((k) => k === ""
              ? `<span></span>`
              : `<button class="key" data-key="${k}">${k}</button>`).join("")}
          </div>
          <p class="pin-hint">（プロト用: 0000）</p>
        </div>
      </div>`;
  },
  mount(ctx, _p, root) {
    let buf = "";
    const dots = root.querySelector("#pin-dots");
    const draw = () => {
      dots.innerHTML = Array.from({ length: 4 }, (_, i) =>
        `<span class="pin-dot${i < buf.length ? " is-filled" : ""}"></span>`).join("");
    };
    draw();
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    root.querySelectorAll("[data-key]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.key;
        if (k === "←") buf = buf.slice(0, -1);
        else if (buf.length < 4) buf += k;
        draw();
        if (buf.length === 4) {
          if (ctx.session.checkPin(buf)) {
            ctx.session.setMode("parent");
            ctx.go("SELECT");
          } else {
            dots.classList.add("shake");
            setTimeout(() => { buf = ""; draw(); dots.classList.remove("shake"); }, 500);
          }
        }
      };
    });
  },
};
