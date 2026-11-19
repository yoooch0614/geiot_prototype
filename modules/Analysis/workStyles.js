// 遊びの記録と絵の特徴から 5 軸（O/C/Ex/A/ES）を出し、職業ごとの参照値と比較する。
// 計算は personality.js（設計案「個性推定アルゴリズム」）。診断・評価・将来の職業適性判定ではなく、
// 遊びや体験を振り返るための表示。外部には何も送らない。
import { AXES, analyzeObservations } from "./personality.js";


export const COLOR_FAMILY_LABELS = {
  red: "赤系",
  orange: "オレンジ系",
  yellow: "黄色系",
  green: "緑系",
  cyan: "水色系",
  blue: "青系",
  purple: "紫系",
  pink: "ピンク系",
};

const NAMED_COLORS = {
  red: [255, 0, 0],
  orange: [255, 165, 0],
  yellow: [255, 255, 0],
  green: [0, 128, 0],
  cyan: [0, 255, 255],
  blue: [0, 0, 255],
  purple: [128, 0, 128],
  pink: [255, 105, 180],
};

let cachedBigFive = null;

export async function loadBigFiveData(
  path = "content/occupation-big5.json",
  titlesPath = "content/work-style-titles-ja.json",
) {
  if (cachedBigFive) return cachedBigFive;
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Big Fiveの職業データを読み込めません (${response.status})`);
  const data = await response.json();
  let titleJa = {};
  try {
    const titleResponse = await fetch(titlesPath, { cache: "no-store" });
    if (titleResponse.ok) titleJa = (await titleResponse.json()).titles ?? {};
  } catch (error) {
    console.warn("職業の日本語表示名を読み込めませんでした", error);
  }
  cachedBigFive = { ...data, titleJa };
  return cachedBigFive;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseColor(value) {
  if (typeof value !== "string") return null;
  const source = value.trim().toLowerCase();
  if (NAMED_COLORS[source]) return NAMED_COLORS[source];

  const hex = source.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    if (![3, 4, 6, 8].includes(hex.length)) return null;
    const raw = hex.length <= 4
      ? hex.slice(0, 3).split("").map((digit) => `${digit}${digit}`).join("")
      : hex.slice(0, 6);
    return [0, 2, 4].map((index) => Number.parseInt(raw.slice(index, index + 2), 16));
  }

  if (!/^rgba?\(/.test(source)) return null;
  const body = source.slice(source.indexOf("(") + 1, source.lastIndexOf(")"));
  const channels = body.split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map((channel) => {
    const number = Number.parseFloat(channel);
    if (!Number.isFinite(number)) return null;
    return channel.endsWith("%") ? (number / 100) * 255 : number;
  });
  if (channels.length !== 3 || channels.some((channel) => channel == null)) return null;
  return channels.map((channel) => Math.max(0, Math.min(255, channel)));
}

function colorProfile(value) {
  const rgb = parseColor(value);
  if (!rgb) return null;
  const [red, green, blue] = rgb.map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const saturation = max ? delta / max : 0;
  if (saturation < 0.1 || max < 0.12) return null;

  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const family = hue < 15 || hue >= 345
    ? "red"
    : hue < 45
      ? "orange"
      : hue < 75
        ? "yellow"
        : hue < 165
          ? "green"
          : hue < 195
            ? "cyan"
            : hue < 255
              ? "blue"
              : hue < 285
                ? "purple"
                : "pink";
  return { family };
}

function normalize(value, range) {
  if (value == null || !range) return null;
  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 50;
  return clamp(((Number(value) - min) / (max - min)) * 100);
}

function occupationMatches(axes, dataset, limit = 3) {
  if (!dataset?.occupations?.length) return [];
  const definitions = AXES;
  const profile = Object.fromEntries(axes.map((axis) => [axis.id, axis.value]));
  const matches = dataset.occupations.map((occupation) => {
    let distance = 0;
    let dimensions = 0;
    const benchmark = [];
    definitions.forEach((trait, index) => {
      const value = normalize(occupation.scores?.[index], dataset.ranges?.[index]);
      if (value == null) return;
      benchmark.push(value);
      distance += Math.abs((profile[trait.id] ?? 50) - value);
      dimensions += 1;
    });
    const score = dimensions ? clamp(100 - distance / dimensions) : 0;
    return {
      code: occupation.code,
      title: occupation.title,
      titleJa: dataset.titleJa?.[occupation.code] || occupation.title,
      score: Math.round(score),
      benchmark,
    };
  });
  return matches
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}


function missionPages(book) {
  return (book?.pages ?? []).filter((page) => page.type === "mission");
}

// 好きな色は、5 軸には使わない（色と性格の関係には前例がないため）。記録した事実として数えるだけ。
function addColors(colorFamilies, features) {
  const palette = (features?.palette ?? []).filter((item) => Array.isArray(item.rgb));
  const total = palette.reduce((sum, item) => sum + (item.share || 0), 0) || 1;
  palette.forEach((item) => {
    const profile = colorProfile(`rgb(${item.rgb.join(",")})`);
    if (profile) colorFamilies[profile.family] = (colorFamilies[profile.family] || 0) + (item.share || 0) / total;
  });
}

// 記録を、遊びの記録（plays）と絵の特徴（drawings）、領域タグ、色にまとめる。
export function collectObservations(session, repo) {
  const drawings = [];
  const domains = {};
  const colorFamilies = {};
  // 絵の特徴がない古い記録は、従来の 1 色で補う。
  const addDrawing = (features, color) => {
    if (features) {
      drawings.push(features);
      addColors(colorFamilies, features);
      return;
    }
    const profile = colorProfile(color);
    if (profile) colorFamilies[profile.family] = (colorFamilies[profile.family] || 0) + 1;
  };
  const addDomains = (list) => list.forEach((domain) => { domains[domain] = (domains[domain] || 0) + 1; });

  // 完成済みの日記。古い記録には missionId やタグがないことがあるため、絵本のミッション順で補う。
  (session.memories ?? []).forEach((memory) => {
    const pages = missionPages(repo?.book(memory.bookId));
    let legacyIndex = 0;
    (memory.entries ?? []).forEach((entry) => {
      if (entry.kind !== "mission") return;
      const page = entry.missionId ? pages.find((item) => item.id === entry.missionId) : pages[legacyIndex];
      legacyIndex += 1;
      addDomains(entry.developmentDomains ?? page?.developmentDomains ?? []);
      addDrawing(entry.drawingFeatures, entry.vehicleColor || memory.bookColorValues?.[entry.missionId || page?.id]);
    });
  });

  // 読みかけの本で達成済みのミッション。デモの記録は絵本のページを持たないので、タグを直接持つ。
  const currentPages = missionPages(repo?.book(session.bookId));
  (session.runMissions ?? []).forEach((mission) => {
    const page = currentPages.find((item) => item.id === mission.missionId);
    addDomains(mission.developmentDomains ?? page?.developmentDomains ?? []);
    addDrawing(mission.drawingFeatures, mission.vehicleColor);
  });

  return { plays: session.plays ?? [], drawings, domains, colorFamilies };
}

export function buildBigFiveAnalysis(session, repo, dataset) {
  const evidence = collectObservations(session, repo);
  const { axes, stats, observed } = analyzeObservations(evidence);
  return {
    axes,
    stats,
    evidence: { ...evidence, total: observed },
    // 記録がまったくないときは "demo"（固定の初期値は出さず、「まだ少ない」と表示する）。
    source: observed ? "activity" : "demo",
    scores: axes.map((axis) => axis.value),
    // 値を出せる軸が 1 つもないときは、職業候補も出さない。
    matches: axes.some((axis) => axis.level !== "few") ? occupationMatches(axes, dataset) : [],
    datasetAvailable: Boolean(dataset?.occupations?.length && dataset?.traits?.length === AXES.length),
  };
}
