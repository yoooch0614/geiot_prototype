// 発表のデモ用。URL に ?demo=1 を付けたときだけ、分析画面に「絵を足す」パネルを出す。
// 絵は端末内のファイルから読み、外部には送らない。実際の保存データ（session）には書き込まず、
// デモ専用の記録だけで分析を計算する。紐づけは content/demo/demo-drawings.json に書く。
import { analyzeDrawingUrl } from "./drawingFeatures.js";
import { buildBigFiveAnalysis } from "./workStyles.js";
import { drawingObservations, playObservations, METRICS, LEVEL_LABEL } from "./personality.js";
import { esc } from "../shared/utils.js?v=suki-no-tane-camera-fix-20260829-v2";

const CONFIG_PATH = "content/demo/demo-drawings.json";

const state = {
  config: null,
  files: new Map(),
  added: [],
  busy: false,
  message: "",
  flowHtml: "",
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
    plays: state.added.map((item) => item.play).filter(Boolean),
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
  state.flowHtml = "";
}

export function demoPanelMarkup() {
  const queued = (state.config?.drawings ?? []).filter((entry) => state.files.has(entry.file)).length;
  const total = state.config?.drawings?.length ?? 0;
  const upcoming = nextEntry();
  const off = upcoming && !state.busy ? "" : "disabled";
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
        <button type="button" class="demo-button" data-demo-step ${off}>1枚ずつ分析</button>
        <button type="button" class="demo-button" data-demo-auto ${off}>自動で分析</button>
        <button type="button" class="demo-button demo-button--sub" data-demo-all ${off}>すぐ全部足す</button>
        <button type="button" class="demo-button demo-button--quiet" data-demo-reset ${state.added.length ? "" : "disabled"}>リセット</button>
      </div>
      <p class="demo-status">選択済み ${state.files.size}枚 ／ 設定と一致 ${queued}枚 ／ 追加済み ${state.added.length}枚${state.message ? ` ／ ${esc(state.message)}` : ""}</p>
      ${thumbs ? `<div class="demo-thumbs">${thumbs}</div>` : ""}
    </section>
    `;
}

// ---- 分析のようす（1 枚ごとの数値化を順に見せる） ----

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const signed = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;
const TRAIT_BAR_MAX = 4;

function axisValues(ctx) {
  return buildBigFiveAnalysis(demoSession(), ctx.repo, null).axes;
}

const MOOD_LABEL = { happy: "たのしい", normal: "ふつう", hard: "むずかしかった" };

function playFacts(play) {
  if (!play) return '<span class="flow-muted">遊び方の記録なし</span>';
  const facts = [
    play.hardChosen != null ? (play.hardChosen ? "★むずかしい版を選んだ" : "ふつうのお題を選んだ") : null,
    play.retakes ? `撮り直し ${play.retakes}回` : null,
    play.unusual != null ? (play.unusual ? "「へんてこ」を選んだ" : "「いつもの」を選んだ") : null,
    play.addMore != null ? (play.addMore ? "自分からかきたした" : "かきたさずおしまい") : null,
    play.waitOk != null ? (play.waitOk ? "合図まで待てた" : "合図の前にタップした") : null,
    play.withPeople != null ? (play.withPeople ? "だれかと一緒を選んだ" : "ひとりを選んだ") : null,
    play.wantShow != null ? (play.wantShow ? "だれかに見せたい" : "見せたい人はなし") : null,
    play.helped != null ? (play.helped ? "助ける選択をした" : "見守る選択をした") : null,
    play.mood ? `きもち：${MOOD_LABEL[play.mood] || play.mood}` : null,
  ].filter(Boolean);
  return facts.map((text) => `<span class="flow-tag">${esc(text)}</span>`).join("");
}

function featureBlock(features, entry, domains, play) {
  const chips = features.palette.map((item) =>
    `<span class="flow-chip" style="background:rgb(${item.rgb.join(",")})">${Math.round(item.share * 100)}%</span>`).join("");
  const bar = (label, text, ratio) => `
    <div class="flow-feature"><span>${label}</span><div class="flow-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%"></i></div><b>${text}</b></div>`;
  const tags = domains.length ? domains.map((tag) => `<span class="flow-tag">${esc(tag)}</span>`).join("") : '<span class="flow-muted">タグなし</span>';
  return `
    <div class="flow-step">
      <h4>① 記録した事実（絵の特徴と遊び方）</h4>
      <div class="flow-chips">${chips}</div>
      ${bar("占有率", `${Math.round(features.occupancy * 100)}%`, features.occupancy / 0.5)}
      ${bar("線の細かさ", `${Math.round(features.detail * 100)}%`, features.detail / 0.6)}
      ${bar("色の数", `${features.colorCount}色`, (features.colorCount - 1) / 5)}
      <div class="flow-tags">${tags}</div>
      <div class="flow-tags">${playFacts(play)}</div>
    </div>`;
}

// この 1 枚から取れた指標（0〜1）。記録した事実と根拠の強さを並べる。
function metricRows(play, features) {
  const observed = { ...playObservations(play), ...drawingObservations(features) };
  return METRICS
    .filter((metric) => observed[metric.id] != null)
    .map((metric) => ({ metric, value: observed[metric.id] }));
}

const GRADE_CLASS = { precedent: "flow-grade--precedent", near: "flow-grade--precedent", concept: "flow-grade--concept", hypothesis: "flow-grade--hypothesis" };

function scoreBlock(rows, axes) {
  const body = rows.map(({ metric, value }) => {
    const axis = axes.find((item) => item.id === metric.axis);
    const sign = metric.sign < 0 ? "（逆向き）" : "";
    return `
      <div class="flow-score">
        <span class="flow-axis" style="color:${axis.color}">${esc(axis.shortLabel)}</span>
        <div class="flow-bar"><i style="width:${Math.round(value * 100)}%;background:${axis.color}"></i></div>
        <b>${value.toFixed(2)}</b>
        <small>${esc(metric.label)}${sign} ／ <span class="flow-grade ${GRADE_CLASS[metric.grade]}">${esc(GRADES_LABEL[metric.grade])}</span> ／ 重み ${metric.w}</small>
      </div>`;
  }).join("");
  return `
    <div class="flow-step">
      <h4>② 記録を指標（0〜1）にする</h4>
      ${body || '<p class="flow-muted">この絵から取れる指標はありません。</p>'}
      <p class="flow-formula">軸の値 ＝ 50 ＋ 100 × Σ(重み×回数×向き×(指標−0.5)) ÷ Σ(重み×回数) × N÷(N＋5)</p>
    </div>`;
}

const GRADES_LABEL = { precedent: "前例あり", near: "近い前例あり", concept: "構想由来・未確認", hypothesis: "仮説" };

const axisText = (axis) => (axis.level === "few" ? "まだ少ない" : String(axis.value));

function resultBlock(before, after, count) {
  const rows = after.map((axis, index) => {
    const previous = before[index];
    const diff = axis.value - previous.value;
    const change = axis.level === "few" ? "" : `<em class="${diff > 0 ? "up" : diff < 0 ? "down" : ""}">${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff)}</em>`;
    return `<div class="flow-result"><span style="color:${axis.color}">${esc(axis.label)}</span><b>${axisText(previous)} → ${axisText(axis)}</b>${change}<small>${esc(LEVEL_LABEL[axis.level])}（証拠 ${axis.evidence.toFixed(1)}）</small></div>`;
  }).join("");
  return `<div class="flow-step"><h4>③ ここまでの結果（${count}枚）</h4>${rows}</div>`;
}

function summaryBlock(axes) {
  const rows = axes.map((axis) => {
    const top = [...axis.parts].sort((a, b) => b.weight - a.weight)[0];
    const who = top ? `いちばん効いた指標：${esc(top.metric.label)}（${esc(GRADES_LABEL[top.metric.grade])}）` : "記録なし";
    return `<div class="flow-result"><span style="color:${axis.color}">${esc(axis.label)}</span><b>${axisText(axis)}</b><small>${esc(LEVEL_LABEL[axis.level])} ／ ${who}</small></div>`;
  }).join("");
  return `<div class="flow-step flow-step--final"><h4>最終結果（${state.added.length}枚）</h4>${rows}</div>`;
}

export function mountDemoPanel(ctx, root, params, refresh = () => {}) {
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

  const flow = () => root.querySelector("[data-demo-flow]");
  const setBusy = (busy) => {
    state.busy = busy;
    root.querySelectorAll("[data-demo-step],[data-demo-auto],[data-demo-all],[data-demo-reset]").forEach((button) => { button.disabled = busy; });
  };
  const updateStatus = () => {
    const status = root.querySelector(".demo-status");
    if (status) status.textContent = status.textContent.replace(/追加済み \d+枚/, `追加済み ${state.added.length}枚`);
  };
  const addThumb = (item) => {
    let box = root.querySelector(".demo-thumbs");
    if (!box) {
      box = document.createElement("div");
      box.className = "demo-thumbs";
      root.querySelector(".demo-panel").append(box);
    }
    box.insertAdjacentHTML("beforeend", `<figure class="demo-thumb"><img src="${esc(item.url)}" alt=""><figcaption>${esc(item.caption || item.file)}</figcaption></figure>`);
  };

  // 次の 1 枚を分析して足す。読み込めなければ null。再描画は呼び出し側で行う。
  const analyzeNext = async () => {
    const entry = nextEntry();
    if (!entry) return null;
    const url = URL.createObjectURL(state.files.get(entry.file));
    const drawingFeatures = await analyzeDrawingUrl(url);
    if (!drawingFeatures) {
      URL.revokeObjectURL(url);
      state.message = `${entry.file} を読み込めませんでした`;
      return null;
    }
    state.message = "";
    const domains = domainsFor(entry, ctx.repo);
    return { entry, url, drawingFeatures, domains };
  };
  const commit = ({ entry, url, drawingFeatures, domains }) => {
    const item = {
      file: entry.file,
      caption: entry.caption || "",
      url,
      play: entry.play ? { missionId: `demo-${state.added.length + 1}`, domains, started: true, completed: true, ...entry.play } : null,
      mission: {
        missionId: `demo-${state.added.length + 1}`,
        developmentDomains: domains,
        vehicleColor: null,
        drawingFeatures,
      },
    };
    state.added.push(item);
    return item;
  };

  // 1 枚ぶんの流れを、特徴 → 点数 → 結果の順に見せる。
  const showFlow = async () => {
    const entry = nextEntry();
    if (!entry) return false;
    const body = flow();
    const number = state.added.length + 1;
    const total = (state.config?.drawings ?? []).filter((candidate) => state.files.has(candidate.file)).length;
    const url = URL.createObjectURL(state.files.get(entry.file));
    body.innerHTML = `<div class="flow-head"><img src="${esc(url)}" alt=""><div><b>${number}枚目 ／ ${total}枚</b><span>${esc(entry.caption || entry.file)}</span></div></div><p class="flow-muted">読み取り中…</p>`;
    const drawingFeatures = await analyzeDrawingUrl(url);
    if (!drawingFeatures) {
      URL.revokeObjectURL(url);
      state.message = `${entry.file} を読み込めませんでした`;
      body.insertAdjacentHTML("beforeend", `<p class="flow-muted">${esc(state.message)}</p>`);
      return false;
    }
    const domains = domainsFor(entry, ctx.repo);
    const before = axisValues(ctx);
    const head = body.querySelector(".flow-head").outerHTML;
    body.innerHTML = head + featureBlock(drawingFeatures, entry, domains, entry.play);
    await sleep(900);
    const item = commit({ entry, url, drawingFeatures, domains });
    const after = axisValues(ctx);
    body.insertAdjacentHTML("beforeend", scoreBlock(metricRows(item.play ?? {}, drawingFeatures), after));
    await sleep(1400);
    body.insertAdjacentHTML("beforeend", resultBlock(before, after, state.added.length));
    addThumb(item);
    updateStatus();
    refresh();
    if (!nextEntry()) body.insertAdjacentHTML("beforeend", summaryBlock(after));
    state.flowHtml = body.innerHTML;
    return true;
  };

  root.querySelector("[data-demo-step]").onclick = async () => {
    if (state.busy) return;
    setBusy(true);
    await showFlow();
    setBusy(false);
    root.querySelectorAll("[data-demo-step],[data-demo-auto],[data-demo-all]").forEach((button) => { button.disabled = !nextEntry(); });
    root.querySelector("[data-demo-reset]").disabled = !state.added.length;
  };

  root.querySelector("[data-demo-auto]").onclick = async () => {
    if (state.busy) return;
    setBusy(true);
    while (await showFlow()) await sleep(1200);
    setBusy(false);
    root.querySelectorAll("[data-demo-step],[data-demo-auto],[data-demo-all]").forEach((button) => { button.disabled = !nextEntry(); });
    root.querySelector("[data-demo-reset]").disabled = !state.added.length;
  };

  // アニメーションなしで、選んだ絵を設定の順にすべて足す。
  root.querySelector("[data-demo-all]").onclick = async () => {
    if (state.busy) return;
    setBusy(true);
    for (let next = await analyzeNext(); next; next = await analyzeNext()) commit(next);
    setBusy(false);
    rerender();
  };

  root.querySelector("[data-demo-reset]").onclick = () => {
    if (state.busy) return;
    resetDemo();
    rerender();
  };
}
