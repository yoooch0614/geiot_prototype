import loginBonusItems from "../../content/assets/items/login_bonus/loginBonusItems.json" with { type: "json" };

// 小さな町を歩いて集める「ごほうび」のカタログ。
// Login Bonus の第一套素材は JSON を唯一の番号台帳にして、
// 画像ファイルと ID がずれないようにする。次の Login Bonus は 021 から追加する。
const LOGIN_BONUS_ASSET_ROOT = "content/assets/items/login_bonus/";

export const LOGIN_REWARD_CATALOG = loginBonusItems.map((item) => ({
  ...item,
  file: `${LOGIN_BONUS_ASSET_ROOT}${item.file}`,
  // 既存の奖励 UI 会从 image 读取视觉内容；现在改为使用真正的透明 PNG。
  image: `${LOGIN_BONUS_ASSET_ROOT}${item.file}`,
}));

// 之前版本已经可能写入本地端的奖励。它们不再参与新的编号顺序，
// 但仍可被 rewardDefinition 识别，避免升级后丢失旧收藏或待领取礼物。
export const LEGACY_LOGIN_REWARD_CATALOG = [
  { id: "login-hat-sun", name: "ひだまりぼうし", type: "hat", image: "🧢", source: "login" },
  { id: "login-clothes-sky", name: "そらいろの ふく", type: "clothes", image: "🧥", source: "login" },
  { id: "login-accessory-ribbon", name: "きらきらリボン", type: "accessory", image: "🎀", source: "login" },
  { id: "login-held-star", name: "ほしのステッキ", type: "held", image: "🌟", source: "login" },
  { id: "login-furniture-chair", name: "まるい いす", type: "furniture", image: "🪑", placement: "floor", source: "login" },
  { id: "login-decor-lamp", name: "おつきさまランプ", type: "decor", image: "🏮", placement: "shelf", source: "login" },
  { id: "login-hat-flower", name: "おはなの かんむり", type: "hat", image: "🌼", source: "login" },
  { id: "login-clothes-apron", name: "ぽかぽかエプロン", type: "clothes", image: "🧣", source: "login" },
  { id: "login-held-basket", name: "おでかけバスケット", type: "held", image: "🧺", source: "login" },
  { id: "login-furniture-table", name: "ちいさなテーブル", type: "furniture", image: "🪵", placement: "floor", source: "login" },
  { id: "login-decor-picture", name: "まちの え", type: "decor", image: "🖼️", placement: "wall", source: "login" },
  { id: "login-accessory-badge", name: "なかよしバッジ", type: "accessory", image: "📛", source: "login" },
];

export const BOOK_REWARD_CATALOG = [
  { id: "book-reward-flower", name: "えほんの おはな", type: "decor", image: "🌷", placement: "shelf" },
  { id: "book-reward-scarf", name: "ふわふわマフラー", type: "clothes", image: "🧣", slot: "clothes" },
  { id: "book-reward-bag", name: "ちいさな かばん", type: "held", image: "🎒", slot: "held" },
  { id: "book-reward-plant", name: "まちの うえき", type: "furniture", image: "🪴", placement: "floor" },
  { id: "book-reward-paint", name: "にじいろの えのぐ", type: "accessory", image: "🎨", slot: "accessory" },
  { id: "book-reward-cloud", name: "ふわふわクッション", type: "furniture", image: "☁️", placement: "floor" },
  { id: "book-reward-clock", name: "とけいの かざり", type: "decor", image: "🕰️", placement: "wall" },
  { id: "book-reward-crown", name: "おはなしの おうかん", type: "hat", image: "👑", slot: "hat" },
];

export const REWARD_CATALOG = [...LOGIN_REWARD_CATALOG, ...BOOK_REWARD_CATALOG];
const ALL_REWARD_DEFINITIONS = [...REWARD_CATALOG, ...LEGACY_LOGIN_REWARD_CATALOG];

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function rewardDefinition(id) {
  return ALL_REWARD_DEFINITIONS.find((item) => item.id === id) || null;
}

export function rewardRecord(definition, source, obtainedDate, referenceId = null) {
  if (!definition) return null;
  return {
    id: definition.id,
    name: definition.name,
    type: definition.type,
    image: definition.image,
    ...(definition.file ? { file: definition.file } : {}),
    ...(definition.placement ? { placement: definition.placement } : {}),
    ...(definition.slot ? { slot: definition.slot } : {}),
    obtained: true,
    obtainedDate,
    source,
    ...(referenceId ? { referenceId } : {}),
  };
}
