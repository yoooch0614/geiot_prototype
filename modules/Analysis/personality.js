// 設計案「絵本ミッションによる個性推定アルゴリズム」の計算部分。
// 遊びの記録（plays）と絵の特徴（drawingFeatures）を、16 個の指標 → 5 軸（O/C/Ex/A/ES）へまとめる。
// すべて端末内で動き、外部には何も送らない。診断ではなく、遊びを振り返る手がかり。

export const AXES = [
  { id: "openness", shortLabel: "O", label: "開放性", color: "#e5484d" },
  { id: "conscientiousness", shortLabel: "C", label: "誠実性", color: "#f5b301" },
  { id: "extraversion", shortLabel: "Ex", label: "外向性", color: "#ec4899" },
  { id: "agreeableness", shortLabel: "A", label: "協調性", color: "#3b82f6" },
  { id: "emotional_stability", shortLabel: "ES", label: "情緒安定性", color: "#4caf50" },
];

// 根拠の強さ。表示の色分けと、確からしさの上限に使う。
export const GRADES = {
  precedent: "前例あり",
  near: "近い前例あり",
  concept: "構想由来・未確認",
  hypothesis: "仮説",
};

// 設計案の指標表（16 個）。w は根拠の強さによる重み、sign は向き。
// from は、記録のどこから 0〜1 の値を取るか。plays の各記録、または drawingFeatures。
export const METRICS = [
  { id: "persistence", axis: "conscientiousness", label: "粘り強さ", grade: "precedent", w: 1.0, sign: 1, source: "play" },
  { id: "waiting", axis: "conscientiousness", label: "待つ力", grade: "precedent", w: 1.0, sign: 1, source: "play" },
  { id: "challengeDone", axis: "conscientiousness", label: "挑戦の完了", grade: "precedent", w: 1.0, sign: 1, source: "play" },
  { id: "detail", axis: "conscientiousness", label: "線の細かさ", grade: "concept", w: 0.4, sign: 1, source: "drawing" },
  { id: "novelty", axis: "openness", label: "新しさを選ぶ", grade: "concept", w: 0.4, sign: 1, source: "play" },
  { id: "unusual", axis: "openness", label: "へんてこを選ぶ", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "addMore", axis: "openness", label: "自分からかきたす", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "colorCount", axis: "openness", label: "色の数", grade: "concept", w: 0.4, sign: 1, source: "drawing" },
  { id: "startSpeed", axis: "extraversion", label: "始める速さ", grade: "concept", w: 0.4, sign: 1, source: "play" },
  { id: "withPeople", axis: "extraversion", label: "人と一緒", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "wantShow", axis: "extraversion", label: "見せたい", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "occupancy", axis: "extraversion", label: "占有率", grade: "concept", w: 0.4, sign: 1, source: "drawing" },
  { id: "helping", axis: "agreeableness", label: "助ける選択", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "forSomeone", axis: "agreeableness", label: "だれかのために", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "enjoyed", axis: "emotional_stability", label: "楽しかった", grade: "hypothesis", w: 0.3, sign: 1, source: "play" },
  { id: "noQuit", axis: "emotional_stability", label: "途中でやめない", grade: "hypothesis", w: 0.3, sign: -1, source: "play" },
];

// 年齢帯の基準 m。当面は 0.5（利用データがたまったら同じ年齢帯の中央値に置き換える）。
export const BASELINE = 0.5;
// 記録が少ないときに真ん中へ寄せる強さ。N ÷ (N + K)。
export const SHRINK_K = 5;
// 確からしさの境目（証拠の量 W）。
export const LEVEL_FEW = 3;
export const LEVEL_CLEAR = 8;

// 絵の特徴を 0〜1 にする幅（手元の絵で観測した範囲）。
const DRAWING_SCALES = { occupancy: 0.5, detail: 0.6, colorCount: 5 };

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const unit = (value, scale) => clamp((Number(value) || 0) / scale);
const flag = (value) => (value === true ? 1 : value === false ? 0 : null);

// 1 回の遊び（play）から、各指標の観察値（0〜1、観察できなければ null）を取り出す。
// play の形: { missionId, started, completed, unusual, hardChosen, retakes, addMore, mood,
//             waitOk, startSec, who, shareWith, helped, novel, domains }
export function playObservations(play) {
  const hard = play.hardChosen === true;
  const retook = Number(play.retakes) > 0;
  const completed = play.completed === true ? 1 : 0;
  return {
    // むずかしい版や撮り直しのあとに、最後まで進めたか。
    persistence: hard || retook ? completed : null,
    waiting: flag(play.waitOk),
    // ★を選んだうち、描き終えたか。
    challengeDone: hard ? completed : null,
    novelty: flag(play.novel),
    unusual: flag(play.unusual),
    addMore: flag(play.addMore),
    // 始める速さは年齢差が大きい。年齢帯の基準と比べた 0〜1 を startSpeed に入れて渡す。
    startSpeed: Number.isFinite(play.startSpeed) ? clamp(play.startSpeed) : null,
    withPeople: flag(play.withPeople),
    wantShow: flag(play.wantShow),
    helping: flag(play.helped),
    forSomeone: flag(play.forFamily),
    enjoyed: play.mood ? (play.mood === "happy" ? 1 : 0) : null,
    // 描き始めたのに撮影せずに抜けたか（向きは −）。
    noQuit: play.started === true ? (completed ? 0 : 1) : null,
  };
}

export function drawingObservations(features) {
  if (!features) return {};
  return {
    detail: unit(features.detail, DRAWING_SCALES.detail),
    colorCount: unit((Number(features.colorCount) || 1) - 1, DRAWING_SCALES.colorCount),
    occupancy: unit(features.occupancy, DRAWING_SCALES.occupancy),
  };
}

// 指標ごとの観察数 n・合計 sum を集める。
export function collectMetricStats(plays = [], drawings = []) {
  const stats = Object.fromEntries(METRICS.map((metric) => [metric.id, { n: 0, sum: 0 }]));
  const add = (observed) => {
    Object.entries(observed).forEach(([id, value]) => {
      if (value == null || !stats[id]) return;
      stats[id].n += 1;
      stats[id].sum += value;
    });
  };
  plays.forEach((play) => add(playObservations(play)));
  drawings.forEach((features) => add(drawingObservations(features)));
  return stats;
}

function levelFor(evidence, hypothesisOnly) {
  let level = evidence < LEVEL_FEW ? "few" : evidence < LEVEL_CLEAR ? "emerging" : "clear";
  // 仮説の指標しかない軸は、証拠が多くても「見えてきた」までにとどめる。
  if (hypothesisOnly && level === "clear") level = "emerging";
  return level;
}

// 5 軸の計算。S = Σ w·n·s·(x−m) / Σ w·n × N/(N+k)、表示値 = 50 + 100·S（0〜100 に切る）。
export function computeAxes(stats) {
  return AXES.map((axis) => {
    const metrics = METRICS.filter((metric) => metric.axis === axis.id);
    let numerator = 0;
    let evidence = 0; // W = Σ w·n
    let count = 0; // N = Σ n
    const parts = [];
    metrics.forEach((metric) => {
      const { n, sum } = stats[metric.id];
      if (!n) return;
      const mean = sum / n;
      const contribution = metric.w * n * metric.sign * (mean - BASELINE);
      numerator += contribution;
      evidence += metric.w * n;
      count += n;
      parts.push({ metric, n, mean, contribution, weight: metric.w * n });
    });
    const raw = evidence ? (numerator / evidence) * (count / (count + SHRINK_K)) : 0;
    const score = Math.round(clamp(50 + 100 * raw, 0, 100));
    const hypothesisOnly = metrics.every((metric) => metric.grade === "hypothesis");
    const level = levelFor(evidence, hypothesisOnly);
    return {
      ...axis,
      // まだ少ないときは、値を出さずに真ん中に置く。
      value: level === "few" ? 50 : score,
      score,
      level,
      evidence,
      count,
      parts,
    };
  });
}

// 記録された事実の一文（根拠）。軸ごとに、いちばん効いた指標から作る。
function factSentence(part) {
  const { metric, n, mean } = part;
  const yes = Math.round(mean * n);
  const ratio = `${n} 回中 ${yes} 回`;
  switch (metric.id) {
    case "persistence": return `むずかしいお題や撮り直しのあとに、${ratio}、さいごまで進めました`;
    case "challengeDone": return `★のむずかしいお題を選んだ ${ratio}、描き終えました`;
    case "waiting": return `「まって」の合図を、${ratio}、待てました`;
    case "novelty": return `まだやったことのないミッションを、${ratio}で選びました`;
    case "unusual": return `「へんてこ」を、${ratio}で選びました`;
    case "addMore": return `描いたあと、自分から「かきたす」を ${ratio}で選びました`;
    case "withPeople": return `だれかと一緒を、${ratio}で選びました`;
    case "wantShow": return `だれかに見せたい気持ちを、${ratio}で選びました`;
    case "helping": return `こまっている子を助ける選択を、${ratio}でしました`;
    case "forSomeone": return `家族や友だちのために描くことを、${ratio}で選びました`;
    case "enjoyed": return `描いたあと、楽しい顔を ${ratio}で選びました`;
    case "noQuit": return `描き始めた ${n} 回のうち、撮影せずに抜けたのは ${yes} 回でした`;
    case "startSpeed": return `描き始めるまでの速さは、同じ年ごろの目安の ${Math.round(mean * 100)}% でした`;
    case "detail": return `絵の線の細かさは、${n} 枚の平均で ${Math.round(mean * 100)}%（目安 50%）でした`;
    case "colorCount": return `絵に使った色の数は、${n} 枚の平均で目安の ${Math.round(mean * 100)}% でした`;
    case "occupancy": return `絵が紙に占める広さは、${n} 枚の平均で目安の ${Math.round(mean * 100)}% でした`;
    default: return "";
  }
}

// 高い側・低い側のどちらに効いたかを見て、いちばん効いた指標の事実を返す。
export function topFact(axis, direction) {
  const signed = axis.parts
    .map((part) => ({ part, push: part.contribution * (direction === "high" ? 1 : -1) }))
    .filter((item) => item.push > 0)
    .sort((a, b) => b.push - a.push);
  return signed.length ? factSentence(signed[0].part) : "";
}

// 軸ごとの確からしさを、マッチ度の重み（まだ少ない 0、見えてきた 0.5、はっきり 1）に直す。
export const LEVEL_WEIGHT = { few: 0, emerging: 0.5, clear: 1 };
export const LEVEL_LABEL = { few: "まだ少ない", emerging: "見えてきた", clear: "はっきり" };

export function analyzeObservations({ plays = [], drawings = [] } = {}) {
  const stats = collectMetricStats(plays, drawings);
  const axes = computeAxes(stats);
  const observed = axes.reduce((sum, axis) => sum + axis.count, 0);
  return { axes, stats, observed };
}
