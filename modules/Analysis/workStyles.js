// Work Styles の参照データを、アプリの活動タグから「探索のための参考候補」へ
// 変換するロジック。職業適性や診断を行うものではなく、絵本で遊んだ内容と
// O*NET の仕事スタイルをつなぐプロトタイプ用の軽いスコアリングです。

const DEFAULT_AXES = [
  { id: "tactical", label: "戦術", value: 78, color: "#e5484d" },
  { id: "adventure", label: "冒険", value: 64, color: "#ec4899" },
  { id: "craft", label: "職人", value: 82, color: "#f5b301" },
  { id: "art", label: "芸術", value: 73, color: "#4caf50" },
  { id: "cooperation", label: "協調", value: 88, color: "#3b82f6" },
];

// 絵本ミッションの developmentDomains → アプリ内の5軸。
// タグが増えた場合は、ここに重みを追加するだけでよい。
const DOMAIN_AXIS_WEIGHTS = {
  "形": { tactical: 1, craft: 0.45 },
  "観察": { tactical: 0.85, adventure: 0.3 },
  "自然": { adventure: 1, tactical: 0.2 },
  "感覚": { adventure: 0.55, art: 0.65 },
  "色": { art: 1 },
  "もよう": { art: 0.9, craft: 0.45, tactical: 0.2 },
  "表現": { art: 1, cooperation: 0.2 },
  "協力": { cooperation: 1 },
  "生活習慣": { craft: 0.85, tactical: 0.35 },
  "自立": { craft: 0.85, adventure: 0.3 },
};

// O*NET の21軸を、アプリ内の5軸の組み合わせとして読むための初期モデル。
// これは研究用の確定対応表ではなく、プロトタイプの仮説なので、後から
// 保護者・専門家のレビューを受けて調整できるようデータとして分離している。
const STYLE_AXIS_WEIGHTS = {
  "Innovation": { art: 1, adventure: 0.4 },
  "Achievement Orientation": { craft: 0.85, tactical: 0.2 },
  "Intellectual Curiosity": { art: 0.75, adventure: 0.45, tactical: 0.2 },
  "Tolerance for Ambiguity": { adventure: 0.9, art: 0.35 },
  "Initiative": { adventure: 0.8, art: 0.35 },
  "Adaptability": { adventure: 0.8, art: 0.5, cooperation: 0.15 },
  "Self-Confidence": { adventure: 0.65, art: 0.3 },
  "Perseverance": { craft: 0.9, adventure: 0.25 },
  "Leadership Orientation": { tactical: 0.45, adventure: 0.4, cooperation: 0.2 },
  "Humility": { cooperation: 0.55, craft: 0.2 },
  "Sincerity": { cooperation: 0.8, craft: 0.2 },
  "Empathy": { cooperation: 0.95 },
  "Cooperation": { cooperation: 1 },
  "Optimism": { adventure: 0.7, art: 0.3, cooperation: 0.2 },
  "Social Orientation": { cooperation: 0.85, adventure: 0.2 },
  "Cautiousness": { tactical: 0.75, craft: 0.3 },
  "Attention to Detail": { tactical: 0.8, craft: 0.8, art: 0.2 },
  "Dependability": { craft: 0.8, tactical: 0.4, cooperation: 0.2 },
  "Integrity": { tactical: 0.4, cooperation: 0.3, craft: 0.3 },
  "Stress Tolerance": { adventure: 0.8, tactical: 0.2 },
  "Self-Control": { tactical: 0.7, craft: 0.35 },
};

let cachedWorkStyles = null;

export async function loadWorkStyles(
  path = "content/work-styles.json",
  titlesPath = "content/work-style-titles-ja.json",
) {
  if (cachedWorkStyles) return cachedWorkStyles;
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Work Styles を読み込めません (${response.status})`);
  const data = await response.json();
  let titleJa = {};
  try {
    const titleResponse = await fetch(titlesPath, { cache: "no-store" });
    if (titleResponse.ok) titleJa = (await titleResponse.json()).titles ?? {};
  } catch (error) {
    console.warn("Work Styles の日本語表示名を読み込めませんでした", error);
  }
  cachedWorkStyles = { ...data, titleJa };
  return cachedWorkStyles;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function axisMap() {
  return Object.fromEntries(DEFAULT_AXES.map((axis) => [axis.id, axis]));
}

function addDomainEvidence(evidence, domain) {
  const weights = DOMAIN_AXIS_WEIGHTS[domain];
  if (!weights) return false;
  evidence.total += 1;
  Object.entries(weights).forEach(([axis, weight]) => {
    evidence.axes[axis] = (evidence.axes[axis] || 0) + weight;
  });
  return true;
}

function missionPages(book) {
  return (book?.pages ?? []).filter((page) => page.type === "mission");
}

function collectEvidence(session, repo) {
  const evidence = { total: 0, axes: {}, domains: {} };

  // 完成済みの日記には、現在のバージョンなら missionId とタグを保存する。
  // 古い日記にはそれらがないため、絵本内の完了ミッション順で補完する。
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
      domains.forEach((domain) => {
        evidence.domains[domain] = (evidence.domains[domain] || 0) + 1;
        addDomainEvidence(evidence, domain);
      });
    });
  });

  // 読みかけの本で今すぐ分析画面を開いた場合も、達成済みミッションを反映する。
  const currentPages = missionPages(repo?.book(session.bookId));
  (session.runMissions ?? []).forEach((mission) => {
    const page = currentPages.find((candidate) => candidate.id === mission.missionId);
    (page?.developmentDomains ?? []).forEach((domain) => {
      evidence.domains[domain] = (evidence.domains[domain] || 0) + 1;
      addDomainEvidence(evidence, domain);
    });
  });

  return evidence;
}

function activityAxes(session, repo) {
  const evidence = collectEvidence(session, repo);
  if (!evidence.total) {
    return { axes: DEFAULT_AXES.map((axis) => ({ ...axis })), evidence, source: "demo" };
  }

  const axes = DEFAULT_AXES.map((axis) => {
    const weightedEvidence = evidence.axes[axis.id] || 0;
    // 36 は「未観測」を表す中立値。記録が増えるほど、ミッションタグから
    // 見えた傾向が 36〜100 の範囲で反映される。
    const value = 36 + (weightedEvidence / evidence.total) * 64;
    return { ...axis, value: Math.round(clamp(value)) };
  });
  return { axes, evidence, source: "activity" };
}

function workStyleScores(axes, dataset) {
  const axisValues = axisMap();
  axes.forEach((axis) => { axisValues[axis.id] = axis; });
  return (dataset?.dimensions ?? []).map((dimension) => {
    const weights = STYLE_AXIS_WEIGHTS[dimension.name] ?? {};
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (!totalWeight) return 50;
    const score = Object.entries(weights).reduce(
      (sum, [axis, weight]) => sum + (axisValues[axis]?.value ?? 50) * weight,
      0,
    ) / totalWeight;
    return Math.round(clamp(score));
  });
}

function normalize(value, range) {
  if (value == null || !range) return null;
  const [min, max] = range;
  if (max <= min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
}

function occupationMatches(scores, dataset, limit = 3) {
  if (!dataset?.occupations?.length) return [];
  const matches = dataset.occupations.map((occupation) => {
    let distance = 0;
    let dimensions = 0;
    const benchmark = [];
    occupation.dr.forEach((dr, index) => {
      const drScore = normalize(dr, dataset.ranges?.[index]?.dr);
      const wiScore = normalize(occupation.wi[index], dataset.ranges?.[index]?.wi);
      if (drScore == null && wiScore == null) return;
      // DR is a stronger structural signal; WI adds the source's impact signal.
      const value = drScore == null
        ? wiScore
        : wiScore == null
          ? drScore
          : drScore * 0.6 + wiScore * 0.4;
      benchmark.push(value);
      distance += Math.abs(scores[index] - value);
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
  return matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

export function buildWorkStyleAnalysis(session, repo, dataset) {
  const activity = activityAxes(session, repo);
  const scores = workStyleScores(activity.axes, dataset);
  return {
    axes: activity.axes,
    evidence: activity.evidence,
    source: activity.source,
    scores,
    matches: occupationMatches(scores, dataset),
    datasetAvailable: Boolean(dataset?.occupations?.length),
  };
}
