export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
);

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

export function playAudio(url) {
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
const BGM_VOLUME = 0.35;   // 効果音を 1.0 としたときの大きさ。ここを変えれば音量調整できる。
const BGM_FADE = 0.4;      // 止めるときのフェードアウト（秒）。ぶつっと切れないように。

let bgmUrl = null;         // いま鳴らしたいBGM（画面が決める）
let bgmSource = null;
let bgmGain = null;
let bgmEnabled = true;

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
  bgmEnabled = Boolean(enabled);
  if (bgmEnabled) startBgmIfReady();
  else stopBgmPlayback();
  return bgmEnabled;
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
export function openCamera(ctx, onPicked) {
  const input = ctx.els.camera;
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

    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = canvas.width; textureCanvas.height = canvas.height;
    const textureContext = textureCanvas.getContext("2d");
    // 写真は「塗る範囲（region）」を必ず覆う大きさまで強制的に引き伸ばす。
    // キャンバス全体を基準にすると、絵の端にある車などは写真の端（背景）ばかりを
    // 拾ってしまい、選んだ色や柄が乗らないことがあった。縮小方向のscaleでも
    // region が覆えなくなる（＝すき間が黒く残る）ことがないよう、下限は覆える倍率にする。
    const cover = Math.max((right - left) / texture.naturalWidth, (bottom - top) / texture.naturalHeight);
    const factor = Math.max(cover, cover * Math.min(2, Number(textureScale) || 1));
    const width = texture.naturalWidth * factor;
    const height = texture.naturalHeight * factor;
    textureContext.drawImage(texture, (left + right - width) / 2, (top + bottom - height) / 2, width, height);
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

    // 背景はページに表示されているイラストを全面に敷く。
    context.drawImage(background, 0, 0, canvas.width, canvas.height);

    // frame は元画像の実ピクセル座標で指定されるため、キャンバスの縮尺に合わせて変換する。
    const scaleX = canvas.width / background.naturalWidth;
    const scaleY = canvas.height / background.naturalHeight;
    const targetFrame = frame
      ? {
          x: frame.x * scaleX,
          y: frame.y * scaleY,
          width: frame.width * scaleX,
          height: frame.height * scaleY,
          radius: (frame.radius ?? 24) * Math.min(scaleX, scaleY),
        }
      // 指定がない絵本（汎用SVGの背景など）は、中央固定の額縁を使う。
      // 背景がほとんど隠れてしまわないよう、キャンバス（800x600）の半分程度に留める。
      : { x: 200, y: 150, width: 400, height: 300, radius: 24 };
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

    if (isCharacter) {
      // キャラクターは白い額縁を付けずそのまま背景に立たせる。
      // frame の下端に足をそろえる（＝地面に立っているように見える）。
      const photoY = Math.max(0, Math.min(canvas.height - height,
        targetFrame.y + (targetFrame.height - height) + moveY));
      context.drawImage(subject, photoX, photoY, width, height);
    } else {
      // ふつうの写真（不透明）は、白いフチの「貼った写真」として背景の上に乗せる。
      // 白いフチは frame 全体ではなく写真のまわりだけに付け、背景が隠れないようにする。
      const photoY = Math.max(0, Math.min(canvas.height - height,
        targetFrame.y + (targetFrame.height - height) / 2 + moveY));
      context.save();
      context.shadowColor = "rgba(30, 45, 35, .28)";
      context.shadowBlur = 22;
      context.shadowOffsetY = 10;
      context.fillStyle = "#fff";
      context.beginPath();
      roundedRect(context, photoX - 10, photoY - 10, width + 20, height + 20, targetFrame.radius + 8);
      context.fill();
      context.restore();

      context.save();
      context.beginPath();
      roundedRect(context, photoX, photoY, width, height, targetFrame.radius);
      context.clip();
      context.drawImage(photo, photoX, photoY, width, height);
      context.restore();
    }

    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (error) {
    console.warn("写真を合成できなかったため、元の写真を使います。", error);
    return photoUrl;
  }
}
