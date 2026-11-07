// 分析画面の「性格」「好きなこと」「習い事の提案」の文を、計算結果から作る。
// 診断ではなく、遊びや体験を振り返るための参考表示。外部には何も送らない。

const PERSONALITY_PHRASES = {
  openness: { head: "好奇心旺盛で", tail: "好奇心旺盛です" },
  conscientiousness: { head: "ていねいで", tail: "ていねいにやりとげます" },
  extraversion: { head: "のびのび表現し", tail: "のびのび表現します" },
  agreeableness: { head: "やさしく", tail: "やさしく人を思いやります" },
  emotional_stability: { head: "落ち着いていて", tail: "落ち着いて取り組みます" },
};

const DOMAIN_LIKES = {
  "形": "かたちづくり",
  "観察": "じっくり見ること",
  "自然": "しぜんやいきもの",
  "感覚": "さわって感じること",
  "色": "いろあそび",
  "もよう": "もようあそび",
  "表現": "お絵かき・表現",
  "協力": "みんなでやること",
  "生活習慣": "身のまわりのこと",
  "自立": "自分でやってみること",
};

// 値の高い順に上位 2 軸を使う。軸どうしの差がなければ、文は作らない。
export function personalityText(axes) {
  const ranked = [...axes].sort((a, b) => b.value - a.value);
  const [first, second] = ranked;
  if (!first || !second || first.value - ranked[ranked.length - 1].value < 3) return null;
  const a = PERSONALITY_PHRASES[first.id];
  const b = PERSONALITY_PHRASES[second.id];
  return a && b ? `${a.head}、${b.tail}` : null;
}

// 記録の中で、タグがよく付いた順に上位 2 つ。
export function likesText(domains = {}) {
  const top = Object.entries(domains)
    .filter(([domain]) => DOMAIN_LIKES[domain])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([domain]) => DOMAIN_LIKES[domain]);
  return top.length ? top.join("・") : null;
}

// 習い事: 向いている軸が他の軸より強いか（軸の平均との差）と、向いている領域のタグが
// 記録にどれだけあるかの合計で点をつけ、上位 2 つを返す。ルールベース。
export function recommendActivities(axes, domains, activities, limit = 2) {
  if (!activities?.length) return [];
  const mean = axes.reduce((sum, axis) => sum + axis.value, 0) / (axes.length || 1);
  const value = Object.fromEntries(axes.map((axis) => [axis.id, axis.value - mean]));
  const totalTags = Object.values(domains).reduce((sum, count) => sum + count, 0) || 1;
  return activities
    .map((activity) => {
      const axisScore = activity.axes.reduce((sum, id) => sum + (value[id] ?? 0), 0) / (activity.axes.length || 1);
      const tagShare = activity.domains.reduce((sum, domain) => sum + (domains[domain] || 0), 0) / totalTags;
      return { name: activity.name, score: axisScore + tagShare * 20 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.name);
}

let cachedActivities = null;

export function activitySamples() {
  return cachedActivities;
}

export async function loadActivitySamples(path = "content/extracurricular-sample.json") {
  if (cachedActivities) return cachedActivities;
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status}`);
    cachedActivities = (await response.json()).activities ?? [];
  } catch (error) {
    console.warn("習い事のサンプルデータを読み込めませんでした", error);
    cachedActivities = [];
  }
  return cachedActivities;
}
