// 紙に描いた絵の写真から、色と描き方の特徴を取り出す。
// 入力は RGBA の画素配列だけなので、ブラウザ（Canvas）でも node でも同じコードで動く。
// 診断ではなく、遊びや体験を振り返るための参考値。外部には何も送らない。

const PAPER_BIN = 32;
const PAPER_DISTANCE = 52;
const MARGIN_RATIO = 0.06;
// 代表色には、紙の色が混ざった「にじみ」の画素を入れない。紙から十分離れた鮮やかな画素だけを使う。
const PALETTE_DISTANCE = 80;
const MIN_SATURATION = 0.35;
const MIN_VALUE = 0.25;
const MIN_PALETTE_POINTS = 150;

function createRandom(seed = 7) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return { h: hue, s: max ? delta / max : 0, v: max };
}

// 紙は画面の大部分を占めるため、最も多い色の塊を紙の色とみなす。
// 紙がピンクや黄ばんだ白でも、画像ごとに差し引ける。
export function estimatePaperColor({ data, width, height }) {
  const bins = new Map();
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 20000)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 180) continue;
      const key = `${Math.floor(data[i] / PAPER_BIN)},${Math.floor(data[i + 1] / PAPER_BIN)},${Math.floor(data[i + 2] / PAPER_BIN)}`;
      const bin = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bin.count += 1; bin.r += data[i]; bin.g += data[i + 1]; bin.b += data[i + 2];
      bins.set(key, bin);
    }
  }
  // 暗い紙は写真でノイズが乗り、色の塊が散らばる。隣り合う塊も合算して一番多い場所を選ぶ。
  let best = null;
  let bestScore = 0;
  bins.forEach((bin, key) => {
    const [r, g, b] = key.split(",").map(Number);
    let score = 0;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dg = -1; dg <= 1; dg += 1) {
        for (let db = -1; db <= 1; db += 1) {
          score += bins.get(`${r + dr},${g + dg},${b + db}`)?.count ?? 0;
        }
      }
    }
    if (score > bestScore) { bestScore = score; best = bin; }
  });
  if (!best) return [255, 255, 255];
  return [best.r / best.count, best.g / best.count, best.b / best.count];
}

// k-means++ 風の初期化 + 繰り返し。固定シードなので、同じ入力なら同じ結果になる。
export function kMeans(points, k, { iterations = 20, seed = 7 } = {}) {
  if (!points.length) return [];
  const random = createRandom(seed);
  const count = Math.min(k, points.length);
  const centers = [points[Math.floor(random() * points.length)].vector.slice()];
  while (centers.length < count) {
    const distances = points.map((point) => Math.min(...centers.map((center) => squaredDistance(point.vector, center))));
    const total = distances.reduce((sum, value) => sum + value, 0);
    if (!total) break;
    let target = random() * total;
    let chosen = points.length - 1;
    for (let i = 0; i < distances.length; i += 1) {
      target -= distances[i];
      if (target <= 0) { chosen = i; break; }
    }
    centers.push(points[chosen].vector.slice());
  }

  let assignment = new Array(points.length).fill(0);
  for (let round = 0; round < iterations; round += 1) {
    let moved = false;
    points.forEach((point, index) => {
      let nearest = 0;
      let nearestDistance = Infinity;
      centers.forEach((center, centerIndex) => {
        const distance = squaredDistance(point.vector, center);
        if (distance < nearestDistance) { nearestDistance = distance; nearest = centerIndex; }
      });
      if (assignment[index] !== nearest) { assignment[index] = nearest; moved = true; }
    });
    if (!moved && round) break;
    centers.forEach((center, centerIndex) => {
      const members = points.filter((_, index) => assignment[index] === centerIndex);
      if (!members.length) return;
      center.forEach((_, axis) => {
        center[axis] = members.reduce((sum, member) => sum + member.vector[axis], 0) / members.length;
      });
    });
  }

  return centers.map((_, centerIndex) => {
    const members = points.filter((_, index) => assignment[index] === centerIndex);
    if (!members.length) return null;
    const rgb = [0, 1, 2].map((axis) => Math.round(members.reduce((sum, member) => sum + member.rgb[axis], 0) / members.length));
    return { rgb, hsv: rgbToHsv(...rgb), share: members.length / points.length };
  }).filter(Boolean).sort((a, b) => b.share - a.share);
}

function squaredDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return sum;
}

// 色相が円環であることを保つため、(彩度×cos色相, 彩度×sin色相, 明度) の3次元で距離を測る。
function colorVector({ h, s, v }) {
  const radian = (h * Math.PI) / 180;
  return [s * Math.cos(radian), s * Math.sin(radian), v];
}

// 画像の特徴を返す。
//  palette    : 紙を除いた、彩度のある色の代表色（K-means）と占有率
//  occupancy  : 紙を除いた描画の面積が、画面（余白を除く）に占める割合
//  detail     : 描画部分のうち、輪郭（急な色の変化）が占める割合。細かい線ほど大きい
//  colorCount : 一定以上の割合で使われた色相グループの数
//  darkShare  : 描画部分のうち、黒・濃い灰（線やぬりつぶし）が占める割合
export function analyzeDrawing(image, { k = 4 } = {}) {
  const { data, width, height } = image;
  const paper = estimatePaperColor(image);
  const marginX = Math.floor(width * MARGIN_RATIO);
  const marginY = Math.floor(height * MARGIN_RATIO);
  const colorful = [];
  const strict = [];
  let inner = 0;
  let foreground = 0;
  let dark = 0;
  let edge = 0;

  const paperDistance = (i) => {
    const dr = data[i] - paper[0];
    const dg = data[i + 1] - paper[1];
    const db = data[i + 2] - paper[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const isForeground = (i) => paperDistance(i) > PAPER_DISTANCE;

  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 60000)));
  for (let y = marginY; y < height - marginY - 1; y += step) {
    for (let x = marginX; x < width - marginX - 1; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 180) continue;
      inner += 1;
      if (!isForeground(i)) continue;
      foreground += 1;
      const right = (y * width + Math.min(width - 1, x + step)) * 4;
      const below = (Math.min(height - 1, y + step) * width + x) * 4;
      if (isForeground(right) !== true || isForeground(below) !== true) edge += 1;
      const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
      if (hsv.v < 0.3 || (hsv.s < 0.25 && hsv.v < 0.55)) { dark += 1; continue; }
      if (hsv.s >= 0.22 && hsv.v >= 0.2) {
        const point = { rgb: [data[i], data[i + 1], data[i + 2]], vector: colorVector(hsv), hue: hsv.h };
        colorful.push(point);
        if (hsv.s >= MIN_SATURATION && hsv.v >= MIN_VALUE && paperDistance(i) >= PALETTE_DISTANCE) strict.push(point);
      }
    }
  }

  const palette = kMeans(strict.length >= MIN_PALETTE_POINTS ? strict : colorful, k);
  const hueGroups = new Map();
  colorful.forEach((point) => {
    const group = Math.floor(point.hue / 45);
    hueGroups.set(group, (hueGroups.get(group) || 0) + 1);
  });
  const colorCount = [...hueGroups.values()].filter((value) => value / (colorful.length || 1) >= 0.05).length;

  return {
    paper: paper.map(Math.round),
    palette,
    occupancy: inner ? foreground / inner : 0,
    detail: foreground ? Math.min(1, (edge / foreground) * 2) : 0,
    colorCount,
    darkShare: foreground ? dark / foreground : 0,
    sampled: { inner, foreground },
  };
}

// 保存用に小さくまとめる。画像そのものは含めない。
export function compactDrawingFeatures(result) {
  if (!result) return null;
  return {
    palette: result.palette.map(({ rgb, share }) => ({ rgb, share: Math.round(share * 100) / 100 })),
    occupancy: Math.round(result.occupancy * 100) / 100,
    detail: Math.round(result.detail * 100) / 100,
    colorCount: result.colorCount,
    darkShare: Math.round(result.darkShare * 100) / 100,
  };
}

// ブラウザ用。写真の URL（data URL など）を縮小して読み、特徴量を返す。失敗したら null。
export async function analyzeDrawingUrl(url, maxSide = 512) {
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return compactDrawingFeatures(analyzeDrawing({ data, width, height }));
  } catch (_) {
    return null;
  }
}
