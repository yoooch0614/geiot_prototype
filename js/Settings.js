const STORAGE_KEY = "ehon.settings.v2";
const LEGACY_STORAGE_KEY = "ehon.settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  bgmEnabled: true,
  soundEnabled: true,
  narrationEnabled: false,
  fontSize: "standard",
  animationsEnabled: true,
  theme: "auto",
  language: "ja",
});

const ALLOWED = {
  bgmEnabled: (value) => typeof value === "boolean",
  soundEnabled: (value) => typeof value === "boolean",
  narrationEnabled: (value) => typeof value === "boolean",
  fontSize: (value) => ["small", "standard", "large"].includes(value),
  animationsEnabled: (value) => typeof value === "boolean",
  theme: (value) => ["auto", "day", "night"].includes(value),
  language: (value) => ["ja", "en", "zh-Hans"].includes(value),
};

function readSettings() {
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    const legacyRaw = currentRaw ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(currentRaw || legacyRaw || "{}");
    // 旧版本曾默认开启浏览器朗读。迁移后明确关闭，避免打开应用时突然发出机械声音。
    if (!currentRaw && legacyRaw) parsed.narrationEnabled = false;
    return Object.keys(DEFAULT_SETTINGS).reduce((out, key) => {
      const value = parsed?.[key];
      out[key] = ALLOWED[key](value) ? value : DEFAULT_SETTINGS[key];
      return out;
    }, {});
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

let state = readSettings();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // 隐私模式或存储空间不足时，设置仍保留在当前会话中。
  }
}

export const Settings = {
  get(key) {
    return state[key];
  },

  all() {
    return { ...state };
  },

  set(key, value) {
    if (!ALLOWED[key] || !ALLOWED[key](value)) return state[key];
    state = { ...state, [key]: value };
    persist();
    window.dispatchEvent(new CustomEvent("ehon-settings-change", {
      detail: { key, value, settings: { ...state } },
    }));
    return value;
  },

  update(values = {}) {
    Object.entries(values).forEach(([key, value]) => this.set(key, value));
    return this.all();
  },

  reset() {
    state = { ...DEFAULT_SETTINGS };
    persist();
    window.dispatchEvent(new CustomEvent("ehon-settings-change", {
      detail: { key: null, value: null, settings: { ...state } },
    }));
    return this.all();
  },
};
