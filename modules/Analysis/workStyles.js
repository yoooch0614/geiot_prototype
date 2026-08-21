// Big Five (O/C/Ex/A/ES) の参考スコアを、絵本の活動記録と
// アップロード写真の色から作り、職業ごとの参照値と比較する。
// 診断・評価・将来の職業適性判定ではなく、遊びや体験を振り返るための表示。

const DEFAULT_AXES = [
  { id: "openness", shortLabel: "O", label: "開放性", value: 72, color: "#e5484d" },
  { id: "conscientiousness", shortLabel: "C", label: "誠実性", value: 78, color: "#f5b301" },
  { id: "extraversion", shortLabel: "Ex", label: "外向性", value: 66, color: "#ec4899" },
  { id: "agreeableness", shortLabel: "A", label: "協調性", value: 84, color: "#3b82f6" },
  { id: "emotional_stability", shortLabel: "ES", label: "情緒安定性", value: 70, color: "#4caf50" },
];

// 絵本ミッションの developmentDomains → Big Five の初期参考重み。
// 研究用の確定対応表ではなく、後からレビューして調整できる仮説モデル。
const DOMAIN_TRAIT_WEIGHTS = {
  "形": { conscientiousness: 0.65, openness: 0.25 },
  "観察": { openness: 0.55, conscientiousness: 0.4 },
  "自然": { openness: 0.55, emotional_stability: 0.25 },
  "感覚": { openness: 0.75, emotional_stability: 0.2 },
  "色": { openness: 0.8, extraversion: 0.15 },
  "もよう": { openness: 0.7, conscientiousness: 0.35 },
  "表現": { openness: 0.65, extraversion: 0.55 },
  "協力": { agreeableness: 1, extraversion: 0.25 },
  "生活習慣": { conscientiousness: 0.85, emotional_stability: 0.25 },
  "自立": { conscientiousness: 0.6, extraversion: 0.3, emotional_stability: 0.35 },
};

// 写真から得た色は、ミッションタグを補助する証拠として加える。
// 1色の影響をタグ1個より少し弱くし、写真だけで結果が決まりすぎないようにする。
const COLOR_EVIDENCE_WEIGHT = 0.8;
const COLOR_TRAIT_WEIGHTS = {
  red: { extraversion: 0.7, openness: 0.3, emotional_stability: 0.25 },
  orange: { extraversion: 0.6, openness: 0.45, conscientiousness: 0.25 },
  yellow: { openness: 0.65, extraversion: 0.45, conscientiousness: 0.2 },
  green: { agreeableness: 0.7, emotional_stability: 0.35, openness: 0.3 },
  cyan: { openness: 0.55, agreeableness: 0.5, emotional_stability: 0.25 },
  blue: { agreeableness: 0.6, emotional_stability: 0.45, openness: 0.2 },
  purple: { openness: 0.8, extraversion: 0.35, agreeableness: 0.2 },
  pink: { agreeableness: 0.5, openness: 0.7, extraversion: 0.35 },
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
  return { family, weights: COLOR_TRAIT_WEIGHTS[family] };
}

function traitDefinitions(dataset) {
  return Array.isArray(dataset?.traits) && dataset.traits.length === DEFAULT_AXES.length
    ? dataset.traits
    : DEFAULT_AXES;
}

function defaultValue(id) {
  return DEFAULT_AXES.find((axis) => axis.id === id)?.value ?? 50;
}

function addWeightedEvidence(evidence, weights, amount = 1) {
  if (!weights) return false;
  evidence.total += amount;
  Object.entries(weights).forEach(([trait, weight]) => {
    evidence.traits[trait] = (evidence.traits[trait] || 0) + weight * amount;
  });
  return true;
}

function addDomainEvidence(evidence, domain) {
  evidence.domains[domain] = (evidence.domains[domain] || 0) + 1;
  return addWeightedEvidence(evidence, DOMAIN_TRAIT_WEIGHTS[domain]);
}

function addColorEvidence(evidence, color) {
  const profile = colorProfile(color);
  if (!profile) return false;
  evidence.colorSamples += 1;
  evidence.colorFamilies[profile.family] = (evidence.colorFamilies[profile.family] || 0) + 1;
  return addWeightedEvidence(evidence, profile.weights, COLOR_EVIDENCE_WEIGHT);
}

function addMissionEvidence(evidence, domains, color) {
  domains.forEach((domain) => addDomainEvidence(evidence, domain));
  addColorEvidence(evidence, color);
}

function missionPages(book) {
  return (book?.pages ?? []).filter((page) => page.type === "mission");
}

function collectEvidence(session, repo) {
  const evidence = {
    total: 0,
    traits: {},
    domains: {},
    colorSamples: 0,
    colorFamilies: {},
  };

  // 完成済みの日記には、現在のバージョンなら missionId・タグ・色を保存する。
  // 古い日記にはそれらがない場合があるため、絵本のミッション順と旧色マップで補完する。
  (session.memories ?? []).forEach((memory) => {
    const pages = missionPages(repo?.book(memory.bookId));
    let legacyIndex = 0;
    (memory.entries ?? []).forEach((entry) => {
      if (entry.kind !== "mission") return;
      const page = entry.missionId
        ? pages.find((candidate) => candidate.id === entry.missionId)
        : pages[legacyIndex];
      legacyIndex += 1;
      const domains = entry.developmentDomains ?? page?.developmentDomains ?? [];
      const color = entry.vehicleColor || memory.bookColorValues?.[entry.missionId || page?.id] || null;
      addMissionEvidence(evidence, domains, color);
    });
  });

  // 読みかけの本で分析画面を開いた場合も、達成済みミッションを反映する。
  const currentPages = missionPages(repo?.book(session.bookId));
  (session.runMissions ?? []).forEach((mission) => {
    const page = currentPages.find((candidate) => candidate.id === mission.missionId);
    addMissionEvidence(evidence, page?.developmentDomains ?? [], mission.vehicleColor);
  });

  return evidence;
}

function activityAxes(session, repo, dataset) {
  const evidence = collectEvidence(session, repo);
  const definitions = traitDefinitions(dataset);
  if (!evidence.total) {
    return {
      axes: definitions.map((axis) => ({ ...axis, value: defaultValue(axis.id) })),
      evidence,
      source: "demo",
    };
  }

  const axes = definitions.map((axis) => {
    const weightedEvidence = evidence.traits[axis.id] || 0;
    // 36 は未観測を表す中立値。記録が増えるほど、活動と色の傾向を36〜100へ反映する。
    const value = 36 + (weightedEvidence / evidence.total) * 64;
    return { ...axis, value: Math.round(clamp(value)) };
  });
  return { axes, evidence, source: "activity" };
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
  const definitions = traitDefinitions(dataset);
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

export function buildBigFiveAnalysis(session, repo, dataset) {
  const activity = activityAxes(session, repo, dataset);
  return {
    axes: activity.axes,
    evidence: activity.evidence,
    source: activity.source,
    scores: activity.axes.map((axis) => axis.value),
    matches: occupationMatches(activity.axes, dataset),
    datasetAvailable: Boolean(dataset?.occupations?.length && dataset?.traits?.length === DEFAULT_AXES.length),
  };
}
