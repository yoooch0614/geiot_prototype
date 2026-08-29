import { Settings } from "../../js/Settings.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
);

// 文章用の表示文字列。
// 日本語は空白がないため、ブラウザだけに任せると「個性の｜きっかけ」や
// 「未来は、｜ひとつ」のように、助詞・読点の直後で意味が切れることがある。
// U+2060 WORD JOINER は見た目の幅を増やさず、その境界だけ改行禁止にする。
// 内容は先に esc() するので、JSON から来た文章を安全に HTML へ出せる。
const JAPANESE_CHAR = "ぁ-んァ-ヶ一-龠々ー";
const WORD_JOINER = "\u2060";

function joinJapaneseBoundaries(value) {
  return String(value ?? "")
    // 複合助詞は先に処理する。
    .replace(new RegExp(`([${JAPANESE_CHAR}])((?:から|まで|ので|のに|ても|にも|には|では|とは))(?=[${JAPANESE_CHAR}])`, "gu"), `$1${WORD_JOINER}$2${WORD_JOINER}`)
    // 助詞を前後の語から離さない。短い文節が次の行に取り残されるのを防ぐ。
    .replace(new RegExp(`([${JAPANESE_CHAR}])([のはがをにへとやもで])(?=[${JAPANESE_CHAR}])`, "gu"), `$1${WORD_JOINER}$2${WORD_JOINER}`)
    // 読点を前後の文節から切らない。
    .replace(new RegExp(`([${JAPANESE_CHAR}])(、)(?=[${JAPANESE_CHAR}])`, "gu"), `$1${WORD_JOINER}$2${WORD_JOINER}`);
}

export function formatJapaneseCopy(value) {
  return joinJapaneseBoundaries(esc(value))
    // コンテンツ側で指定した改行は、そのまま表示上の改行にする。
    .replace(/\r?\n/g, "<br>");
}

// 画面やダイアログを HTML で追加したあとにも同じルールを適用する。
// テキストノードを直接更新するので、属性値や HTML タグは壊さない。
export function stabilizeJapaneseText(root) {
  if (!root || typeof document === "undefined") return;
  const walker = document.createTreeWalker(root, window.NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    const tag = parent?.tagName;
    if (parent && !["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "PRE"].includes(tag)) {
      nodes.push(node);
    }
    node = walker.nextNode();
  }
  nodes.forEach((textNode) => {
    textNode.nodeValue = joinJapaneseBoundaries(textNode.nodeValue);
  });
}

// ── 音まわり ────────────────────────────────────────────────
// <audio>（HTMLAudioElement）で鳴らしていたころは、iOS/Safari で「鳴るときと鳴らないときが
// ある」が消えなかった。要素ひとつひとつが「読み込み状態」「再生位置」「再生許可」を抱えるため、
// 連打・巻き戻し・画面切り替えのどれかとぶつかると、その要素だけ黙ってしまう。
//
// そこで Web Audio に切り替えた。音は起動時に一度だけ「デコード済みの音データ（AudioBuffer）」
// として読み込み、鳴らすたびに使い捨ての再生ノードを作って流す。
// ・状態を持つ要素が無いので、連打しても画面が切り替わっても詰まらない
// ・同じ音が重なっても平気（前の音を止める必要がない）
// ・鳴らす瞬間に読み込みは発生しない（＝取得待ちで無音になることがない）
//
// iOS では AudioContext が最初のユーザー操作まで停止(suspended)しているので、
// 最初のタップで resume() する（unlockAudio。app.js から登録）。
const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
let audioCtx = null;
const buffers = new Map();   // url → AudioBuffer（デコード済み）
const loading = new Map();   // url → 読み込み中のPromise（二重読み込み防止）

function context() {
  if (!audioCtx && AudioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

// 音を取ってきてデコードしておく。デコードは重いので一度きり。
function loadBuffer(url) {
  if (buffers.has(url)) return Promise.resolve(buffers.get(url));
  if (loading.has(url)) return loading.get(url);
  const ac = context();
  if (!ac) return Promise.resolve(null);

  const task = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((data) => ac.decodeAudioData(data))
    .then((buffer) => {
      buffers.set(url, buffer);
      loading.delete(url);
      return buffer;
    })
    .catch((err) => {
      // ファイルが無いのか、形式が読めないのかが分かるように残す（以前は握りつぶしていた）。
      loading.delete(url);
      console.warn(`[audio] 読み込めませんでした: ${url}`, err?.message ?? err);
      return null;
    });

  loading.set(url, task);
  return task;
}

function start(buffer) {
  const ac = context();
  if (!ac || !buffer) return;
  // 鳴らすたびに使い捨てのノードを作る。前の音が鳴っていても関係なく重ねられる。
  const source = ac.createBufferSource();
  source.buffer = buffer;
  source.connect(ac.destination);
  source.start(0);
}

// 最初のユーザー操作のときに呼ぶ。iOS はここで resume() しないと、以降どこでも鳴らない。
// 起動直後のタイトル画面は「まだ一度も触っていない」状態なので、BGMもここで鳴りはじめる。
export function unlockAudio() {
  const ac = context();
  if (!ac) return;
  if (ac.state === "suspended") {
    ac.resume().then(startBgmIfReady).catch(() => {});
  } else {
    startBgmIfReady();
  }
}

// 起動時に呼んでおく。鳴らす場面で取得待ちが起きないようにする。
export function preloadAudio(urls) {
  (urls ?? []).forEach((url) => { if (url) loadBuffer(url); });
}

function playAudioNow(url) {
  if (!url) return;
  const ac = context();
  if (!ac) return;
  // タップの中から呼ばれるので、止まっていたらここでも動かしておく。
  if (ac.state === "suspended") ac.resume().catch(() => {});

  const buffer = buffers.get(url);
  if (buffer) {
    start(buffer);
    return;
  }
  // まだ読み込めていない音（絵本ごとのナレーションなど）は、読み込み次第すぐ鳴らす。
  loadBuffer(url).then(start);
}

// 効果音（ボタン音・ページめくり・達成音）は設定でまとめて切り替える。
export function playAudio(url) {
  if (!isSoundEnabled()) return;
  playAudioNow(url);
}

// 朗読は効果音とは別の設定にする。音を切っても、朗読だけは聞けるようにする。
export function playNarration(url) {
  if (!isNarrationEnabled()) return;
  playAudioNow(url);
}

// まだ専用ナレーション音源がないページは、ブラウザ標準の読み上げを使う。
// 専用音源がある場合は StoryScreen 側で playNarration() を優先する。
export function speakNarration(text) {
  if (!isNarrationEnabled() || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  stopNarration();
  const utterance = new window.SpeechSynthesisUtterance(String(text));
  utterance.lang = "ja-JP";
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  utterance.onstart = () => { speaking = true; };
  utterance.onend = () => { speaking = false; };
  utterance.onerror = () => { speaking = false; };
  window.speechSynthesis.speak(utterance);
}

export function stopNarration() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  speaking = false;
}

// 何度も短い間隔で鳴らす効果音（ページめくり音など）用。先に読み込んでおくためのラッパー。
export function createRepeatableSound(url) {
  if (!url) return () => {};
  loadBuffer(url);
  return () => playAudio(url);
}

// ── BGM ────────────────────────────────────────────────────
// 効果音と違って、ずっと繰り返し鳴りつづける音。
// ・音量は効果音（＝そのままの大きさ＝1.0）より少し小さくして、ボタン音を邪魔しない。
// ・同じ曲を指定しているあいだは鳴らしっぱなしにする。トップ→あそびえらび→本だなと
//   画面を移っても、曲が頭から鳴り直したり途切れたりしない。
// ・BGMを流さない画面（絵本を読んでいる最中など）に移ったら stopBgm() で止める。
export const HOME_BGM = "assets/home-bgm.mp3";
export const HOME_NIGHT_BGM = "assets/home-bgm-night.mp3";
const BGM_VOLUME = 0.35;   // 効果音を 1.0 としたときの大きさ。ここを変えれば音量調整できる。
const BGM_FADE = 0.4;      // 止めるときのフェードアウト（秒）。ぶつっと切れないように。

let bgmUrl = null;         // いま鳴らしたいBGM（画面が決める）
let bgmSource = null;
let bgmGain = null;
const appQuery = new URLSearchParams(window.location.search);
const isCompanyEmbed = appQuery.get("source") === "company";
let embeddedAudioEnabled = !isCompanyEmbed || appQuery.get("sound") !== "off";
const storedAudioSettings = {
  bgm: Settings.get("bgmEnabled") !== false,
  sound: Settings.get("soundEnabled") !== false,
  narration: Settings.get("narrationEnabled") !== false,
};
let embeddedAudioBackup = {
  bgm: storedAudioSettings.bgm,
  sound: storedAudioSettings.sound,
  narration: storedAudioSettings.narration,
};
// company website の speaker が iframe product の BGM・効果音・朗読をまとめて制御する。
let bgmEnabled = embeddedAudioEnabled && storedAudioSettings.bgm;
let soundEnabled = embeddedAudioEnabled && storedAudioSettings.sound;
let narrationEnabled = embeddedAudioEnabled && storedAudioSettings.narration;
let speaking = false;

// 鳴らす条件（曲が読み込み済み・AudioContextが動いている）がそろっていたら鳴らしはじめる。
// 起動直後はまだ一度も画面を触っていないので AudioContext が止まっている。その場合は
// 何もせず、最初のタップ（unlockAudio）からもう一度ここに来る。
function startBgmIfReady() {
  const ac = context();
  if (!ac || !bgmEnabled || !bgmUrl || bgmSource) return;
  if (ac.state === "suspended") return;
  const buffer = buffers.get(bgmUrl);
  if (!buffer) return;

  bgmGain = ac.createGain();
  bgmGain.gain.value = BGM_VOLUME;
  bgmGain.connect(ac.destination);

  bgmSource = ac.createBufferSource();
  bgmSource.buffer = buffer;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmSource.start(0);
}

export function playBgm(url) {
  if (!url || bgmUrl === url) return;   // 同じ曲ならそのまま鳴らしつづける
  stopBgm();
  bgmUrl = url;
  // 読み込みが終わったら鳴らす。待っているあいだに別の画面へ移っていたら鳴らさない。
  loadBuffer(url).then(() => { if (bgmUrl === url) startBgmIfReady(); });
}

function stopBgmPlayback() {
  if (!bgmSource) return;
  const ac = context();
  const source = bgmSource;
  const gain = bgmGain;
  bgmSource = null;
  bgmGain = null;
  try {
    const now = ac.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + BGM_FADE);
    source.stop(now + BGM_FADE + 0.05);
  } catch (_) {
    try { source.stop(); } catch (_) {}
  }
}

export function stopBgm() {
  bgmUrl = null;
  stopBgmPlayback();
}

export function isBgmEnabled() {
  return bgmEnabled;
}

export function setBgmEnabled(enabled) {
  bgmEnabled = embeddedAudioEnabled && Boolean(enabled);
  if (!isCompanyEmbed) Settings.set("bgmEnabled", bgmEnabled);
  if (bgmEnabled) startBgmIfReady();
  else stopBgmPlayback();
  return bgmEnabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = embeddedAudioEnabled && Boolean(enabled);
  if (!isCompanyEmbed) Settings.set("soundEnabled", soundEnabled);
  return soundEnabled;
}

export function isNarrationEnabled() {
  return narrationEnabled;
}

export function setNarrationEnabled(enabled) {
  narrationEnabled = embeddedAudioEnabled && Boolean(enabled);
  if (!isCompanyEmbed) Settings.set("narrationEnabled", narrationEnabled);
  if (!narrationEnabled) stopNarration();
  return narrationEnabled;
}

// company website の speaker から、埋め込みアプリの音声もまとめて切り替える。
// 埋め込み中は設定を localStorage に保存せず、元アプリの音声設定を汚さない。
export function setEmbeddedAudioEnabled(enabled) {
  if (!isCompanyEmbed) return Boolean(enabled);

  const next = Boolean(enabled);
  if (next === embeddedAudioEnabled) return next;

  if (!next) {
    embeddedAudioBackup = {
      bgm: bgmEnabled,
      sound: soundEnabled,
      narration: narrationEnabled,
    };
  }

  embeddedAudioEnabled = next;
  bgmEnabled = next && embeddedAudioBackup.bgm;
  soundEnabled = next && embeddedAudioBackup.sound;
  narrationEnabled = next && embeddedAudioBackup.narration;

  if (bgmEnabled) startBgmIfReady();
  else stopBgmPlayback();
  if (!narrationEnabled) stopNarration();
  return next;
}

// ボタンを押したときの音。押した手ごたえとして、どの画面のボタンでも鳴る（登録は app.js）。
export const CLICK_SOUND = "assets/button.mp3";

// 達成の演出音。毎回同じだと飽きるので、このなかからランダムに1つ鳴らす。
// ミッション達成（Achieve）でも絵本を読み終えたとき（Complete）でも同じものを使う。
export const CELEBRATION_SOUNDS = ["assets/jajan.mp3", "assets/shinein.mp3", "assets/tousen.mp3"];
export function playCelebrationSound(ctx) {
  const sound = CELEBRATION_SOUNDS[Math.floor(Math.random() * CELEBRATION_SOUNDS.length)];
  playAudio(ctx.repo.assetUrl(sound));
}

// カメラ（ファイル入力）を開き、選ばれた画像をdataURL化して onPicked に渡す。
// アプリ内カメラが使えなかったときのフォールバックとして使う。
export function openCamera(ctx, onPicked) {
  const input = ctx.els.camera;
  if (!input) return;
  input.value = "";
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPicked(reader.result);
    reader.readAsDataURL(file);
  };
  input.click();
}

const CAMERA_CANVAS_WIDTH = 800;
const CAMERA_CANVAS_HEIGHT = 600;

// カメラ・Mask・完成画像のすべてが共有する論理キャンバス。
// CSS の表示幅や devicePixelRatio はこの座標系の外側で吸収するため、
// 端末ごとに x/y を書き換える必要がない。
const CAMERA_COORDINATE_SPACE = {
  width: CAMERA_CANVAS_WIDTH,
  height: CAMERA_CANVAS_HEIGHT,
};

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function coverGeometry(sourceWidth, sourceHeight, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawnWidth = sourceWidth * scale;
  const drawnHeight = sourceHeight * scale;
  return {
    scale,
    offsetX: (width - drawnWidth) / 2,
    offsetY: (height - drawnHeight) / 2,
  };
}

// frame は元画像の実ピクセル座標で書かれているため、実際の camera view と同じ
// object-fit: cover の座標系へ変換する。以前は x/y を別々に引き伸ばしていたため、
// 画像比率が違うページや端末では点線と完成写真がずれることがあった。
function missionFrameForCanvas(image, frame, width = CAMERA_CANVAS_WIDTH, height = CAMERA_CANVAS_HEIGHT) {
  const sourceWidth = image?.naturalWidth || image?.width || 1000;
  const sourceHeight = image?.naturalHeight || image?.height || 750;
  const sourceFrame = frame
    ? {
        x: Number(frame.x) || 0,
        y: Number(frame.y) || 0,
        width: Number(frame.width) || sourceWidth * 0.5,
        height: Number(frame.height) || sourceHeight * 0.5,
        radius: Number(frame.radius) || 24,
      }
    : {
        x: sourceWidth * 0.25,
        y: sourceHeight * 0.25,
        width: sourceWidth * 0.5,
        height: sourceHeight * 0.5,
        radius: 24,
      };
  const geometry = coverGeometry(sourceWidth, sourceHeight, width, height);
  const left = geometry.offsetX + sourceFrame.x * geometry.scale;
  const top = geometry.offsetY + sourceFrame.y * geometry.scale;
  const right = left + sourceFrame.width * geometry.scale;
  const bottom = top + sourceFrame.height * geometry.scale;
  const clippedLeft = clamp(left, 0, width);
  const clippedTop = clamp(top, 0, height);
  const clippedRight = clamp(right, 0, width);
  const clippedBottom = clamp(bottom, 0, height);
  return {
    x: clippedLeft,
    y: clippedTop,
    width: Math.max(1, clippedRight - clippedLeft),
    height: Math.max(1, clippedBottom - clippedTop),
    radius: sourceFrame.radius * geometry.scale,
  };
}

function repeatGroupsFor(repeatGroups) {
  const groups = Array.isArray(repeatGroups)
    ? repeatGroups
    : repeatGroups && typeof repeatGroups === "object" ? [repeatGroups] : [];
  return groups.map((group) => {
    const instances = (group.instances ?? [])
      .filter((instance) => instance && typeof instance === "object")
      .map((instance, index) => ({
        ...instance,
        groupId: instance.groupId || group.groupId || `repeat-${index}`,
      }))
      .filter((instance) => [instance.x, instance.y, instance.width, instance.height]
        .every((value) => Number.isFinite(Number(value))) && Number(instance.width) > 0 && Number(instance.height) > 0);
    const representative = typeof group.representative === "string"
      ? instances.find((instance) => instance.id === group.representative)
      : instances[0];
    return { ...group, instances, representative };
  }).filter((group) => group.instances.length && group.representative);
}

// Mask の白い部分全体を「撮影する範囲」にする。
// 代表の1軒・1輪だけを切り出すと、撮影時の個数と完成後の個数が合わないため、
// 車は1台、家は3軒、花は10輪という実際の Mask 全体をそのまま使う。
function maskBounds(mask, fallbackFrame = null) {
  if (!mask?.width || !mask?.height) return fallbackFrame;
  const data = mask.getContext("2d").getImageData(0, 0, mask.width, mask.height).data;
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (data[(y * mask.width + x) * 4 + 3] < 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return fallbackFrame;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    radius: Number(fallbackFrame?.radius) || 24,
  };
}

function logicalCanvasContext(canvas, width, height) {
  const ratio = Math.max(1, Math.min(3, Number(window.devicePixelRatio) || 1));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.aspectRatio = `${width} / ${height}`;
  canvas.dataset.coordinateScale = String(ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

function beginLogicalDraw(context, width, height) {
  const ratio = Number(context.canvas.dataset.coordinateScale) || 1;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  return { width, height, ratio };
}

// 写真の形は各ページが明示的に持つ Mask 画像から作る。
// Mask は「写真を見せる部分が白、それ以外が透明」の画像で、背景絵の色は見ない。
async function loadMissionMask(maskUrl, width = CAMERA_CANVAS_WIDTH, height = CAMERA_CANVAS_HEIGHT) {
  if (!maskUrl) return null;
  const image = await loadImageElement(maskUrl);
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const context = mask.getContext("2d");
  context.imageSmoothingEnabled = false;
  drawCoverImage(context, image, width, height);
  return mask;
}

// ミッションページの画像から、カメラの点線ガイドに必要な情報を作る。
export async function createMissionGuide(backgroundUrl, frame, maskUrl = null, repeatGroups = []) {
  try {
    const [image, mask] = await Promise.all([
      loadImageElement(backgroundUrl),
      loadMissionMask(maskUrl),
    ]);
    const normalizedGroups = repeatGroupsFor(repeatGroups);
    const fallbackFrame = missionFrameForCanvas(image, frame);
    const mappedFrame = maskBounds(mask, fallbackFrame);
    return {
      width: CAMERA_CANVAS_WIDTH,
      height: CAMERA_CANVAS_HEIGHT,
      // frame と mask は同じ全体範囲を指す。これで撮影時と填色時の位置・大きさが一致する。
      frame: mappedFrame,
      fullMask: mask,
      // Mask 全体を表示するので、家3軒・花10輪も撮影画面にそのまま出る。
      mask,
      repeatGroups: normalizedGroups,
    };
  } catch (error) {
    // このページが Mask を指定しているのに読めない場合、矩形ガイドを見せず
    // カメラ自体をフォールバックへ回す。Mask のない旧ページだけは従来枠を使う。
    if (maskUrl) {
      console.warn("ページ用の写真 Mask を読み込めませんでした", maskUrl, error);
      throw error;
    }
    return {
      width: CAMERA_CANVAS_WIDTH,
      height: CAMERA_CANVAS_HEIGHT,
      frame: { x: 200, y: 150, width: 400, height: 300, radius: 24 },
      mask: null,
      fullMask: null,
      repeatGroups: repeatGroupsFor(repeatGroups),
    };
  }
}

function drawCameraGuide(context, guide) {
  const { width, height, frame, mask } = guide;
  beginLogicalDraw(context, width, height);
  context.fillStyle = "rgba(12, 24, 42, .62)";
  context.fillRect(0, 0, width, height);

  if (mask) {
    context.save();
    context.globalCompositeOperation = "destination-out";
    context.drawImage(mask, 0, 0, width, height);
    context.restore();

    const data = mask.getContext("2d").getImageData(0, 0, width, height).data;
    context.fillStyle = "rgba(255, 255, 255, .95)";
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const i = (y * width + x) * 4 + 3;
        if (!data[i]) continue;
        const edge = !data[((y - 1) * width + x) * 4 + 3] ||
          !data[((y + 1) * width + x) * 4 + 3] ||
          !data[(y * width + x - 1) * 4 + 3] ||
          !data[(y * width + x + 1) * 4 + 3];
        if (edge && ((x + y) / 3 | 0) % 2 === 0) context.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    return;
  }

  context.save();
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "rgba(0, 0, 0, 1)";
  context.beginPath();
  roundedRectPath(context, frame.x, frame.y, frame.width, frame.height, frame.radius);
  context.fill();
  context.restore();
  context.save();
  context.beginPath();
  roundedRectPath(context, frame.x, frame.y, frame.width, frame.height, frame.radius);
  context.strokeStyle = "rgba(255, 255, 255, .95)";
  context.lineWidth = 5;
  context.setLineDash([14, 12]);
  context.stroke();
  context.restore();
}

function drawCoverImage(context, image, width, height) {
  const sourceWidth = image.videoWidth || image.naturalWidth || image.width;
  const sourceHeight = image.videoHeight || image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return false;
  const { scale, offsetX, offsetY } = coverGeometry(sourceWidth, sourceHeight, width, height);
  context.drawImage(
    image,
    offsetX,
    offsetY,
    sourceWidth * scale,
    sourceHeight * scale,
  );
  return true;
}

function stopCameraStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

// 撮影画面で見えていた範囲だけを、後の「色・もよう」用の写真として保存する。
// 元の写真全体をそのまま使うと、ガイドの外側まで別の絵へ引き伸ばされて
// 実際に撮った位置と、絵本にはめ込まれた位置がずれて見える。
async function cropCameraPhoto(photoUrl, window) {
  if (!photoUrl || !window) return photoUrl;
  try {
    const image = await loadImageElement(photoUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const x = Number(window.x);
    const y = Number(window.y);
    const width = Number(window.width);
    const height = Number(window.height);
    if (![x, y, width, height, sourceWidth, sourceHeight].every(Number.isFinite) || width <= 0 || height <= 0) {
      return photoUrl;
    }

    const scaleX = sourceWidth / CAMERA_COORDINATE_SPACE.width;
    const scaleY = sourceHeight / CAMERA_COORDINATE_SPACE.height;
    const left = clamp(x, 0, CAMERA_COORDINATE_SPACE.width) * scaleX;
    const top = clamp(y, 0, CAMERA_COORDINATE_SPACE.height) * scaleY;
    const right = clamp(x + width, 0, CAMERA_COORDINATE_SPACE.width) * scaleX;
    const bottom = clamp(y + height, 0, CAMERA_COORDINATE_SPACE.height) * scaleY;
    const cropWidth = Math.max(1, Math.round(right - left));
    const cropHeight = Math.max(1, Math.round(bottom - top));
    if (right <= left || bottom <= top) return photoUrl;

    const crop = document.createElement("canvas");
    crop.width = cropWidth;
    crop.height = cropHeight;
    crop.getContext("2d").drawImage(
      image,
      left, top, right - left, bottom - top,
      0, 0, cropWidth, cropHeight,
    );
    return crop.toDataURL("image/jpeg", 0.92);
  } catch (_) {
    return photoUrl;
  }
}

// まず getUserMedia の取景画面を試し、使えない環境だけ従来のファイル入力へ戻す。
// アプリ内カメラで撮った写真は guide.frame の範囲だけをそのまま保存するため、
// 撮影後に指で移動・拡大するプレビューは表示しない。
export function openMissionCamera(ctx, page, { onGuidedCapture, onFallback } = {}) {
  const backgroundUrl = ctx.repo.assetUrl(page?.image);
  const modal = document.createElement("div");
  modal.className = "guided-camera";
  modal.innerHTML = `
    <div class="guided-camera__panel" role="dialog" aria-modal="true" aria-label="カメラで撮影">
      <div class="guided-camera__head">
        <h2>点線の中に いれてね</h2>
        <button type="button" class="guided-camera__close" data-camera-cancel aria-label="とじる">×</button>
      </div>
      <div class="guided-camera__view" data-camera-view>
        <video data-camera-video autoplay playsinline muted></video>
        <canvas data-camera-overlay width="${CAMERA_CANVAS_WIDTH}" height="${CAMERA_CANVAS_HEIGHT}"></canvas>
        <p class="guided-camera__status" data-camera-status>カメラを じゅんび中…</p>
      </div>
      <p class="guided-camera__hint">点線の中に、のこしたい いろや もようを うつしてね。</p>
      <div class="guided-camera__actions">
        <button type="button" class="retry" data-camera-cancel>やめる</button>
        <button type="button" class="mission-shoot" data-camera-shutter disabled>● しゃしんを とる</button>
      </div>
    </div>`;
  document.body.append(modal);

  const video = modal.querySelector("[data-camera-video]");
  const overlay = modal.querySelector("[data-camera-overlay]");
  const status = modal.querySelector("[data-camera-status]");
  const shutter = modal.querySelector("[data-camera-shutter]");
  const maskUrl = page?.photoMask ? ctx.repo.assetUrl(page.photoMask) : null;
  const repeatGroups = page?.repeatGroups || [];
  const guidePromise = createMissionGuide(backgroundUrl, page?.frame, maskUrl, repeatGroups);
  let guide = null;
  let stream = null;
  let closed = false;
  let fallbackStarted = false;

  const close = () => {
    closed = true;
    stopCameraStream(stream);
    video.srcObject = null;
    stream = null;
    modal.remove();
  };
  modal.querySelectorAll("[data-camera-cancel]").forEach((button) => { button.onclick = close; });

  const fallback = () => {
    if (closed || fallbackStarted) return;
    fallbackStarted = true;
    close();
    const choice = document.createElement("div");
    choice.className = "guided-camera guided-camera--fallback";
    choice.innerHTML = `
      <div class="guided-camera__panel" role="dialog" aria-modal="true" aria-label="写真をえらぶ">
        <div class="guided-camera__head">
          <h2>カメラが ひらかなかったよ</h2>
          <button type="button" class="guided-camera__close" data-fallback-cancel aria-label="とじる">×</button>
        </div>
        <p class="guided-camera__fallback-copy">写真をえらんで、あとで 点線の中に うごかせるよ。</p>
        <div class="guided-camera__actions">
          <button type="button" class="retry" data-fallback-cancel>やめる</button>
          <button type="button" class="mission-shoot" data-fallback-open>写真を えらぶ</button>
        </div>
      </div>`;
    document.body.append(choice);
    choice.querySelectorAll("[data-fallback-cancel]").forEach((button) => {
      button.onclick = () => choice.remove();
    });
    choice.querySelector("[data-fallback-open]").onclick = () => {
      choice.remove();
      openCamera(ctx, (dataUrl) => onFallback?.(dataUrl));
    };
  };

  const requestStream = async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia is not supported");
    const request = navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    // 権限ダイアログが応答しない端末で画面が固まらないよう、8秒でフォールバックする。
    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("camera timeout")), 8000);
    });
    request.then((lateStream) => {
      if (closed || fallbackStarted) stopCameraStream(lateStream);
    }).catch(() => {});
    return Promise.race([request, timeout]);
  };

  const start = async () => {
    try {
      guide = await guidePromise;
      if (closed) return;
      const overlayContext = logicalCanvasContext(overlay, guide.width, guide.height);
      drawCameraGuide(overlayContext, guide);
      if (closed) return;
      stream = await requestStream();
      if (closed || fallbackStarted) {
        stopCameraStream(stream);
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (!video.videoWidth) {
        await new Promise((resolve) => {
          let timer;
          const done = () => { window.clearTimeout(timer); resolve(); };
          timer = window.setTimeout(done, 3000);
          video.addEventListener("loadedmetadata", done, { once: true });
        });
      }
      if (!video.videoWidth) throw new Error("camera video metadata unavailable");
      status.hidden = true;
      shutter.disabled = false;
    } catch (error) {
      console.info("アプリ内カメラを使えないため、写真入力へ切り替えます", error?.message ?? error);
      fallback();
    }
  };

  shutter.onclick = async () => {
    if (!stream || !video.videoWidth || closed) return;
    shutter.disabled = true;
    status.hidden = false;
    status.textContent = "しゃしんを つくっているよ…";
    const capture = document.createElement("canvas");
    capture.width = CAMERA_CANVAS_WIDTH;
    capture.height = CAMERA_CANVAS_HEIGHT;
    const captureContext = capture.getContext("2d");
    if (!drawCoverImage(captureContext, video, capture.width, capture.height)) {
      shutter.disabled = false;
      status.textContent = "もういちど ためしてね";
      return;
    }
    const dataUrl = capture.toDataURL("image/jpeg", 0.92);
    const capturedGuide = guide;
    close();
    try {
      await onGuidedCapture?.(dataUrl, capturedGuide);
    } catch (error) {
      console.warn("カメラ写真の保存に失敗しました", error);
      ctx.notify?.("保存に しっぱいしました", "error");
    }
  };

  start();
}

// アプリ内カメラで撮影した写真を、点線ガイドと同じ範囲で絵本に保存する。
// 手動フォールバックの PreviewScreen は従来どおり独自に合成する。
export async function completeMissionPhoto(ctx, page, dataUrl, placement = {}) {
  // 後続ページの色ぬりにも、撮影時の点線内だけを使う。
  const textureUrl = await cropCameraPhoto(dataUrl, placement.captureWindow);
  const [vehicleColor, composedUrl] = await Promise.all([
    extractPhotoColor(textureUrl),
    composeMissionPhoto(ctx.repo.assetUrl(page.image), dataUrl, page.frame, {
      ...placement,
      guided: true,
      scale: 1,
      dx: 0,
      dy: 0,
      repeatGroups: placement.repeatGroups || page.repeatGroups || [],
      captureFullMask: placement.captureFullMask || null,
    }),
  ]);
  ctx.session.completeMission({
    missionId: page.id,
    missionText: page.prompt,
    caption: page.diaryCaption || page.prompt,
    photoUrl: composedUrl,
    missionImage: page.image,
    vehicleColor,
    vehicleSourceUrl: textureUrl,
    vehicleTextureScale: 1,
  });
  return composedUrl;
}

// 読み聞かせ系の画面（おはなし・ミッション・撮影プレビュー・達成・完了）を
// 横向きタブレット基準（4:3）の「ステージ」に収め、はみ出す分は上下/左右に帯を入れる。
export const stage = (html) => `
  <div class="stage-outer">
    <div class="stage">${html}</div>
  </div>`;

// 背景写真（.scene の1枚目）の上に、gifキャラクターを重ねて表示する<img>を作る。
export const characterLayer = (url) =>
  url ? `<img class="character" src="${url}" alt="" onerror="this.remove()">` : "";

// 挿絵の「まだ色がついていない部分」（＝画像の透明な部分。くるま・おうち・おはななど）から、
// こどもが撮った写真がのぞくように、挿絵の下に写真を敷く。
// どのミッションの写真を敷くかは page.fillFrom にミッションのIDで書く。
// まだそのミッションを撮っていなければ何も敷かない（＝色のないままの絵に見える）。
export const fillLayer = (ctx, page) => {
  const photo = page.fillFrom ? ctx.session.missionPhoto(page.fillFrom) : null;
  return photo ? `<img class="fill" src="${photo}" alt="">` : "";
};

// 背景写真の上に、好きな写真を好きな位置・重なり順で自由に重ねるためのレイヤー群を作る。
// page.layers に配列で並べる。各要素の項目はすべて省略可：
//   image  … content/ 起点の相対パス（必須。無ければそのレイヤーは無視）
//   top    … 中心の縦位置（%かCSS値。既定 "50%"）
//   left   … 中心の横位置（%かCSS値。既定 "50%"）
//   width  … 表示幅（%かCSS値。既定 "40%"）
//   z      … 重なり順（大きいほど手前。既定 1。背景写真は0、.character は5相当）
export const layersMarkup = (ctx, layers) =>
  (layers ?? []).map((layer) => {
    const url = ctx.repo.assetUrl(layer.image);
    if (!url) return "";
    const top = layer.top ?? "50%";
    const left = layer.left ?? "50%";
    const width = layer.width ?? "40%";
    const z = Number(layer.z) || 1;
    return `<img class="layer" src="${url}" alt=""
      style="top:${esc(top)};left:${esc(left)};width:${esc(width)};z-index:${z}"
      onerror="this.remove()">`;
  }).join("");

// ミッション写真から、車体などに引き継ぐ色を取り出す。白・黒・灰色は背景や輪郭と
// 区別しにくいため避け、彩度の高いピクセルを少しずつ平均して代表色にする。
export async function extractPhotoColor(photoUrl) {
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = photoUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 64, 64);
    const pixels = context.getImageData(0, 0, 64, 64).data;
    let r = 0, g = 0, b = 0, weightTotal = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
      const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
      const saturation = max - min;
      if (pixels[i + 3] < 180 || saturation < 28 || max < 45 || max > 248) continue;
      const weight = saturation * (0.35 + max / 255);
      r += pixels[i] * weight; g += pixels[i + 1] * weight; b += pixels[i + 2] * weight;
      weightTotal += weight;
    }
    if (!weightTotal) return null;
    return `rgb(${Math.round(r / weightTotal)}, ${Math.round(g / weightTotal)}, ${Math.round(b / weightTotal)})`;
  } catch (_) {
    return null;
  }
}

// 車体の透明な部分だけを、ミッションで選ばれた色に置き換えた絵を作る。
// PNGでは車体が透明にくり抜かれているため、黒いピクセルを塗るのではなく、
// 輪郭に囲まれた透明領域だけを塗る。これで背景の透明部分は汚さない。
export async function recolorVehicleImage(imageUrl, color, region, tone = "dark", textureUrl = null) {
  if ((!color && !textureUrl) || !region) return null;
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = imageUrl;
    });
    const texture = textureUrl ? await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = textureUrl;
    }) : null;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const left = Math.floor(region.x * canvas.width);
    const top = Math.floor(region.y * canvas.height);
    const right = Math.ceil((region.x + region.width) * canvas.width);
    const bottom = Math.ceil((region.y + region.height * 0.78) * canvas.height);
    let textureData = null;
    if (texture) {
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = canvas.width; textureCanvas.height = canvas.height;
      const textureContext = textureCanvas.getContext("2d");
      // 颜色照片强制拉伸到刚好盖住要上色的 region，而不是整块画布。
      // 以整块画布为基准时，处于画面边缘的车会采样到照片边缘的背景色。
      const textureScale = Math.max((right - left) / texture.naturalWidth, (bottom - top) / texture.naturalHeight);
      const textureWidth = texture.naturalWidth * textureScale;
      const textureHeight = texture.naturalHeight * textureScale;
      textureContext.drawImage(texture, (left + right - textureWidth) / 2, (top + bottom - textureHeight) / 2, textureWidth, textureHeight);
      textureData = textureContext.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    // 出力は最初から透明にして、車体の色ピクセルだけを重ねる。
    // 元画像全体を layer にすると、背景まで上書きされてしまう。
    const data = context.createImageData(canvas.width, canvas.height);
    const rgb = color?.match(/\d+(?:\.\d+)?/g)?.map(Number) || [255, 255, 255];
    if (rgb.length < 3) return null;

    // 黑色车身素材では、region内の黒い背景要素まで一緒に塗らないようにする。
    // 車体は最大の連続した暗色コンポーネントなので、それだけを採用する。
    const darkMask = new Uint8Array(canvas.width * canvas.height);
    const largestDark = new Uint8Array(canvas.width * canvas.height);
    let largestDarkSize = 0;
    if (tone === "dark") {
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const i = (y * canvas.width + x) * 4;
        if (source.data[i + 3] >= 80 && Math.max(source.data[i], source.data[i + 1], source.data[i + 2]) < 95) {
          darkMask[y * canvas.width + x] = 1;
        }
      }
      const seen = new Uint8Array(canvas.width * canvas.height);
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const start = y * canvas.width + x;
        if (!darkMask[start] || seen[start]) continue;
        const component = [];
        const stack = [start]; seen[start] = 1;
        while (stack.length) {
          const p = stack.pop(); component.push(p);
          const px = p % canvas.width; const py = (p / canvas.width) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = px + dx; const ny = py + dy;
            if (nx < left || nx >= right || ny < top || ny >= bottom) continue;
            const np = ny * canvas.width + nx;
            if (darkMask[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
          }
        }
        if (component.length > largestDarkSize) {
          largestDarkSize = component.length;
          largestDark.fill(0);
          component.forEach((p) => { largestDark[p] = 1; });
        }
      }
    }

    // 車体内部の透明領域に外側から到達できるかを先に調べる。
    // region の端からつながる透明部分は背景、輪郭に囲まれた透明部分だけが車体。
    const transparent = (x, y) => {
      const i = (y * canvas.width + x) * 4;
      return source.data[i + 3] < 80;
    };
    const outside = new Uint8Array(canvas.width * canvas.height);
    const queue = [];
    const visitOutside = (x, y) => {
      if (x < left || x >= right || y < top || y >= bottom) return;
      const p = y * canvas.width + x;
      if (outside[p] || !transparent(x, y)) return;
      outside[p] = 1;
      queue.push(p);
    };
    for (let x = left; x < right; x++) { visitOutside(x, top); visitOutside(x, bottom - 1); }
    for (let y = top; y < bottom; y++) { visitOutside(left, y); visitOutside(right - 1, y); }
    while (queue.length) {
      const p = queue.pop();
      const x = p % canvas.width;
      const y = (p / canvas.width) | 0;
      visitOutside(x - 1, y); visitOutside(x + 1, y);
      visitOutside(x, y - 1); visitOutside(x, y + 1);
    }

    for (let y = Math.max(0, top); y < Math.min(canvas.height, bottom); y++) {
      for (let x = Math.max(0, left); x < Math.min(canvas.width, right); x++) {
        const i = (y * canvas.width + x) * 4;
        const max = Math.max(source.data[i], source.data[i + 1], source.data[i + 2]);
        const min = Math.min(source.data[i], source.data[i + 1], source.data[i + 2]);
        const p = y * canvas.width + x;
        const carTransparent = tone === "transparent" && transparent(x, y) && !outside[p];
        const dark = tone === "dark" && largestDark[p];
        const light = tone === "light" && min > 190 && max - min < 45;
        if (!carTransparent && !dark && !light) continue;
        if (textureData && (carTransparent || dark)) {
          data.data[i] = textureData[i];
          data.data[i + 1] = textureData[i + 1];
          data.data[i + 2] = textureData[i + 2];
        } else {
          const luminance = 0.72 + (source.data[i] + source.data[i + 1] + source.data[i + 2]) / (255 * 3) * 0.35;
          data.data[i] = Math.min(255, rgb[0] * luminance);
          data.data[i + 1] = Math.min(255, rgb[1] * luminance);
          data.data[i + 2] = Math.min(255, rgb[2] * luminance);
        }
        data.data[i + 3] = carTransparent ? 255 : source.data[i + 3];
      }
    }
    context.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (_) {
    return null;
  }
}

// 第1冊用：挿絵の外側からつながっていない透明部分（車・家・花・ちょうちょ等）を、
// 子どもが選んだ画像のテクスチャでまとめて埋める。背景にある透明部分は塗らない。
export async function fillArtworkHoles(artUrl, textureUrl, textureScale = 1, region = null) {
  if (!artUrl || !textureUrl) return null;
  try {
    const load = (src) => new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });
    const [art, texture] = await Promise.all([load(artUrl), load(textureUrl)]);
    const canvas = document.createElement("canvas");
    canvas.width = art.naturalWidth; canvas.height = art.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(art, 0, 0);
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const transparent = (x, y) => source.data[(y * canvas.width + x) * 4 + 3] < 80;
    const left = region ? Math.max(0, Math.floor(region.x * canvas.width)) : 0;
    const top = region ? Math.max(0, Math.floor(region.y * canvas.height)) : 0;
    const right = region ? Math.min(canvas.width, Math.ceil((region.x + region.width) * canvas.width)) : canvas.width;
    const bottom = region ? Math.min(canvas.height, Math.ceil((region.y + region.height) * canvas.height)) : canvas.height;
    const outside = new Uint8Array(canvas.width * canvas.height);
    const queue = [];
    const visit = (x, y) => {
      if (x < left || x >= right || y < top || y >= bottom) return;
      const p = y * canvas.width + x;
      if (outside[p] || !transparent(x, y)) return;
      outside[p] = 1; queue.push(p);
    };
    for (let x = left; x < right; x++) { visit(x, top); visit(x, bottom - 1); }
    for (let y = top; y < bottom; y++) { visit(left, y); visit(right - 1, y); }
    while (queue.length) {
      const p = queue.pop();
      const x = p % canvas.width; const y = (p / canvas.width) | 0;
      visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1);
    }

    // region の中に実際にある透明部分だけの外接矩形を求める。
    // 設定上の region に余白があっても、撮影時の範囲と実際に色が入る形の範囲を
    // 同じにするため、写真はこの矩形へ合わせる。
    let fillLeft = right;
    let fillTop = bottom;
    let fillRight = -1;
    let fillBottom = -1;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const p = y * canvas.width + x;
        if (!transparent(x, y) || outside[p]) continue;
        fillLeft = Math.min(fillLeft, x);
        fillTop = Math.min(fillTop, y);
        fillRight = Math.max(fillRight, x + 1);
        fillBottom = Math.max(fillBottom, y + 1);
      }
    }
    if (fillRight < fillLeft || fillBottom < fillTop) return null;

    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = canvas.width; textureCanvas.height = canvas.height;
    const textureContext = textureCanvas.getContext("2d");
    // 写真は「実際に色が入る形」を必ず覆う大きさまで引き伸ばす。
    // region 全体を基準にすると余白の分だけ写真の位置・大きさがずれる。
    const cover = Math.max((fillRight - fillLeft) / texture.naturalWidth, (fillBottom - fillTop) / texture.naturalHeight);
    const factor = Math.max(cover, cover * Math.min(2, Number(textureScale) || 1));
    const width = texture.naturalWidth * factor;
    const height = texture.naturalHeight * factor;
    textureContext.drawImage(texture, (fillLeft + fillRight - width) / 2, (fillTop + fillBottom - height) / 2, width, height);
    const textureData = textureContext.getImageData(0, 0, canvas.width, canvas.height).data;
    const output = context.createImageData(canvas.width, canvas.height);
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const p = y * canvas.width + x;
        if (!transparent(x, y) || outside[p]) continue;
        const i = p * 4;
        output.data[i] = textureData[i];
        output.data[i + 1] = textureData[i + 1];
        output.data[i + 2] = textureData[i + 2];
        output.data[i + 3] = 255;
      }
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.putImageData(output, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (_) {
    return null;
  }
}

export const bookColorLayer = (ctx, page) => {
  if (ctx.session.bookId !== "book-niji" || !page?.image) return "";
  return (page.colorFills ?? []).map((fill) => {
    const mission = ctx.session.runMissions.find((m) => m.missionId === fill.from);
    const photo = mission?.vehicleSourceUrl || mission?.photoUrl;
    if (!photo || !fill.region) return "";
    return `<img class="book-color-art" data-book-color-art
      data-book-color-source="${ctx.repo.assetUrl(page.image)}"
      data-book-color-photo="${esc(photo)}"
      data-book-color-value="${esc(mission.vehicleColor || "") }"
      data-book-color-scale="${Number(mission.vehicleTextureScale) || 1}"
      data-book-color-region='${esc(JSON.stringify(fill.region))}'
      data-book-color-tone="${esc(fill.tone || "transparent")}"
      src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="">`;
  }).join("");
};

export const vehicleColorLayer = (ctx, page) => {
  const mission = page.vehicleColorFrom ? ctx.session.runMissions.find((m) => m.missionId === page.vehicleColorFrom) : null;
  if ((!mission?.vehicleColor && !mission?.vehicleSourceUrl && !mission?.photoUrl) || !page.vehicleRegion || !page.image) return "";
  const fallbackPhoto = mission.vehicleSourceUrl || mission.photoUrl || "";
  return `<img class="vehicle-color-art" data-vehicle-art
    data-vehicle-color="${esc(mission.vehicleColor || "")}"
    data-vehicle-photo="${esc(fallbackPhoto)}"
    data-vehicle-region='${esc(JSON.stringify(page.vehicleRegion))}'
    data-vehicle-tone="${esc(page.vehicleTone || "dark")}"
    data-vehicle-source="${ctx.repo.assetUrl(page.image)}"
    src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="">`;
};

// ミッションの背景イラストと、こどもが撮った写真を1枚の画像にまとめる。
// DOM上で重ねるだけではなくcanvasからData URLを作るため、プレビューだけでなく
// 日記・おもいでにも同じ合成済み画像を残せる。
// frame（省略可）は、そのミッションの元画像（実ピクセル座標）における
// 「まだ色がついていない部分」（くるま・おうち・おはな等）の位置・大きさ。
// 絵ごとに形も位置も違うため、指定がないと写真が絵の関係ない場所に大きく
// 覆いかぶさってしまう（＝写真と背景がばらばらに見える）。無指定時は
// 従来どおり中央固定の額縁にフォールバックする。
export async function composeMissionPhoto(backgroundUrl, photoUrl, frame, placement = {}) {
  const roundedRect = (context, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  };
  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  // 背景が透明な画像（キャラクターの切り抜きPNGなど）かどうかを調べる。
  // 縮小した状態でピクセルのアルファ値を見るだけなので軽い。
  const hasTransparency = (image) => {
    const sample = document.createElement("canvas");
    sample.width = 64;
    sample.height = 64;
    const sampleContext = sample.getContext("2d");
    sampleContext.drawImage(image, 0, 0, sample.width, sample.height);
    const data = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
    return false;
  };
  // 白背景など、ふちが一様な色の画像（切り抜き素材をJPEG等で保存したもの）から
  // 背景を透明にして、キャラクターだけを切り出したcanvasを返す。
  // ・四隅の色を「背景色」とみなし、ふちからつながっている同系色だけを消す
  //   （キャラクター内部の白い毛などは、ふちとつながっていないので残る）。
  // ・ふちの色がバラバラ（＝ふつうの風景写真）のときや、消える量が少なすぎ・
  //   多すぎるときは切り抜き素材ではないと判断して null を返す。
  const cutOutUniformBackground = (photo) => {
    const MAX = 512;
    const ratio = Math.min(1, MAX / Math.max(photo.naturalWidth, photo.naturalHeight));
    const w = Math.max(1, Math.round(photo.naturalWidth * ratio));
    const h = Math.max(1, Math.round(photo.naturalHeight * ratio));
    const work = document.createElement("canvas");
    work.width = w;
    work.height = h;
    const workContext = work.getContext("2d");
    workContext.drawImage(photo, 0, 0, w, h);
    const imageData = workContext.getImageData(0, 0, w, h);
    const d = imageData.data;

    // 背景色の候補は四隅と各辺の途中から取る。チェッカー柄（透過風）の背景は
    // 2色が交互に並ぶため、四隅だけだと片方の色しか拾えないことがある。
    const seeds = [];
    const inset = 3;
    const addSeed = (x, y) => {
      const i = (y * w + x) * 4;
      const color = [d[i], d[i + 1], d[i + 2]];
      if (!seeds.some(([r, g, b]) =>
        Math.abs(color[0] - r) <= 10 && Math.abs(color[1] - g) <= 10 && Math.abs(color[2] - b) <= 10)) {
        seeds.push(color);
      }
    };
    for (const t of [0, 0.18, 0.35, 0.5, 0.65, 0.82, 1]) {
      const x = Math.min(w - 1 - inset, Math.max(inset, Math.round(t * (w - 1))));
      const y = Math.min(h - 1 - inset, Math.max(inset, Math.round(t * (h - 1))));
      addSeed(x, inset);
      addSeed(x, h - 1 - inset);
      addSeed(inset, y);
      addSeed(w - 1 - inset, y);
    }
    // JPEG保存によるノイズは吸収しつつ、キャラクター本体の色（背景に近い灰色など）は
    // 巻き込まないよう、許容差は控えめにする。
    const TOLERANCE = 32;
    const isBackgroundColor = (i) => seeds.some(([r, g, b]) =>
      Math.abs(d[i] - r) <= TOLERANCE && Math.abs(d[i + 1] - g) <= TOLERANCE && Math.abs(d[i + 2] - b) <= TOLERANCE);

    // ふちの大半が背景色でなければ、ふつうの写真と判断してやめる。
    let borderHits = 0;
    let borderTotal = 0;
    for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { borderTotal++; if (isBackgroundColor((y * w + x) * 4)) borderHits++; }
    for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { borderTotal++; if (isBackgroundColor((y * w + x) * 4)) borderHits++; }
    if (borderHits / borderTotal < 0.6) return null;

    // ふちから背景色をたどって塗りつぶす（内側の同色は残る）。
    const isBackground = new Uint8Array(w * h);
    const queue = [];
    const visit = (x, y) => {
      const p = y * w + x;
      if (!isBackground[p] && isBackgroundColor(p * 4)) { isBackground[p] = 1; queue.push(p); }
    };
    for (let x = 0; x < w; x++) { visit(x, 0); visit(x, h - 1); }
    for (let y = 0; y < h; y++) { visit(0, y); visit(w - 1, y); }
    while (queue.length) {
      const p = queue.pop();
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) visit(x - 1, y);
      if (x < w - 1) visit(x + 1, y);
      if (y > 0) visit(x, y - 1);
      if (y < h - 1) visit(x, y + 1);
    }
    let removed = 0;
    for (let p = 0; p < w * h; p++) removed += isBackground[p];
    const removedRatio = removed / (w * h);
    if (removedRatio < 0.1 || removedRatio > 0.97) return null;

    // 背景を透明にし、キャラクターのふち1pxは半透明にして背景となじませる。
    for (let p = 0; p < w * h; p++) if (isBackground[p]) d[p * 4 + 3] = 0;
    for (let p = 0; p < w * h; p++) {
      if (isBackground[p]) continue;
      const x = p % w;
      const y = (p / w) | 0;
      if ((x > 0 && isBackground[p - 1]) || (x < w - 1 && isBackground[p + 1]) ||
          (y > 0 && isBackground[p - w]) || (y < h - 1 && isBackground[p + w])) {
        d[p * 4 + 3] = 120;
      }
    }

    // 残ったキャラクターの範囲だけを切り出して返す（余白ごと縮小されて
    // キャラクターが小さくなりすぎるのを防ぐ）。
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let p = 0; p < w * h; p++) {
      if (isBackground[p]) continue;
      const x = p % w;
      const y = (p / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxX < 0) return null;
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d").putImageData(imageData, -minX, -minY);
    return out;
  };

  try {
    const [background, photo] = await Promise.all([
      loadImage(backgroundUrl),
      loadImage(photoUrl),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const context = canvas.getContext("2d");

    // 背景はカメラプレビューと同じ object-fit: cover で全面に敷く。
    // ガイド・撮影画像・完成画像の3つで同じ座標変換を使うため、端末比率によるずれを防ぐ。
    drawCoverImage(context, background, canvas.width, canvas.height);
    const configuredFrame = missionFrameForCanvas(background, frame, canvas.width, canvas.height);
    const loadedFullMask = !placement.captureFullMask && placement.maskUrl
      ? await loadMissionMask(placement.maskUrl, canvas.width, canvas.height).catch(() => null)
      : null;
    const availableFullMask = placement.captureFullMask || loadedFullMask || null;
    const availableCaptureMask = placement.captureMask || availableFullMask || null;
    // 最終的な写真の枠も Mask 全体から求める。frame に余白があっても、
    // カメラの点線と実際に色が入る形が同じ範囲になる。
    const targetFrame = maskBounds(availableFullMask || availableCaptureMask, configuredFrame);

    const drawImageToFrame = (destination, image, sourceX, sourceY, sourceWidth, sourceHeight, target, rotation = 0) => {
      destination.save();
      const radians = (Number(rotation) || 0) * Math.PI / 180;
      if (radians) {
        destination.translate(target.x + target.width / 2, target.y + target.height / 2);
        destination.rotate(radians);
        destination.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
          -target.width / 2, -target.height / 2, target.width, target.height);
      } else {
        destination.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
          target.x, target.y, target.width, target.height);
      }
      destination.restore();
    };

    if (placement.guided) {
      // アプリ内カメラの800x600画像から、取景中の点線範囲だけを同じ座標へ移す。
      // これにより、撮影後に写真全体を縮小したり、指で位置を合わせ直したりしない。
      const sourceWindow = placement.captureWindow || targetFrame;
      const sourceX = sourceWindow.x * photo.naturalWidth / canvas.width;
      const sourceY = sourceWindow.y * photo.naturalHeight / canvas.height;
      const sourceWidth = sourceWindow.width * photo.naturalWidth / canvas.width;
      const sourceHeight = sourceWindow.height * photo.naturalHeight / canvas.height;
      // 取景時に表示したマスクをそのまま完成画像へ移す。
      // sourceWindow と targetFrame が異なる場合も、マスクを同じ変換で移動する。
      const sourceMask = availableCaptureMask;
      const photoLayer = document.createElement("canvas");
      photoLayer.width = canvas.width;
      photoLayer.height = canvas.height;
      const photoContext = photoLayer.getContext("2d");
      drawImageToFrame(photoContext, photo, sourceX, sourceY, sourceWidth, sourceHeight, targetFrame);
      if (sourceMask) {
        const targetMask = document.createElement("canvas");
        targetMask.width = canvas.width;
        targetMask.height = canvas.height;
        const targetMaskContext = targetMask.getContext("2d");
        targetMaskContext.imageSmoothingEnabled = false;
        drawImageToFrame(targetMaskContext, sourceMask,
          sourceWindow.x, sourceWindow.y, sourceWindow.width, sourceWindow.height,
          targetFrame);
        photoContext.globalCompositeOperation = "destination-in";
        photoContext.drawImage(targetMask, 0, 0, canvas.width, canvas.height);
      } else {
        // Mask を持たない旧ページだけは、既存の丸角フレームに戻す。
        photoContext.globalCompositeOperation = "destination-in";
        photoContext.beginPath();
        roundedRectPath(photoContext, targetFrame.x, targetFrame.y, targetFrame.width, targetFrame.height, targetFrame.radius);
        photoContext.fill();
      }
      context.drawImage(photoLayer, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.9);
    }

    // 元から透明な切り抜きPNGはそのまま、白背景などの素材画像は背景を消して
    // キャラクターだけを取り出す。どちらでもなければ「ふつうの写真」扱い。
    let subject = photo;
    let subjectWidth = photo.naturalWidth;
    let subjectHeight = photo.naturalHeight;
    let isCharacter = hasTransparency(photo);
    // 普通の风景照片には白い部分が本来含まれるため、白背景の自动去除は
    // プレビューで明示的に選んだときだけ行う。既存の呼び出し（placementなし）は
    // 従来どおり自动判定を維持する。
    const removeBackground = placement.removeBackground === undefined
      ? true : placement.removeBackground === true;
    if (!isCharacter && removeBackground) {
      const cutout = cutOutUniformBackground(photo);
      if (cutout) {
        subject = cutout;
        subjectWidth = cutout.width;
        subjectHeight = cutout.height;
        isCharacter = true;
      }
    }

    // 写真の縦横比はそのまま、frame の範囲に収まる大きさまで縮小する（切り抜きも拡大もしない）。
    const fitScale = Math.min(targetFrame.width / subjectWidth, targetFrame.height / subjectHeight);
    const zoom = Math.max(0.6, Math.min(2, Number(placement.scale) || 1));
    const scale = fitScale * zoom;
    const width = subjectWidth * scale;
    const height = subjectHeight * scale;
    const moveX = (Number(placement.dx) || 0) * canvas.width;
    const moveY = (Number(placement.dy) || 0) * canvas.height;
    const photoX = Math.max(0, Math.min(canvas.width - width,
      targetFrame.x + (targetFrame.width - width) / 2 + moveX));

    // フォールバックの写真選択でも、Mask があれば同じ全体範囲へクリップする。
    // 代表の1個を複製せず、撮影カメラと同じ個数の形だけを残す。
    const photoLayer = availableCaptureMask ? document.createElement("canvas") : null;
    if (photoLayer) {
      photoLayer.width = canvas.width;
      photoLayer.height = canvas.height;
    }
    const photoContext = photoLayer?.getContext("2d") || context;
    if (isCharacter) {
      // キャラクターは白い額縁を付けずそのまま背景に立たせる。
      // frame の下端に足をそろえる（＝地面に立っているように見える）。
      const photoY = Math.max(0, Math.min(canvas.height - height,
        targetFrame.y + (targetFrame.height - height) + moveY));
      photoContext.drawImage(subject, photoX, photoY, width, height);
    } else {
      // ふつうの写真（不透明）は、白いフチの「貼った写真」として背景の上に乗せる。
      // 白いフチは frame 全体ではなく写真のまわりだけに付け、背景が隠れないようにする。
      const photoY = Math.max(0, Math.min(canvas.height - height,
        targetFrame.y + (targetFrame.height - height) / 2 + moveY));
      photoContext.save();
      photoContext.shadowColor = "rgba(30, 45, 35, .28)";
      photoContext.shadowBlur = 22;
      photoContext.shadowOffsetY = 10;
      photoContext.fillStyle = "#fff";
      photoContext.beginPath();
      roundedRect(photoContext, photoX - 10, photoY - 10, width + 20, height + 20, targetFrame.radius + 8);
      photoContext.fill();
      photoContext.restore();

      photoContext.save();
      photoContext.beginPath();
      roundedRect(photoContext, photoX, photoY, width, height, targetFrame.radius);
      photoContext.clip();
      photoContext.drawImage(photo, photoX, photoY, width, height);
      photoContext.restore();
    }

    if (photoLayer) {
      const targetMask = document.createElement("canvas");
      targetMask.width = canvas.width;
      targetMask.height = canvas.height;
      const targetMaskContext = targetMask.getContext("2d");
      targetMaskContext.imageSmoothingEnabled = false;
      drawImageToFrame(targetMaskContext, availableCaptureMask,
        targetFrame.x, targetFrame.y, targetFrame.width, targetFrame.height,
        targetFrame);
      photoContext.globalCompositeOperation = "destination-in";
      photoContext.drawImage(targetMask, 0, 0, canvas.width, canvas.height);
      context.drawImage(photoLayer, 0, 0);
    }

    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (error) {
    console.warn("写真を合成できなかったため、元の写真を使います。", error);
    return photoUrl;
  }
}
