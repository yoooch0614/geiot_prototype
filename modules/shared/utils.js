export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
);

// ── 音まわり ────────────────────────────────────────────────
// 「鳴るときと鳴らないときがある」を防ぐための仕組み。理由は3つあり、
// 「音ごとにAudio要素を数個ずつ作って持ち続け、順番に使う」ことでまとめて対処している。
//
// 1) 鳴らすたびに new Audio() すると、play() の読み込みが終わる前に画面が切り替わった場合、
//    その要素はどこからも参照されないまま捨てられ、音が出ずに終わる。
// 2) iOS/Safari は「ユーザー操作から始まっていない再生」を拒否する（NotAllowedError）。
//    撮影 → 非同期の写真合成 → お祝い画面、のように操作から離れて鳴る音がこれに当たる。
//    ただし「一度ユーザー操作の中で再生した要素」は、以降は操作の外からでも鳴らせる。
//    そこで最初のタップで全要素を無音で1回鳴らしておき（unlockAudio）、許可を取っておく。
// 3) 同じAudio要素を1つだけ使い回すと、端末によっては2回目以降の再生が効かないことがある
//    （前の再生が終わりきる前の巻き戻しに弱い）。「最初の画面のボタンだけ鳴る」のがこれ。
//    同じ音を数個ぶん用意して順ぐりに使えば、直前の1個が詰まっても次で確実に鳴る。
const POOL_SIZE = 4;            // ひとつの音につき用意するAudio要素の数
const audioPools = new Map();   // url → Audio[]
const cursors = new Map();      // url → つぎに使う番号
const primed = new WeakSet();   // 再生許可の取れた要素
const wanted = new WeakSet();   // 「本当に鳴らして」と指示された要素
let audioUnlocked = false;

// 無音で一瞬だけ再生して即座に巻き戻す。これでこの要素の再生許可が取れる。
function primeAudio(audio) {
  if (primed.has(audio)) return;
  primed.add(audio);
  audio.muted = true;
  audio.play()
    .then(() => {
      // 許可取りの最中に「本当に鳴らして」の指示が来ていたら（例：最初のタップのクリック音）、
      // ここで止めると初回だけ無音になってしまう。そのまま鳴らし続ける。
      if (wanted.has(audio)) {
        audio.muted = false;
        return;
      }
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    })
    .catch(() => { audio.muted = false; });
}

function getPool(url) {
  let pool = audioPools.get(url);
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.load();
      return audio;
    });
    audioPools.set(url, pool);
    cursors.set(url, 0);
    if (audioUnlocked) pool.forEach(primeAudio);
  }
  return pool;
}

// 最初のユーザー操作のときに呼ぶ（app.js から登録）。以降どの場面でも音を鳴らせるようになる。
export function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  audioPools.forEach((pool) => pool.forEach(primeAudio));
}

// あらかじめ読み込んでおきたい音を登録する。起動時に呼んでおくと、
// 実際に鳴らす場面で取得待ちが発生しない。
export function preloadAudio(urls) {
  (urls ?? []).forEach((url) => { if (url) getPool(url); });
}

export function playAudio(url) {
  if (!url) return;
  const pool = getPool(url);
  // 直前に使ったものを避けて、順ぐりに次の要素で鳴らす。
  const index = cursors.get(url);
  cursors.set(url, (index + 1) % pool.length);
  const audio = pool[index];

  // ユーザー操作の中で鳴らせたなら、その要素の再生許可も取れたことになる。
  primed.add(audio);
  wanted.add(audio);
  audio.muted = false;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (_) {}
  audio.play().catch((err) => {
    // 以前はここで握りつぶしていたため、ファイルが無いのか再生を拒否されたのか分からなかった。
    // AbortError は「鳴らし直しで前の再生が中断された」だけなので無視してよい。
    if (err?.name === "AbortError") return;
    console.warn(`[audio] 鳴らせませんでした: ${url}`, err?.name ?? err);
  });
}

// 何度も短い間隔で鳴らす効果音（ページめくり音など）用。いまは playAudio 自体が
// 要素を順ぐりに使い回すので、これは「先に読み込んでおく」ためのラッパー。
export function createRepeatableSound(url) {
  if (!url) return () => {};
  getPool(url);
  return () => playAudio(url);
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
    if (!isCharacter) {
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
