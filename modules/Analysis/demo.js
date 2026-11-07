// 発表のデモ用。URL に ?demo=1 を付けたときだけ、分析画面に「絵を足す」パネルを出す。
// 絵は端末内のファイルから読み、外部には送らない。実際の保存データ（session）には書き込まず、
// デモ専用の記録だけで分析を計算する。紐づけは content/demo/demo-drawings.json に書く。
import { analyzeDrawingUrl } from "./drawingFeatures.js";
import { esc } from "../shared/utils.js?v=suki-no-tane-camera-fix-20260829-v2";

const CONFIG_PATH = "content/demo/demo-drawings.json";

const state = {
  config: null,
  files: new Map(),
  added: [],
  busy: false,
  message: "",
};

export function isDemoMode() {
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

// 分析に渡す、デモ専用の記録。実際の session とは別。
export function demoSession() {
  return {
    bookId: null,
    memories: [],
    runMissions: state.added.map((item) => item.mission),
  };
}

async function loadConfig() {
  if (state.config) return state.config;
  try {
    const response = await fetch(CONFIG_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status}`);
    state.config = await response.json();
  } catch (error) {
    console.warn("デモの設定ファイルを読み込めませんでした", error);
    state.config = { drawings: [] };
  }
  return state.config;
}

function domainsFor(entry, repo) {
  if (Array.isArray(entry.developmentDomains) && entry.developmentDomains.length) return entry.developmentDomains;
  if (entry.missionId) {
    for (const book of repo?.books ?? []) {
      const page = (book.pages ?? []).find((candidate) => candidate.type === "mission" && candidate.id === entry.missionId);
      if (page) return page.developmentDomains ?? [];
    }
  }
  return [];
}

function nextEntry() {
  const done = new Set(state.added.map((item) => item.file));
  return (state.config?.drawings ?? []).find((entry) => state.files.has(entry.file) && !done.has(entry.file)) ?? null;
}

export function resetDemo() {
  state.added.forEach((item) => URL.revokeObjectURL(item.url));
  state.added = [];
  state.message = "";
}

export function demoPanelMarkup() {
  const queued = (state.config?.drawings ?? []).filter((entry) => state.files.has(entry.file)).length;
  const total = state.config?.drawings?.length ?? 0;
  const upcoming = nextEntry();
  const thumbs = state.added.map((item) => `
    <figure class="demo-thumb"><img src="${esc(item.url)}" alt=""><figcaption>${esc(item.caption || item.file)}</figcaption></figure>`).join("");
  return `
    <section class="demo-panel" aria-label="デモ用の絵の追加">
      <h3>デモ：絵を足すと、結果が変わります</h3>
      <p class="demo-note">設定: <code>${esc(CONFIG_PATH)}</code>（${total}枚分）。絵は端末内だけで読みます。</p>
      <div class="demo-actions">
        <label class="demo-button">絵のファイルを選ぶ
          <input type="file" accept="image/*" multiple hidden data-demo-files>
        </label>
        <button type="button" class="demo-button" data-demo-next ${upcoming && !state.busy ? "" : "disabled"}>つぎの絵を足す</button>
        <button type="button" class="demo-button demo-button--quiet" data-demo-reset ${state.added.length ? "" : "disabled"}>リセット</button>
      </div>
      <p class="demo-status">選択済み ${state.files.size}枚 ／ 設定と一致 ${queued}枚 ／ 追加済み ${state.added.length}枚${state.message ? ` ／ ${esc(state.message)}` : ""}</p>
      ${thumbs ? `<div class="demo-thumbs">${thumbs}</div>` : ""}
    </section>`;
}

export function mountDemoPanel(ctx, root, params) {
  const rerender = () => ctx.go("ANALYSIS", params);
  const input = root.querySelector("[data-demo-files]");
  if (!input) return;

  // 設定ファイルは非同期で読むため、初回だけ読み込み後に描き直す。
  if (!state.config) loadConfig().then(rerender);

  input.onchange = () => {
    state.files = new Map([...input.files].map((file) => [file.name, file]));
    const names = new Set((state.config?.drawings ?? []).map((entry) => entry.file));
    const unmatched = [...state.files.keys()].filter((name) => !names.has(name));
    state.message = unmatched.length ? `設定にないファイル: ${unmatched.slice(0, 3).join("、")}${unmatched.length > 3 ? " ほか" : ""}` : "";
    rerender();
  };

  root.querySelector("[data-demo-next]").onclick = async () => {
    const entry = nextEntry();
    if (!entry || state.busy) return;
    state.busy = true;
    const url = URL.createObjectURL(state.files.get(entry.file));
    const drawingFeatures = await analyzeDrawingUrl(url);
    state.busy = false;
    if (!drawingFeatures) {
      URL.revokeObjectURL(url);
      state.message = `${entry.file} を読み込めませんでした`;
      rerender();
      return;
    }
    state.message = "";
    state.added.push({
      file: entry.file,
      caption: entry.caption || "",
      url,
      mission: {
        missionId: `demo-${state.added.length + 1}`,
        developmentDomains: domainsFor(entry, ctx.repo),
        vehicleColor: null,
        drawingFeatures,
      },
    });
    rerender();
  };

  root.querySelector("[data-demo-reset]").onclick = () => {
    resetDemo();
    rerender();
  };
}
