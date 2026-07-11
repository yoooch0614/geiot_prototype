export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
);

export function playAudio(url) {
  if (!url) return;
  new Audio(url).play().catch(() => {});
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
