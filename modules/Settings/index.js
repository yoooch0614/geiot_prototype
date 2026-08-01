import {
  esc,
  isBgmEnabled,
  setBgmEnabled,
  isSoundEnabled,
  setSoundEnabled,
  isNarrationEnabled,
  setNarrationEnabled,
} from "../shared/utils.js";
import { localizeText, localizeUi, t } from "../shared/i18n.js";

function defaultBackTo(ctx) {
  if (ctx.session.mode === "parent") return "PARENT";
  if (ctx.session.mode === "child") return "HOME";
  return "MODE";
}

function toggleMarkup(key, label, description, enabled, badge = "") {
  return `
    <div class="settings-row">
      <div class="settings-copy">
        <strong>${esc(label)}${badge ? `<em class="settings-dev-badge">${esc(badge)}</em>` : ""}</strong>
        <span>${esc(description)}</span>
      </div>
      <button type="button" class="settings-switch${enabled ? " is-on" : ""}"
        data-setting-toggle="${key}" role="switch" aria-checked="${enabled}">
        ${enabled ? t("common.on") : t("common.off")}
      </button>
    </div>`;
}

function selectMarkup(key, label, description, value, options) {
  return `
    <label class="settings-row settings-row--select">
      <span class="settings-copy">
        <strong>${esc(label)}</strong>
        <span>${esc(description)}</span>
      </span>
      <select class="settings-select" data-setting-select="${key}" aria-label="${esc(label)}">
        ${options.map((option) => `
          <option value="${esc(option.value)}"${option.value === value ? " selected" : ""}${option.disabled ? " disabled" : ""}>
            ${esc(option.label)}
          </option>`).join("")}
      </select>
    </label>`;
}

function themeMarkup(value) {
  const choices = [
    { value: "day", label: t("settings.day"), icon: "☀", iconClass: "sun" },
    { value: "auto", label: t("settings.auto"), icon: "◐", iconClass: "auto" },
    { value: "night", label: t("settings.night"), icon: "☾", iconClass: "moon" },
  ];
  return `
    <div class="settings-row settings-row--theme">
      <div class="settings-copy">
        <strong>${esc(t("settings.theme"))}</strong>
        <span>${esc(t("settings.themeDescription"))}</span>
      </div>
      <div class="settings-theme-switch" data-theme-switch role="group" aria-label="テーマ">
        ${choices.map((choice) => `
          <button type="button" class="settings-theme-button${choice.value === value ? " is-active" : ""}"
            data-setting-theme="${choice.value}" aria-pressed="${choice.value === value}">
            <span class="settings-theme-icon settings-theme-icon--${choice.iconClass}" aria-hidden="true">${choice.icon}</span>
            <span>${choice.label}</span>
          </button>`).join("")}
      </div>
    </div>`;
}

function openPinChange(ctx, root) {
  const stages = [
    t("settings.pinCurrent"),
    t("settings.pinNew"),
    t("settings.pinConfirm"),
  ];
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "backspace"];
  let stage = 0;
  let buffer = "";
  let newPin = "";
  let message = "";
  let messageType = "";
  let locked = false;

  const modal = document.createElement("div");
  modal.className = "pin-change-modal";
  modal.innerHTML = `
    <div class="pin-change-card" role="dialog" aria-modal="true" aria-labelledby="pin-change-title">
      <button type="button" class="pin-change-close" data-pin-close aria-label="閉じる">×</button>
      <h2 id="pin-change-title">おうちのひとの PIN を変更</h2>
      <p class="pin-change-stage" data-pin-stage></p>
      <div class="pin-change-dots" data-pin-dots aria-label="4けたのPIN入力"></div>
      <p class="pin-change-message" data-pin-message role="status" aria-live="polite"></p>
      <div class="pin-change-keypad">
        ${keys.map((key) => key === ""
          ? '<span class="pin-change-key-spacer" aria-hidden="true"></span>'
          : `<button type="button" class="pin-change-key" data-pin-key="${key}">${key === "backspace" ? "←" : key}</button>`).join("")}
      </div>
    </div>`;

  const dots = modal.querySelector("[data-pin-dots]");
  const messageNode = modal.querySelector("[data-pin-message]");
  const keyButtons = [...modal.querySelectorAll("[data-pin-key]")];

  const draw = () => {
    modal.querySelector("[data-pin-stage]").textContent = stages[stage];
    dots.innerHTML = Array.from({ length: 4 }, (_, i) =>
      `<span class="pin-change-dot${i < buffer.length ? " is-filled" : ""}"></span>`).join("");
    messageNode.textContent = localizeText(message);
    messageNode.className = `pin-change-message${messageType ? ` is-${messageType}` : ""}`;
  };

  const shake = () => {
    dots.classList.remove("shake");
    void dots.offsetWidth;
    dots.classList.add("shake");
    window.setTimeout(() => dots.classList.remove("shake"), 450);
  };

  const setMessage = (text, type = "") => {
    message = text;
    messageType = type;
    draw();
  };

  const close = () => modal.remove();

  const submit = () => {
    if (locked || buffer.length !== 4) return;
    if (stage === 0) {
      if (!ctx.session.checkPin(buffer)) {
        buffer = "";
        setMessage("PINがちがいます");
        shake();
        return;
      }
      stage = 1;
      buffer = "";
      setMessage("");
      return;
    }
    if (stage === 1) {
      newPin = buffer;
      stage = 2;
      buffer = "";
      setMessage("");
      return;
    }
    if (buffer !== newPin) {
      stage = 1;
      buffer = "";
      setMessage("2回のPINが一致しません");
      shake();
      return;
    }
    if (!ctx.session.setPin(newPin)) {
      buffer = "";
      setMessage("4けたの数字を入力してください");
      shake();
      return;
    }
    locked = true;
    keyButtons.forEach((button) => { button.disabled = true; });
    setMessage("PINを変更しました", "success");
    window.setTimeout(close, 850);
  };

  keyButtons.forEach((button) => {
    button.onclick = () => {
      if (locked) return;
      const key = button.dataset.pinKey;
      message = "";
      messageType = "";
      if (key === "backspace") buffer = buffer.slice(0, -1);
      else if (/^\d$/.test(key) && buffer.length < 4) buffer += key;
      draw();
      if (buffer.length === 4) window.setTimeout(submit, 100);
    };
  });

  modal.querySelector("[data-pin-close]").onclick = close;
  modal.onclick = (event) => {
    if (event.target === modal) close();
  };
  root.append(modal);
  localizeUi(modal);
  draw();
}

export const SettingsScreen = {
  render(ctx, params = {}) {
    const backTo = params.from || defaultBackTo(ctx);
    const fontSize = ctx.settings.get("fontSize");
    const theme = ctx.settings.get("theme");
    const language = ctx.settings.get("language");
    const canExportRecords = ctx.session.mode === "parent";
    return `
      <div class="screen settings-screen">
        <button class="back" data-back>‹ もどる</button>
        <div class="settings-heading">
          <span class="settings-heading-icon" aria-hidden="true">⚙</span>
          <div>
            <h2 class="settings-title">せってい</h2>
            <p class="settings-lead">じぶんに あわせて ちょうせいできるよ</p>
          </div>
        </div>

        <section class="settings-group" aria-labelledby="settings-sound-title">
          <h3 id="settings-sound-title">おと</h3>
          ${toggleMarkup("bgmEnabled", "BGM", "本だなやホームで音楽を流します", isBgmEnabled())}
          ${toggleMarkup("soundEnabled", "こうかおん", "ボタンやページをめくる音を流します", isSoundEnabled())}
          ${toggleMarkup("narrationEnabled", "よみきかせ", "専用の音声を準備しています。現在は試用機能です", isNarrationEnabled(), "開発中")}
        </section>

        <section class="settings-group" aria-labelledby="settings-display-title">
          <h3 id="settings-display-title">ひょうじ</h3>
          ${selectMarkup("fontSize", "文字の大きさ", "絵本の文章やボタンの文字を調整します", fontSize, [
            { value: "small", label: "小さめ" },
            { value: "standard", label: "標準" },
            { value: "large", label: "大きめ" },
          ])}
          ${toggleMarkup("animationsEnabled", "アニメーション", "画面の動きをオン・オフします", ctx.settings.get("animationsEnabled"))}
          ${themeMarkup(theme)}
        </section>

        <section class="settings-group" aria-labelledby="settings-language-title">
          <h3 id="settings-language-title">ことば</h3>
          ${selectMarkup("language", "画面の言語", "日本語・English・中文に切り替えられます（テスト中）", language, [
            { value: "ja", label: "日本語" },
            { value: "en", label: "English（テスト中）" },
            { value: "zh-Hans", label: "中文（测试中）" },
          ])}
        </section>

        <section class="settings-group" aria-labelledby="settings-security-title">
          <h3 id="settings-security-title">おうちのひと</h3>
          <button type="button" class="settings-link" data-change-pin>
            <span><strong>おうちのひとの PIN を変更</strong><small>おうちのひと入口の4けたの暗証番号</small></span>
            <span aria-hidden="true">🔒</span>
          </button>
        </section>

        <section class="settings-group settings-group--info" aria-labelledby="settings-data-title">
          <h3 id="settings-data-title">データとプライバシー</h3>
          ${canExportRecords ? `
          <button type="button" class="settings-link" data-export-records>
            <span><strong>きろくを書き出す</strong><small>写真と思い出をバックアップ用ファイルに保存する</small></span>
            <span aria-hidden="true">⇩</span>
          </button>` : ""}
          <button type="button" class="settings-link" data-privacy>
            <span><strong>プライバシーについて</strong><small>写真や記録の保存場所を確認する</small></span>
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" class="settings-reset" data-reset-settings>設定を初期値にもどす</button>
        </section>

        <p class="settings-version">えほえほ web prototype</p>
      </div>`;
  },

  mount(ctx, params = {}, root) {
    const backTo = params.from || defaultBackTo(ctx);
    root.querySelector("[data-back]").onclick = () => ctx.go(backTo);
    root.querySelector("[data-change-pin]").onclick = () => openPinChange(ctx, root);

    const updateToggle = (button, enabled) => {
      button.classList.toggle("is-on", enabled);
      button.setAttribute("aria-checked", String(enabled));
      button.textContent = enabled ? t("common.on") : t("common.off");
    };

    root.querySelectorAll("[data-setting-toggle]").forEach((button) => {
      button.onclick = () => {
        const key = button.dataset.settingToggle;
        let enabled;
        if (key === "bgmEnabled") enabled = setBgmEnabled(!isBgmEnabled());
        if (key === "soundEnabled") enabled = setSoundEnabled(!isSoundEnabled());
        if (key === "narrationEnabled") enabled = setNarrationEnabled(!isNarrationEnabled());
        if (key === "animationsEnabled") {
          enabled = !ctx.settings.get("animationsEnabled");
          ctx.setAnimationsEnabled(enabled);
        }
        if (typeof enabled === "boolean") updateToggle(button, enabled);
      };
    });

    root.querySelector('[data-setting-select="fontSize"]').onchange = (event) => {
      ctx.setFontSize(event.target.value);
    };
    root.querySelector('[data-setting-select="language"]').onchange = (event) => {
      ctx.setLanguage(event.target.value);
      ctx.go("SETTINGS", { from: backTo });
    };

    const exportButton = root.querySelector("[data-export-records]");
    exportButton?.addEventListener("click", async () => {
      exportButton.disabled = true;
      try {
        const payload = ctx.session.exportData(ctx.settings.all());
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `ehon-backup-${date}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        ctx.notify(t("settings.exportSuccess"));
      } catch (_) {
        ctx.notify(t("settings.exportError"), "error");
      } finally {
        exportButton.disabled = false;
      }
    });

    const syncThemeButtons = () => {
      const activeTheme = ctx.settings.get("theme");
      root.querySelectorAll("[data-setting-theme]").forEach((button) => {
        const active = button.dataset.settingTheme === activeTheme;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    };
    root.querySelectorAll("[data-setting-theme]").forEach((button) => {
      button.onclick = () => {
        ctx.setThemeMode(button.dataset.settingTheme);
        syncThemeButtons();
      };
    });

    root.querySelector("[data-privacy]").onclick = () => {
      ctx.go("PRIVACY", { from: backTo });
    };
    root.querySelector("[data-reset-settings]").onclick = () => {
      if (!window.confirm(t("settings.resetConfirm"))) return;
      ctx.settings.reset();
      setBgmEnabled(true);
      setSoundEnabled(true);
      setNarrationEnabled(false);
      ctx.setAnimationsEnabled(true);
      ctx.setFontSize("standard");
      ctx.setLanguage("ja");
      ctx.setThemeMode("auto");
      ctx.go("SETTINGS", { from: backTo });
    };
  },
};

export const PrivacyScreen = {
  render() {
    return `
      <div class="screen settings-screen privacy-screen">
        <button class="back" data-back>‹ せってい</button>
        <div class="settings-heading">
          <span class="settings-heading-icon" aria-hidden="true">⌂</span>
          <div>
            <h2 class="settings-title">プライバシーについて</h2>
            <p class="settings-lead">たいせつな きろくの あつかい</p>
          </div>
        </div>
        <section class="privacy-card">
          <h3>このプロトタイプについて</h3>
          <p>撮った写真、絵本の進み具合、完成した思い出は、現在このブラウザの端末内に保存されます。</p>
          <p>現時点ではサーバーへ自動送信したり、公開したりする機能はありません。</p>
          <p>ブラウザのデータを消去すると、写真や記録も消えることがあります。おうちのひとの設定画面から、定期的にバックアップを書き出してください。</p>
        </section>
        <section class="privacy-card">
          <h3>写真を撮るとき</h3>
          <p>写真は絵本の中で使うために保存されます。家族以外の人が写り込まないよう、おうちの人と一緒に確認してください。</p>
        </section>
        <p class="privacy-note">正式版では、保存期間、削除方法、問い合わせ先を含む正式なプライバシー規約を掲載します。</p>
      </div>`;
  },

  mount(ctx, params = {}, root) {
    const backTo = params.from || defaultBackTo(ctx);
    root.querySelector("[data-back]").onclick = () => ctx.go("SETTINGS", { from: backTo });
  },
};
