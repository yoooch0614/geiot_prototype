// 分析画面の「得意とこれから伸びるところ」「接し方」「好きなこと」「習い事の提案」の文を、計算結果から作る。
// 設計案の出力1〜3。診断ではなく、遊びを振り返る参考表示。外部には何も送らない。
// 文面は仮説で、専門家に確認してから確定する（接し方は特に）。
import { topFact, LEVEL_WEIGHT } from "./personality.js";

// ---- 出力1: 得意とこれから伸びるところ ----
const STRENGTH_TEXT = {
  openness: { high: "新しいものや「へんてこ」を楽しめる。はじめての題材でも自分のアイデアを出しやすい", low: "なじんだやり方で安心して取り組める。新しいことは少しずつ足すと伸びやすい" },
  conscientiousness: { high: "むずかしいお題でも最後までやりとげる。待つ・順番を守る場面で力を出しやすい", low: "短く区切ったお題だと集中が続きやすい。やりとげる経験を重ねると伸びやすい" },
  extraversion: { high: "すぐに動き出せて、人と一緒の場面を楽しめる", low: "じっくり見てから始めるタイプ。慣れると自分のペースで力を出せる" },
  agreeableness: { high: "困っている人に気づき、助ける選択をしやすい", low: "自分の思いをはっきり持っている。相手の気持ちを言葉にする経験で伸びやすい" },
  emotional_stability: { high: "うまくいかなくても気持ちを立て直しやすい", low: "気持ちが動きやすく、感じ取る力がある。見通しがあると安心して取り組める" },
};

// ---- 出力2: 子どもへの接し方 ----
const APPROACH_TEXT = {
  openness: { high: "「なんで？」に答えを急がず、一緒に考えるのを楽しむ。新しい場所や素材にふれる機会をつくる", low: "始める前に「このあと何をするか」を伝える。なじみのある遊びに新しさを1つだけ足す" },
  conscientiousness: { high: "段取りを任せてみる。できばえより工夫や続けたことをほめる。完璧にこだわりすぎていたら「ここまでで十分」と伝える", low: "お題を小さく区切り、終わりを見える形にする。1つできたらすぐにほめる" },
  extraversion: { high: "話を聞く時間や見せる場をつくる。体を動かす遊びを取り入れる。静かに座る時間は短めから始める", low: "新しい場では慣れる時間をとる。大勢より少人数や1対1から始める。急かさない" },
  agreeableness: { high: "思いやりを言葉で認める。「自分のしたいことも言っていいよ」と伝える", low: "登場人物の気持ちを一緒に言葉にする。順番や交代のある遊びを一緒にする" },
  emotional_stability: { high: "新しい挑戦を任せる。うまくいかなかった話も気軽に聞く", low: "先に見通しを伝える。気持ちに「くやしかったね」と名前をつけて受け止める。失敗しても大丈夫だった体験を一緒に振り返る" },
};

const HEDGE = "まだ見えてきた段階ですが、";

function sideOf(axis) {
  return axis.value >= 50 ? "high" : "low";
}

// 表示値が 60 以上、または 40 以下で、確からしさが「見えてきた」以上の軸を最大 2 つずつ。
// 「苦手」とは書かない。根拠の事実を 1 文添える。
export function strengthItems(axes) {
  const usable = axes.filter((axis) => axis.level !== "few");
  const pick = (test, side) => usable
    .filter(test)
    .sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))
    .slice(0, 2)
    .map((axis) => ({
      axis,
      fact: topFact(axis, side),
      text: `${axis.level === "emerging" ? HEDGE : ""}${STRENGTH_TEXT[axis.id][side]}`,
    }));
  return {
    strengths: pick((axis) => axis.value >= 60, "high"),
    growth: pick((axis) => axis.value <= 40, "low"),
  };
}

// 50 からの離れ方が大きい軸を上から 2 つ。確からしさが「まだ少ない」の軸は使わない。
export function approachItems(axes) {
  return axes
    .filter((axis) => axis.level !== "few")
    .sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))
    .filter((axis) => Math.abs(axis.value - 50) >= 3)
    .slice(0, 2)
    .map((axis) => {
      const side = sideOf(axis);
      return { axis, fact: topFact(axis, side), text: APPROACH_TEXT[axis.id][side] };
    });
}

const joinFact = (item) => (item.fact ? `${item.fact}。${item.text}。` : `${item.text}。`);

// 画面の 1 行にまとめた文。
export function strengthSummary(axes) {
  const { strengths, growth } = strengthItems(axes);
  const parts = [];
  if (strengths.length) parts.push(`得意：${strengths.map((item) => `${item.axis.label}（${joinFact(item)}）`).join(" ")}`);
  if (growth.length) parts.push(`これから伸びるところ：${growth.map((item) => `${item.axis.label}（${joinFact(item)}）`).join(" ")}`);
  return parts.join(" ／ ");
}

export function approachSummary(axes) {
  const items = approachItems(axes);
  return items.length ? items.map((item) => `${item.axis.label}：${joinFact(item)}`).join(" ") : "";
}

// 画面では、1 項目ずつ行を分けて見せる（見出し・事実・文）。長い文を 1 行にしない。
export function strengthLines(axes) {
  const { strengths, growth } = strengthItems(axes);
  return [
    ...strengths.map((item) => ({ badge: "得意", head: item.axis.label, fact: item.fact, text: item.text })),
    ...growth.map((item) => ({ badge: "これから伸びるところ", head: item.axis.label, fact: item.fact, text: item.text })),
  ];
}

export function approachLines(axes) {
  return approachItems(axes).map((item) => ({ head: item.axis.label, fact: item.fact, text: item.text }));
}

// PNG 書き出し用の短い 1 行（長い文は入りきらないため、軸の名前だけ）。
export function strengthShort(axes) {
  const { strengths, growth } = strengthItems(axes);
  const names = (list) => list.map((item) => item.axis.label).join("・");
  return [strengths.length ? `得意：${names(strengths)}` : "", growth.length ? `伸びるところ：${names(growth)}` : ""].filter(Boolean).join(" ／ ");
}

export function approachShort(axes) {
  return approachItems(axes).map((item) => item.axis.label).join("・");
}

// ---- 好きなこと（今回は、発達領域タグの記録から。画像認識は将来の発展）----
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

// 記録の中で、タグがよく付いた順に上位 2 つ。
export function likesText(domains = {}) {
  const top = Object.entries(domains)
    .filter(([domain]) => DOMAIN_LIKES[domain])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([domain]) => DOMAIN_LIKES[domain]);
  return top.length ? top.join("・") : null;
}

// ---- 出力3: 習い事の提案 ----
// 習い事ごとに、形式の属性（人とのかかわり・進め方・場の大きさ・競争を 0〜1）と、関係する好き（領域タグ）を持つ。
// 点 = 0.4 × 形式の合い方 + 0.4 × 好きの重なり + 0.2 × 楽しかった割合。係数は調整値で、根拠はない。
const SCORE_WEIGHTS = { form: 0.4, like: 0.4, enjoy: 0.2 };

// 5 軸から求めた「その子に合う形式」。確からしさの低い軸は、真ん中（0.5）に寄せる。
export function idealForm(axes) {
  const byId = Object.fromEntries(axes.map((axis) => [axis.id, axis]));
  // d は 50 からの差を −1〜+1 にしたもの。まだ少ない軸は重み 0 なので、0 になる。
  const d = (id) => ((byId[id].value - 50) / 50) * LEVEL_WEIGHT[byId[id].level];
  return {
    social: 0.5 + 0.5 * d("extraversion"), // Ex 高 → チーム
    procedure: 0.5 + 0.25 * (d("conscientiousness") - d("openness")), // C 高 → 手順、O 高 → 自由
    size: 0.5 + 0.25 * (d("extraversion") + d("emotional_stability")), // Ex 高 → 大人数、ES 低 → 少人数
    competition: 0.5 + 0.5 * d("emotional_stability"), // ES 高 → 競争
  };
}

function formFit(ideal, attrs) {
  const keys = ["social", "procedure", "size", "competition"];
  const gap = keys.reduce((sum, key) => sum + Math.abs((ideal[key] ?? 0.5) - (attrs[key] ?? 0.5)), 0) / keys.length;
  return 1 - gap;
}

function describeForm(attrs) {
  const parts = [];
  if (attrs.size <= 0.4) parts.push("少人数");
  else if (attrs.size >= 0.7) parts.push("大人数");
  if (attrs.social >= 0.7) parts.push("みんなで取り組む");
  else if (attrs.social <= 0.3) parts.push("ひとりで取り組む");
  if (attrs.procedure >= 0.7) parts.push("手順を積み上げて進む");
  else if (attrs.procedure <= 0.3) parts.push("自由に進める");
  if (attrs.competition >= 0.7) parts.push("勝ち負けがある");
  return parts.join("・");
}

// plays の domains から、その習い事に関係するミッションで楽しい顔を選んだ割合。記録がなければ 0.5。
function enjoyedShare(activity, plays) {
  const related = plays.filter((play) => play.mood && (play.domains ?? []).some((domain) => activity.domains.includes(domain)));
  if (!related.length) return 0.5;
  return related.filter((play) => play.mood === "happy").length / related.length;
}

export function scoreActivities(axes, domains, plays, activities) {
  const total = Object.values(domains).reduce((sum, count) => sum + count, 0);
  if (!activities?.length || !total) return [];
  const ideal = idealForm(axes);
  const raw = activities.map((activity) => ({
    activity,
    overlap: activity.domains.reduce((sum, domain) => sum + (domains[domain] || 0), 0) / total,
  }));
  // 好きの重なりは、いちばん高い習い事を 1 とした割合にする。
  const top = Math.max(...raw.map((item) => item.overlap)) || 1;
  return raw.map(({ activity, overlap }) => {
    const form = formFit(ideal, activity.attrs);
    const like = overlap / top;
    const enjoy = enjoyedShare(activity, plays);
    return {
      activity,
      form,
      like,
      enjoy,
      score: SCORE_WEIGHTS.form * form + SCORE_WEIGHTS.like * like + SCORE_WEIGHTS.enjoy * enjoy,
    };
  });
}

// 「合いそう」2 つ。「ちょっと挑戦」は、好きの重なりは高いが形式の合い方が低いものから 1 つ。
export function recommendActivities(axes, domains, plays, activities) {
  const scored = scoreActivities(axes, domains, plays, activities).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const fit = scored.slice(0, 2);
  const rest = scored.slice(2).filter((item) => item.like >= 0.5);
  const stretch = rest.sort((a, b) => (b.like - b.form) - (a.like - a.form))[0] ?? null;
  return { fit, stretch };
}

export function activityText(recommendation) {
  if (!recommendation) return null;
  const { fit, stretch } = recommendation;
  const lines = fit.map((item) => {
    const form = describeForm(item.activity.attrs);
    return `${item.activity.name}${form ? `（${form}）` : ""}`;
  });
  let text = `合いそう：${lines.join("・")}`;
  if (stretch) text += ` ／ ちょっと挑戦：${stretch.activity.name}`;
  return `${text}（サンプルデータ）`;
}

export function activityLines(recommendation) {
  if (!recommendation) return [];
  const lines = recommendation.fit.map((item) => ({ badge: "合いそう", head: item.activity.name, text: describeForm(item.activity.attrs) }));
  if (recommendation.stretch) lines.push({ badge: "ちょっと挑戦", head: recommendation.stretch.activity.name, text: describeForm(recommendation.stretch.activity.attrs) });
  return lines;
}

export function activityShort(recommendation) {
  if (!recommendation) return "";
  const names = recommendation.fit.map((item) => item.activity.name).join("・");
  return `合いそう：${names}${recommendation.stretch ? ` ／ 挑戦：${recommendation.stretch.activity.name}` : ""}`;
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
