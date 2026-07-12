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
export async function composeMissionPhoto(backgroundUrl, photoUrl) {
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

    // 写真は背景が見える大きさの白いフォトフレームとして中央に配置する。
    const frame = { x: 92, y: 72, width: 616, height: 420, radius: 24 };
    context.save();
    context.shadowColor = "rgba(30, 45, 35, .28)";
    context.shadowBlur = 22;
    context.shadowOffsetY = 10;
    context.fillStyle = "#fff";
    context.beginPath();
    roundedRect(context, frame.x - 10, frame.y - 10, frame.width + 20, frame.height + 20, frame.radius + 8);
    context.fill();
    context.restore();

    context.save();
    context.beginPath();
    roundedRect(context, frame.x, frame.y, frame.width, frame.height, frame.radius);
    context.clip();
    const scale = Math.max(frame.width / photo.naturalWidth, frame.height / photo.naturalHeight);
    const width = photo.naturalWidth * scale;
    const height = photo.naturalHeight * scale;
    context.drawImage(photo, frame.x + (frame.width - width) / 2, frame.y + (frame.height - height) / 2, width, height);
    context.restore();

    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (error) {
    console.warn("写真を合成できなかったため、元の写真を使います。", error);
    return photoUrl;
  }
}
