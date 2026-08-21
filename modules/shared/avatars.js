/*
 * avatars ── こどもの「じぶんアバター」（オリジナルキャラクター）
 * ------------------------------------------------------------
 * 5ひきの どうぶつから 1ぴき えらんで、すきな色となまえを つけられる。
 * 絵は content/assets の SVG 挿絵（cover-bear など）と同じ
 * 「まるい顔＋点の目＋ほっぺ」のフラットな作風で描いている。
 * えらんだ内容は Session（localStorage）に保存され、
 * おはなし画面・お祝い画面・絵本日記にも登場する（avatarBuddy）。
 */
import { esc } from "./utils.js";
import { localizeUi } from "./i18n.js";

export const AVATAR_ANIMALS = [
  { id: "rabbit", label: "うさぎさん" },
  { id: "cat", label: "ねこさん" },
  { id: "dog", label: "いぬさん" },
  { id: "tiger", label: "とらさん" },
  { id: "elephant", label: "ぞうさん" },
];

export const AVATAR_COLORS = [
  { id: "green", label: "みどり", value: "#dff3d0" },
  { id: "yellow", label: "きいろ", value: "#fff3c4" },
  { id: "pink", label: "ももいろ", value: "#ffe3e8" },
  { id: "blue", label: "みずいろ", value: "#ddebfa" },
  { id: "mint", label: "ミント", value: "#d9f2ea" },
  { id: "lavender", label: "ラベンダー", value: "#eadefa" },
];

// 「じぶんの いろ」は #rrggbb をそのまま保存する（プリセットIDと同じ場所に入る）
export function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value ?? ""));
}

export function avatarColorValue(colorId) {
  if (isHexColor(colorId)) return colorId;
  return (AVATAR_COLORS.find((c) => c.id === colorId) ?? AVATAR_COLORS[0]).value;
}

// 顔のパーツ（目・ほっぺ・くち）は各どうぶつで共通の描き方にして、作風を揃える
const EYES = (y = 60) => `
  <circle cx="46" cy="${y}" r="4.5" fill="#4a3728"/>
  <circle cx="74" cy="${y}" r="4.5" fill="#4a3728"/>`;
const CHEEKS = (y = 72, x1 = 34, x2 = 86) => `
  <circle cx="${x1}" cy="${y}" r="6" fill="#ffb3a0" opacity=".5"/>
  <circle cx="${x2}" cy="${y}" r="6" fill="#ffb3a0" opacity=".5"/>`;
const SMILE = (y = 80) => `
  <path d="M52 ${y} q8 6 16 0" stroke="#4a3728" stroke-width="3" fill="none" stroke-linecap="round"/>`;

const FACES = {
  elephant: `
    <circle cx="24" cy="62" r="20" fill="#8fa9d6"/>
    <circle cx="96" cy="62" r="20" fill="#8fa9d6"/>
    <circle cx="24" cy="62" r="12" fill="#c9d9f2"/>
    <circle cx="96" cy="62" r="12" fill="#c9d9f2"/>
    <circle cx="60" cy="64" r="36" fill="#a9c0e4"/>
    ${EYES(56)}
    ${CHEEKS(68, 34, 86)}
    <path d="M60 64 q-4 20 8 30" stroke="#8fa9d6" stroke-width="17" fill="none" stroke-linecap="round"/>
    <path d="M60 64 q-4 20 8 30" stroke="#c9d9f2" stroke-width="11" fill="none" stroke-linecap="round"/>`,
  rabbit: `
    <g transform="rotate(-10 46 30)"><ellipse cx="46" cy="28" rx="10" ry="24" fill="#fdf3e7"/><ellipse cx="46" cy="31" rx="5" ry="16" fill="#ffd0da"/></g>
    <g transform="rotate(10 74 30)"><ellipse cx="74" cy="28" rx="10" ry="24" fill="#fdf3e7"/><ellipse cx="74" cy="31" rx="5" ry="16" fill="#ffd0da"/></g>
    <circle cx="60" cy="68" r="35" fill="#fdf3e7"/>
    ${EYES(62)}
    ${CHEEKS(74, 36, 84)}
    <path d="M56 71 h8 l-4 6 z" fill="#f298ab"/>
    ${SMILE(83)}`,
  tiger: `
    <circle cx="33" cy="32" r="12" fill="#f5a34a"/>
    <circle cx="87" cy="32" r="12" fill="#f5a34a"/>
    <circle cx="33" cy="32" r="6" fill="#fff3dd"/>
    <circle cx="87" cy="32" r="6" fill="#fff3dd"/>
    <circle cx="60" cy="64" r="38" fill="#f5a34a"/>
    <g stroke="#a05c22" stroke-width="5" stroke-linecap="round">
      <path d="M52 34 v7"/><path d="M60 32 v9"/><path d="M68 34 v7"/>
      <path d="M25 58 h8"/><path d="M26 68 h6"/>
      <path d="M87 58 h8"/><path d="M88 68 h6"/>
    </g>
    <ellipse cx="60" cy="78" rx="18" ry="12" fill="#fff3dd"/>
    ${EYES(58)}
    <path d="M56 71 h8 l-4 6 z" fill="#a05c22"/>
    ${SMILE(82)}`,
  cat: `
    <path d="M30 48 L37 16 L57 34 Z" fill="#f6b56a"/>
    <path d="M90 48 L83 16 L63 34 Z" fill="#f6b56a"/>
    <path d="M36 41 L40 25 L50 34 Z" fill="#e58f4d"/>
    <path d="M84 41 L80 25 L70 34 Z" fill="#e58f4d"/>
    <circle cx="60" cy="66" r="38" fill="#f6b56a"/>
    <ellipse cx="60" cy="79" rx="19" ry="13" fill="#fff3dd"/>
    ${EYES()}
    ${CHEEKS()}
    <path d="M56 72 h8 l-4 6 z" fill="#e58f4d"/>
    ${SMILE(82)}`,
  dog: `
    <circle cx="60" cy="64" r="38" fill="#e9c29b"/>
    <g transform="rotate(14 28 56)"><ellipse cx="28" cy="56" rx="11" ry="21" fill="#8a5a3a"/></g>
    <g transform="rotate(-14 92 56)"><ellipse cx="92" cy="56" rx="11" ry="21" fill="#8a5a3a"/></g>
    <circle cx="74" cy="56" r="11" fill="#d5a678" opacity=".65"/>
    <ellipse cx="60" cy="79" rx="18" ry="13" fill="#fff3dd"/>
    ${EYES(58)}
    ${CHEEKS(70)}
    <ellipse cx="60" cy="73" rx="5" ry="4" fill="#4a3728"/>
    ${SMILE(82)}`,
};

// ── じぶんで つくる（パーツ組み立て） ─────────────
// プリセットの5ひきに加えて、からだの色・みみ・おめめ・おくち・かざりを
// 自由に組み合わせてオリジナルキャラクターを作れる（animal = "custom"）。
export const AVATAR_PARTS = {
  skin: [
    { id: "mikan", label: "みかん", value: "#f6b56a" },
    { id: "cream", label: "くりーむ", value: "#fdf3e7" },
    { id: "sora", label: "そら", value: "#a9c0e4" },
    { id: "momo", label: "もも", value: "#f7c3d4" },
    { id: "wakaba", label: "わかば", value: "#b9e0a5" },
    { id: "sumire", label: "すみれ", value: "#cdb5e8" },
  ],
  ears: [
    { id: "maru", label: "まるみみ" },
    { id: "pointy", label: "ねこみみ" },
    { id: "long", label: "うさみみ" },
    { id: "big", label: "ぞうみみ" },
    { id: "tare", label: "たれみみ" },
    { id: "tsuno", label: "つの" },
  ],
  eyes: [
    { id: "maru", label: "まる" },
    { id: "kirakira", label: "きらきら" },
    { id: "nikoniko", label: "にこにこ" },
  ],
  mouth: [
    { id: "nikkori", label: "にっこり" },
    { id: "waai", label: "わーい" },
    { id: "neko", label: "ねこぐち" },
    { id: "zou", label: "ぞうのはな" },
  ],
  acc: [
    { id: "nashi", label: "なし" },
    { id: "ribbon", label: "リボン" },
    { id: "kanmuri", label: "かんむり" },
    { id: "happa", label: "はっぱ" },
  ],
};

export const DEFAULT_PARTS = { skin: "mikan", ears: "maru", eyes: "maru", mouth: "nikkori", acc: "nashi" };

const PART_LABELS = { skin: "からだの いろ", ears: "みみ", eyes: "おめめ", mouth: "おくち", acc: "かざり" };

// うさぎさんは最初から使える。動物のプリセットを解放すると、
// その動物に対応する「じぶんで つくる」のパーツも同時に使える。
// からだの色・まるみみ・まる目・にっこり・かざりなしは、オリジナルを
// 作りはじめたときの基本パーツとして最初から使える。
export const AVATAR_ANIMAL_PARTS = Object.freeze({
  rabbit: [{ partKey: "ears", partId: "long" }],
  cat: [{ partKey: "ears", partId: "pointy" }],
  dog: [{ partKey: "ears", partId: "tare" }],
  tiger: [],
  elephant: [
    { partKey: "ears", partId: "big" },
    { partKey: "mouth", partId: "zou" },
  ],
});

// 「交換」ではなく、ずっと使える解放。動物と一緒に複数パーツが開く場合もある。
export const AVATAR_REWARDS = [
  { missionCount: 10, type: "animal", animal: "cat", label: "ねこさんと ねこみみ" },
  { missionCount: 15, type: "animal", animal: "dog", label: "いぬさんと たれみみ" },
  { missionCount: 20, type: "animal", animal: "tiger", label: "とらさん" },
  { missionCount: 25, type: "animal", animal: "elephant", label: "ぞうさんと ぞうのパーツ" },
  { missionCount: 30, type: "animal", animal: "custom", label: "じぶんで つくる" },
  { missionCount: 35, type: "part", partKey: "skin", partId: "cream", label: "くりーむ色" },
  { missionCount: 40, type: "part", partKey: "skin", partId: "sora", label: "そら色" },
  { missionCount: 45, type: "part", partKey: "skin", partId: "momo", label: "もも色" },
  { missionCount: 50, type: "part", partKey: "skin", partId: "wakaba", label: "わかば色" },
  { missionCount: 55, type: "part", partKey: "skin", partId: "sumire", label: "すみれ色" },
  { missionCount: 60, type: "part", partKey: "ears", partId: "tsuno", label: "つの" },
  { missionCount: 65, type: "part", partKey: "eyes", partId: "kirakira", label: "きらきらのおめめ" },
  { missionCount: 70, type: "part", partKey: "eyes", partId: "nikoniko", label: "にこにこのおめめ" },
  { missionCount: 75, type: "part", partKey: "mouth", partId: "waai", label: "わーいのおくち" },
  { missionCount: 80, type: "part", partKey: "mouth", partId: "neko", label: "ねこぐち" },
  { missionCount: 85, type: "part", partKey: "acc", partId: "ribbon", label: "リボン" },
  { missionCount: 90, type: "part", partKey: "acc", partId: "kanmuri", label: "かんむり" },
  { missionCount: 95, type: "part", partKey: "acc", partId: "happa", label: "はっぱ" },
];

function safeMissionCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function rewardForTarget({ animal, partKey, partId } = {}) {
  return AVATAR_REWARDS.find((reward) =>
    animal
      ? reward.type === "animal" && reward.animal === animal
      : reward.type === "part" && reward.partKey === partKey && reward.partId === partId
  ) ?? null;
}

function linkedAnimalForPart(partKey, partId) {
  return Object.entries(AVATAR_ANIMAL_PARTS).find(([, parts]) =>
    parts.some((part) => part.partKey === partKey && part.partId === partId)
  )?.[0] ?? null;
}

function partLabel(partKey, partId) {
  return AVATAR_PARTS[partKey]?.find((part) => part.id === partId)?.label ?? "このパーツ";
}

// その Avatar の要素が何回目の Mission で解放されるか。0 は最初から使える。
export function avatarUnlockMission({ animal, partKey, partId } = {}) {
  if (animal === "rabbit") return 0;
  if (partKey === "skin" && isHexColor(partId)) return 0;
  if (partKey && DEFAULT_PARTS[partKey] === partId) return 0;
  const linkedAnimal = linkedAnimalForPart(partKey, partId);
  if (linkedAnimal) {
    return linkedAnimal === "rabbit"
      ? 0
      : rewardForTarget({ animal: linkedAnimal })?.missionCount ?? null;
  }
  return rewardForTarget({ animal, partKey, partId })?.missionCount ?? null;
}

export function isAvatarAnimalUnlocked(animal, missionCount) {
  const required = avatarUnlockMission({ animal });
  return required !== null && safeMissionCount(missionCount) >= required;
}

export function isAvatarPartUnlocked(partKey, partId, missionCount) {
  const required = avatarUnlockMission({ partKey, partId });
  return required !== null && safeMissionCount(missionCount) >= required;
}

export function avatarRewardForMissionCount(missionCount) {
  const count = safeMissionCount(missionCount);
  return AVATAR_REWARDS.find((reward) => reward.missionCount === count) ?? null;
}

export function avatarNextReward(missionCount) {
  const count = safeMissionCount(missionCount);
  return AVATAR_REWARDS.find((reward) => reward.missionCount > count) ?? null;
}

function partOr(key, id) {
  if (key === "skin" && isHexColor(id)) return id; // じぶんで作った色
  return AVATAR_PARTS[key].some((p) => p.id === id) ? id : DEFAULT_PARTS[key];
}

function skinValue(id) {
  if (isHexColor(id)) return id;
  return (AVATAR_PARTS.skin.find((s) => s.id === id) ?? AVATAR_PARTS.skin[0]).value;
}

// 頭より先に描く耳（頭の丸が根元を隠す）。たれみみだけは頭のあとに重ねる。
function earsBackMarkup(id, skin) {
  if (id === "maru") return `
    <circle cx="33" cy="32" r="12" fill="${skin}"/><circle cx="87" cy="32" r="12" fill="${skin}"/>
    <circle cx="33" cy="32" r="6" fill="rgba(255,255,255,.55)"/><circle cx="87" cy="32" r="6" fill="rgba(255,255,255,.55)"/>`;
  if (id === "pointy") return `
    <path d="M30 48 L37 16 L57 34 Z" fill="${skin}"/><path d="M90 48 L83 16 L63 34 Z" fill="${skin}"/>
    <path d="M36 41 L40 25 L50 34 Z" fill="rgba(0,0,0,.14)"/><path d="M84 41 L80 25 L70 34 Z" fill="rgba(0,0,0,.14)"/>`;
  if (id === "long") return `
    <g transform="rotate(-10 46 30)"><ellipse cx="46" cy="28" rx="10" ry="24" fill="${skin}"/><ellipse cx="46" cy="31" rx="5" ry="16" fill="#ffd0da"/></g>
    <g transform="rotate(10 74 30)"><ellipse cx="74" cy="28" rx="10" ry="24" fill="${skin}"/><ellipse cx="74" cy="31" rx="5" ry="16" fill="#ffd0da"/></g>`;
  if (id === "big") return `
    <circle cx="24" cy="62" r="20" fill="${skin}"/><circle cx="24" cy="62" r="20" fill="rgba(0,0,0,.08)"/><circle cx="24" cy="62" r="12" fill="rgba(255,255,255,.5)"/>
    <circle cx="96" cy="62" r="20" fill="${skin}"/><circle cx="96" cy="62" r="20" fill="rgba(0,0,0,.08)"/><circle cx="96" cy="62" r="12" fill="rgba(255,255,255,.5)"/>`;
  if (id === "tsuno") return `
    <path d="M34 34 Q26 14 38 9 Q41 22 47 29 Z" fill="#f7eeda" stroke="#d9c9a8" stroke-width="2" stroke-linejoin="round"/>
    <path d="M86 34 Q94 14 82 9 Q79 22 73 29 Z" fill="#f7eeda" stroke="#d9c9a8" stroke-width="2" stroke-linejoin="round"/>`;
  return "";
}

function earsFrontMarkup(id, skin) {
  if (id !== "tare") return "";
  return `
    <g transform="rotate(14 28 56)"><ellipse cx="28" cy="56" rx="11" ry="21" fill="${skin}"/><ellipse cx="28" cy="56" rx="11" ry="21" fill="rgba(0,0,0,.16)"/></g>
    <g transform="rotate(-14 92 56)"><ellipse cx="92" cy="56" rx="11" ry="21" fill="${skin}"/><ellipse cx="92" cy="56" rx="11" ry="21" fill="rgba(0,0,0,.16)"/></g>`;
}

function eyesMarkup(id) {
  if (id === "kirakira") return `
    <circle cx="46" cy="60" r="5" fill="#4a3728"/><circle cx="74" cy="60" r="5" fill="#4a3728"/>
    <circle cx="47.8" cy="58.2" r="1.8" fill="#fff"/><circle cx="75.8" cy="58.2" r="1.8" fill="#fff"/>`;
  if (id === "nikoniko") return `
    <path d="M41 61 q5 -7 10 0" stroke="#4a3728" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M69 61 q5 -7 10 0" stroke="#4a3728" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  return EYES();
}

function mouthMarkup(id, skin) {
  if (id === "waai") return `
    <path d="M50 73 q10 15 20 0 z" fill="#8a4a3a"/>
    <path d="M55 80 q5 5 10 0 q-2 -4 -10 0 z" fill="#f298ab"/>`;
  if (id === "neko") return `
    <ellipse cx="60" cy="79" rx="19" ry="13" fill="#fff3dd"/>
    <path d="M56 72 h8 l-4 6 z" fill="#e58f4d"/>
    ${SMILE(82)}`;
  if (id === "zou") return `
    <path d="M60 64 q-4 20 8 30" stroke="${skin}" stroke-width="17" fill="none" stroke-linecap="round"/>
    <path d="M60 64 q-4 20 8 30" stroke="rgba(0,0,0,.10)" stroke-width="17" fill="none" stroke-linecap="round"/>
    <path d="M60 64 q-4 20 8 30" stroke="rgba(255,255,255,.5)" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  return SMILE(78);
}

function accMarkup(id) {
  if (id === "ribbon") return `
    <g transform="translate(60 25)">
      <path d="M-2 0 L-16 -9 L-15 9 Z" fill="#ff7a9d"/>
      <path d="M2 0 L16 -9 L15 9 Z" fill="#ff7a9d"/>
      <circle r="4.5" fill="#e85c84"/>
    </g>`;
  if (id === "kanmuri") return `
    <path d="M46 28 L48 13 L56 21 L60 10 L64 21 L72 13 L74 28 Z"
      fill="#ffd23f" stroke="#e0b52a" stroke-width="2" stroke-linejoin="round"/>`;
  if (id === "happa") return `
    <g transform="translate(60 21) rotate(-14)">
      <ellipse rx="11" ry="6.5" fill="#7cc95d"/>
      <path d="M-11 0 H11" stroke="#5fae4f" stroke-width="2" stroke-linecap="round"/>
    </g>`;
  return "";
}

// 子どもが描いた「いろぬり」（canvas の PNG データURL）。
// 保存データが壊れていても href 注入にならないよう、形式を必ず確かめる。
function safePaint(paint) {
  return typeof paint === "string" &&
    paint.length <= 200000 &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(paint)
    ? paint : null;
}

// ── 全身の体型 ──────────────────────────
// 絵本のキャラクターらしい「頭が大きめ」の2頭身。
// 頭（元の顔の絵を 0.8 倍して上へ）＋まるい体・そえた小さな手・のぞく足・おなか。
// 顔パーツの座標は変えず、グループごと変換して使い回す。
const HEAD_TRANSFORM = `translate(12 -7.8) scale(.8)`;

function bodyMarkup(skin) {
  return `
    <ellipse cx="49" cy="112" rx="8.5" ry="5" fill="${skin}"/><ellipse cx="49" cy="112" rx="8.5" ry="5" fill="rgba(0,0,0,.10)"/>
    <ellipse cx="71" cy="112" rx="8.5" ry="5" fill="${skin}"/><ellipse cx="71" cy="112" rx="8.5" ry="5" fill="rgba(0,0,0,.10)"/>
    <ellipse cx="60" cy="92" rx="23" ry="19" fill="${skin}"/>
    <ellipse cx="60" cy="96" rx="13" ry="11" fill="rgba(255,255,255,.4)"/>
    <g transform="rotate(24 40 89)"><ellipse cx="40" cy="89" rx="6.5" ry="11" fill="${skin}"/><ellipse cx="40" cy="89" rx="6.5" ry="11" fill="rgba(0,0,0,.07)"/></g>
    <g transform="rotate(-24 80 89)"><ellipse cx="80" cy="89" rx="6.5" ry="11" fill="${skin}"/><ellipse cx="80" cy="89" rx="6.5" ry="11" fill="rgba(0,0,0,.07)"/></g>`;
}

// いろぬりは「頭＋体＋手足」の形にクリップして、キャラクターの外へはみ出さないようにする。
// 同じ id の clipPath が画面に複数あっても、形が同一なのでどれを参照しても結果は同じ。
// canvas 側のクリップ（strokeClip）とかならず同じ形にそろえること。
function paintLayerMarkup(paint) {
  if (!paint) return "";
  return `
    <clipPath id="avatar-paint-clip">
      <circle cx="60" cy="45" r="30.4"/>
      <ellipse cx="60" cy="92" rx="23" ry="19"/>
      <circle cx="40" cy="89" r="10"/><circle cx="80" cy="89" r="10"/>
      <ellipse cx="49" cy="112" rx="8.5" ry="5"/><ellipse cx="71" cy="112" rx="8.5" ry="5"/>
    </clipPath>
    <image x="0" y="0" width="120" height="120" href="${paint}"
      clip-path="url(#avatar-paint-clip)" preserveAspectRatio="none"/>`;
}

function customFace(rawParts = {}, paint = null) {
  const skin = skinValue(partOr("skin", rawParts.skin));
  const ears = partOr("ears", rawParts.ears);
  // いろぬりは肌（頭・体）の上、目や口などの顔パーツの下に敷く。
  // 塗っても表情が消えないように、頭のグループを「肌」と「顔パーツ」の2枚に分ける。
  return `
    ${bodyMarkup(skin)}
    <g transform="${HEAD_TRANSFORM}">
      ${earsBackMarkup(ears, skin)}
      <circle cx="60" cy="66" r="38" fill="${skin}"/>
      ${earsFrontMarkup(ears, skin)}
    </g>
    ${paintLayerMarkup(paint)}
    <g transform="${HEAD_TRANSFORM}">
      ${eyesMarkup(partOr("eyes", rawParts.eyes))}
      ${CHEEKS()}
      ${mouthMarkup(partOr("mouth", rawParts.mouth), skin)}
      ${accMarkup(partOr("acc", rawParts.acc))}
    </g>`;
}

// プリセットの5ひきも同じ体型で全身にする（顔の絵はそのまま使い回す）
const PRESET_BODY_COLORS = {
  elephant: "#a9c0e4",
  rabbit: "#fdf3e7",
  tiger: "#f5a34a",
  cat: "#f6b56a",
  dog: "#e9c29b",
};

function presetFace(animalId) {
  const face = FACES[animalId];
  if (!face) return "";
  return `
    ${bodyMarkup(PRESET_BODY_COLORS[animalId] ?? "#f6b56a")}
    <g transform="${HEAD_TRANSFORM}">${face}</g>`;
}

// アバターの全身を返す（背景の色は呼び出し側の丸が担当する）。
// 文字列（プリセットID）でも、avatar オブジェクトでも受け取れる。
export function avatarSvg(avatarOrId) {
  const a = typeof avatarOrId === "string" ? { animal: avatarOrId } : avatarOrId;
  if (!a?.animal) return "";
  const face = a.animal === "custom"
    ? customFace(a.parts ?? {}, safePaint(a.paint))
    : presetFace(a.animal);
  if (!face) return "";
  return `<svg viewBox="0 0 120 120" class="avatar-face" aria-hidden="true">${face}</svg>`;
}

// 絵本の中に登場する「じぶん」バッジ（顔＋なまえ）。
// おはなし画面の隅、お祝い画面、絵本日記で共通に使う。
// アバター未作成なら空文字を返すので、呼び出し側の分岐はいらない。
export function avatarBuddy(avatar, extraClass = "") {
  if (!avatar?.animal) return "";
  return `
    <div class="avatar-buddy${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true">
      <span class="avatar-buddy-face" style="background:${avatarColorValue(avatar.color)}">${avatarSvg(avatar)}</span>
      ${avatar.name ? `<span class="avatar-buddy-name">${esc(avatar.name)}</span>` : ""}
    </div>`;
}

// ── アバターづくりのモーダル ──────────────────
// どうぶつ＋すきな色をえらんで「これで へんしん！」で保存する。
// 保存後は onChange を呼ぶので、呼び出し元で表示を更新する。
export function openAvatarPicker(ctx, root, { onChange } = {}) {
  const current = ctx.session.getAvatar();
  const missionCount = ctx.session.getCompletedMissionCount?.() ?? 0;
  let animal = current.animal && isAvatarAnimalUnlocked(current.animal, missionCount)
    ? current.animal
    : null;
  let color = current.color;
  let parts = { ...DEFAULT_PARTS, ...(current.parts ?? {}) };
  Object.keys(DEFAULT_PARTS).forEach((key) => {
    if (!isAvatarPartUnlocked(key, parts[key], missionCount)) parts[key] = DEFAULT_PARTS[key];
  });
  let paint = safePaint(current.paint);   // いろぬり（canvasのPNGデータURL）
  let pencil = "#e5484d";                 // いま持っている いろえんぴつ
  let erasing = false;
  const NAME_MAX = 8;
  const PAINT_PENCILS = ["#e5484d", "#f5a34a", "#ffd23f", "#6bbf59", "#40c4b7", "#4f86e0", "#9b6ee8", "#f298ab", "#8a5a3a", "#ffffff"];

  const lockBadge = (required) => required !== null && missionCount < required
    ? `<span class="avatar-lock-badge">🔒 あと ${required - missionCount}こ</span>`
    : "";
  const rewardLabel = (target) => rewardForTarget(target)?.label
    ?? partLabel(target.partKey, target.partId);
  const notifyLocked = (target) => {
    const required = avatarUnlockMission(target);
    if (required === null || missionCount >= required) return;
    ctx.notify?.(`あと ${required - missionCount}こ ミッションを クリアすると ${rewardLabel(target)}が つかえるよ！`);
  };
  const nextReward = avatarNextReward(missionCount);
  const progressText = nextReward
    ? `ミッション ${missionCount}こ クリア ／ あと ${nextReward.missionCount - missionCount}こで ${nextReward.label}`
    : `ミッション ${missionCount}こ クリア！ ぜんぶ ひらいたよ！`;

  const modal = document.createElement("div");
  modal.className = "avatar-modal";
  modal.innerHTML = `
    <div class="avatar-card" role="dialog" aria-modal="true" aria-label="じぶんの アバターを つくろう">
      <button type="button" class="avatar-close" data-avatar-close aria-label="とじる">×</button>
      <p class="avatar-kicker">じぶんを つくろう！</p>
      <h3 class="avatar-title">どの どうぶつに へんしん する？</h3>
      <p class="avatar-progress" data-avatar-progress>${progressText}</p>
      <div class="avatar-preview" data-avatar-preview></div>
      <div class="avatar-animal-grid">
        ${AVATAR_ANIMALS.map((a) => `
          <button type="button" class="avatar-choice${isAvatarAnimalUnlocked(a.id, missionCount) ? "" : " is-locked"}" data-avatar-animal="${a.id}"
            aria-disabled="${!isAvatarAnimalUnlocked(a.id, missionCount)}">
            ${avatarSvg(a.id)}
            <span>${a.label}</span>
            ${lockBadge(avatarUnlockMission({ animal: a.id }))}
          </button>`).join("")}
        <button type="button" class="avatar-choice avatar-choice--custom${isAvatarAnimalUnlocked("custom", missionCount) ? "" : " is-locked"}" data-avatar-animal="custom"
          aria-disabled="${!isAvatarAnimalUnlocked("custom", missionCount)}">
          <span class="avatar-choice-custom-face" data-custom-face></span>
          <span>じぶんで つくる</span>
          ${lockBadge(avatarUnlockMission({ animal: "custom" }))}
        </button>
      </div>
      <div class="avatar-parts" data-avatar-parts hidden></div>
      <p class="avatar-color-label">すきな いろ</p>
      <div class="avatar-color-row">
        ${AVATAR_COLORS.map((c) => `
          <button type="button" class="avatar-color" data-avatar-color="${c.id}"
            style="background:${c.value}" aria-label="${c.label}"></button>`).join("")}
        <span class="avatar-color avatar-color--custom" data-color-custom title="じぶんの いろ">
          <span class="avatar-custom-fill" data-color-fill></span>
          <input type="color" class="avatar-color-input" data-color-input
            value="${isHexColor(current.color) ? current.color : "#dff3d0"}" aria-label="じぶんの いろを つくる">
        </span>
      </div>
      <label class="avatar-name-field">
        <span>なまえを つけよう</span>
        <input type="text" data-avatar-name maxlength="${NAME_MAX}"
          placeholder="れい：ももた" autocomplete="off" enterkeyhint="done"
          value="${esc(current.name ?? "")}">
      </label>
      <p class="avatar-name-note">つけた なまえは、えほんの なかにも でてくるよ</p>
      <button type="button" class="big-next avatar-save" data-avatar-save>これで へんしん！</button>
    </div>`;

  const preview = modal.querySelector("[data-avatar-preview]");
  const saveButton = modal.querySelector("[data-avatar-save]");
  const partsBox = modal.querySelector("[data-avatar-parts]");
  const customFacePreview = modal.querySelector("[data-custom-face]");

  const currentAvatar = () =>
    animal === "custom" ? { animal, parts, paint } : { animal };

  // いろぬり中は canvas を壊さずに、顔のプレビューだけ描き直す
  const refreshFacePreviews = () => {
    preview.innerHTML = avatarSvg(currentAvatar());
    customFacePreview.innerHTML = avatarSvg({ animal: "custom", parts, paint });
  };

  // パーツの選択肢は「いまの組み合わせにその選択肢だけ当てたときの顔」を
  // ミニプレビューで見せる（キャラクリの試着と同じ考え方）。
  // タップのたびに描き直すので、各行の横スクロール位置は保存して戻す。
  const drawParts = () => {
    const scrolls = new Map(
      [...partsBox.querySelectorAll("[data-part-row]")].map((row) => [row.dataset.partRow, row.scrollLeft])
    );
    partsBox.innerHTML = Object.keys(AVATAR_PARTS).map((key) => `
      <div class="avatar-part-group">
        <p class="avatar-part-label">${PART_LABELS[key]}</p>
        <div class="avatar-part-row" data-part-row="${key}">
          ${AVATAR_PARTS[key].map((option) => {
            const unlocked = isAvatarPartUnlocked(key, option.id, missionCount);
            const lock = !unlocked ? `<span class="avatar-lock-mark" aria-hidden="true">🔒</span>` : "";
            return key === "skin"
            ? `<button type="button" class="avatar-part-option avatar-part-option--skin${parts.skin === option.id ? " is-selected" : ""}${unlocked ? "" : " is-locked"}"
                data-part-key="skin" data-part-id="${option.id}" style="background:${option.value}"
                aria-label="${option.label}" aria-disabled="${!unlocked}">${lock}</button>`
            : `<button type="button" class="avatar-part-option${parts[key] === option.id ? " is-selected" : ""}${unlocked ? "" : " is-locked"}"
                data-part-key="${key}" data-part-id="${option.id}" aria-label="${option.label}" aria-disabled="${!unlocked}">
                ${avatarSvg({ animal: "custom", parts: { ...parts, [key]: option.id } })}
                ${lock}
              </button>`;
          }).join("")}
          ${key === "skin" ? `
            <span class="avatar-part-option avatar-part-option--skin avatar-color--custom${isHexColor(parts.skin) ? " is-selected" : ""}" title="じぶんの いろ">
              <span class="avatar-custom-fill"${isHexColor(parts.skin) ? ` style="background:${parts.skin}"` : ""}></span>
              <input type="color" class="avatar-color-input" data-skin-color
                value="${isHexColor(parts.skin) ? parts.skin : "#f6b56a"}" aria-label="からだの いろを じぶんで つくる">
            </span>` : ""}
        </div>
      </div>`).join("") + `
      <div class="avatar-part-group">
        <p class="avatar-part-label">いろぬり（いろえんぴつで すきに ぬってね）</p>
        <div class="avatar-paint-stage">
          <span class="avatar-paint-under" aria-hidden="true">${avatarSvg({ animal: "custom", parts })}</span>
          <canvas class="avatar-paint-canvas" data-paint-canvas width="240" height="240" aria-label="いろぬりキャンバス"></canvas>
        </div>
        <div class="avatar-paint-pencils">
          ${PAINT_PENCILS.map((c) => `
            <button type="button" class="avatar-paint-pencil${!erasing && pencil === c ? " is-selected" : ""}"
              data-pencil="${c}" style="background:${c}" aria-label="いろえんぴつ ${c}"></button>`).join("")}
          <span class="avatar-paint-pencil avatar-color--custom${!erasing && !PAINT_PENCILS.includes(pencil) ? " is-selected" : ""}" title="じぶんの いろえんぴつ">
            <span class="avatar-custom-fill"${!erasing && !PAINT_PENCILS.includes(pencil) ? ` style="background:${pencil}"` : ""}></span>
            <input type="color" class="avatar-color-input" data-pencil-color
              value="${!PAINT_PENCILS.includes(pencil) ? pencil : "#e5484d"}" aria-label="じぶんの いろえんぴつを つくる">
          </span>
        </div>
        <div class="avatar-paint-tools">
          <button type="button" class="avatar-paint-tool${erasing ? " is-selected" : ""}" data-paint-eraser>けしごむ</button>
          <button type="button" class="avatar-paint-tool" data-paint-clear>ぜんぶ けす</button>
        </div>
      </div>`;
    localizeUi(partsBox);
    partsBox.querySelectorAll("[data-part-row]").forEach((row) => {
      if (scrolls.has(row.dataset.partRow)) row.scrollLeft = scrolls.get(row.dataset.partRow);
    });
    partsBox.querySelectorAll("[data-part-key]").forEach((button) => {
      button.onclick = () => {
        const target = { partKey: button.dataset.partKey, partId: button.dataset.partId };
        if (!isAvatarPartUnlocked(target.partKey, target.partId, missionCount)) {
          notifyLocked(target);
          return;
        }
        parts = { ...parts, [button.dataset.partKey]: button.dataset.partId };
        draw();
      };
    });
    // からだの「じぶんの いろ」。ドラッグ中（input）はDOMを作り直さず色だけ反映する。
    // 作り直すと開いているカラーピッカーが閉じてしまうため、確定（change）でまとめて描き直す。
    const skinColorInput = partsBox.querySelector("[data-skin-color]");
    skinColorInput.oninput = () => {
      parts = { ...parts, skin: skinColorInput.value };
      preview.innerHTML = avatarSvg(currentAvatar());
      customFacePreview.innerHTML = avatarSvg({ animal: "custom", parts, paint });
      const swatch = skinColorInput.closest(".avatar-color--custom");
      swatch.classList.add("is-selected");
      swatch.querySelector(".avatar-custom-fill").style.background = skinColorInput.value;
      partsBox.querySelectorAll('[data-part-key="skin"]').forEach((b) => b.classList.remove("is-selected"));
    };
    skinColorInput.onchange = () => draw();

    // ── いろぬりキャンバス ──
    // canvas は 240x240（表示は半分サイズ）、viewBox 120 の2倍なので座標は素直に2倍。
    // 線は顔の丸（中心 120,132・半径 76）にクリップして、はみ出さないようにする。
    const canvas = partsBox.querySelector("[data-paint-canvas]");
    const pctx = canvas.getContext("2d");
    if (paint) {
      const saved = new Image();
      saved.onload = () => pctx.drawImage(saved, 0, 0, 240, 240);
      saved.src = paint;
    }
    let stroking = false;
    const strokePos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * 240 / r.width, (e.clientY - r.top) * 240 / r.height];
    };
    canvas.onpointerdown = (e) => {
      e.preventDefault();
      stroking = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      pctx.save();
      // 頭＋体＋手足の形にクリップ（SVG側 avatar-paint-clip の座標×2）
      pctx.beginPath();
      pctx.arc(120, 90, 60.8, 0, Math.PI * 2);
      pctx.moveTo(166, 184); pctx.ellipse(120, 184, 46, 38, 0, 0, Math.PI * 2);
      pctx.moveTo(100, 178); pctx.arc(80, 178, 20, 0, Math.PI * 2);
      pctx.moveTo(180, 178); pctx.arc(160, 178, 20, 0, Math.PI * 2);
      pctx.moveTo(115, 224); pctx.ellipse(98, 224, 17, 10, 0, 0, Math.PI * 2);
      pctx.moveTo(159, 224); pctx.ellipse(142, 224, 17, 10, 0, 0, Math.PI * 2);
      pctx.clip();
      pctx.lineWidth = 11;
      pctx.lineCap = "round";
      pctx.lineJoin = "round";
      pctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
      pctx.strokeStyle = pencil;
      const [x, y] = strokePos(e);
      pctx.beginPath();
      pctx.moveTo(x, y);
      pctx.lineTo(x + 0.1, y + 0.1); // その場タップでも点が打てるように
      pctx.stroke();
    };
    canvas.onpointermove = (e) => {
      if (!stroking) return;
      const [x, y] = strokePos(e);
      pctx.lineTo(x, y);
      pctx.stroke();
    };
    const endStroke = () => {
      if (!stroking) return;
      stroking = false;
      pctx.restore();
      paint = canvas.toDataURL("image/png");
      refreshFacePreviews();
    };
    canvas.onpointerup = endStroke;
    canvas.onpointercancel = endStroke;

    // えんぴつ・けしごむの持ちかえは、canvas を壊さないようクラスだけ切り替える
    const pencilColorInput = partsBox.querySelector("[data-pencil-color]");
    const syncTools = () => {
      partsBox.querySelectorAll("[data-pencil]").forEach((b) =>
        b.classList.toggle("is-selected", !erasing && b.dataset.pencil === pencil));
      const customPencil = pencilColorInput.closest(".avatar-color--custom");
      const isCustomPencil = !erasing && !PAINT_PENCILS.includes(pencil);
      customPencil.classList.toggle("is-selected", isCustomPencil);
      if (isCustomPencil) customPencil.querySelector(".avatar-custom-fill").style.background = pencil;
      partsBox.querySelector("[data-paint-eraser]").classList.toggle("is-selected", erasing);
    };
    partsBox.querySelectorAll("[data-pencil]").forEach((button) => {
      button.onclick = () => { pencil = button.dataset.pencil; erasing = false; syncTools(); };
    });
    pencilColorInput.oninput = () => { pencil = pencilColorInput.value; erasing = false; syncTools(); };
    partsBox.querySelector("[data-paint-eraser]").onclick = () => { erasing = !erasing; syncTools(); };
    partsBox.querySelector("[data-paint-clear]").onclick = () => {
      pctx.clearRect(0, 0, 240, 240);
      paint = null;
      refreshFacePreviews();
    };
  };

  const draw = () => {
    preview.style.background = avatarColorValue(color);
    preview.innerHTML = animal
      ? avatarSvg(currentAvatar())
      : `<span class="avatar-preview-empty" aria-hidden="true">？</span>`;
    customFacePreview.innerHTML = avatarSvg({ animal: "custom", parts, paint });
    modal.querySelectorAll("[data-avatar-animal]").forEach((button) => {
      const target = { animal: button.dataset.avatarAnimal };
      const unlocked = isAvatarAnimalUnlocked(target.animal, missionCount);
      button.classList.toggle("is-selected", button.dataset.avatarAnimal === animal);
      button.classList.toggle("is-locked", !unlocked);
      button.setAttribute("aria-disabled", String(!unlocked));
    });
    modal.querySelectorAll("[data-avatar-color]").forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.avatarColor === color);
    });
    const customColorSwatch = modal.querySelector("[data-color-custom]");
    customColorSwatch.classList.toggle("is-selected", isHexColor(color));
    if (isHexColor(color)) modal.querySelector("[data-color-fill]").style.background = color;
    partsBox.hidden = animal !== "custom";
    if (animal === "custom") drawParts();
    saveButton.disabled = !animal || !isAvatarAnimalUnlocked(animal, missionCount); // どうぶつを えらぶまで へんしんできない
  };

  modal.querySelectorAll("[data-avatar-animal]").forEach((button) => {
    button.onclick = () => {
      const target = { animal: button.dataset.avatarAnimal };
      if (!isAvatarAnimalUnlocked(target.animal, missionCount)) {
        notifyLocked(target);
        return;
      }
      animal = target.animal;
      draw();
    };
  });
  modal.querySelectorAll("[data-avatar-color]").forEach((button) => {
    button.onclick = () => { color = button.dataset.avatarColor; draw(); };
  });
  // うしろの「じぶんの いろ」（この行は作り直されないので、ここで一度だけつなぐ）
  const bgColorInput = modal.querySelector("[data-color-input]");
  bgColorInput.oninput = () => {
    color = bgColorInput.value;
    preview.style.background = color;
    modal.querySelector("[data-color-fill]").style.background = color;
    modal.querySelector("[data-color-custom]").classList.add("is-selected");
    modal.querySelectorAll("[data-avatar-color]").forEach((b) => b.classList.remove("is-selected"));
  };
  bgColorInput.onchange = () => draw();

  const close = () => modal.remove();
  modal.querySelector("[data-avatar-close]").onclick = close;
  modal.onclick = (event) => { if (event.target === modal) close(); };

  const nameInput = modal.querySelector("[data-avatar-name]");
  // Enterで保存できると、iPadのキーボードを閉じる動作がそのまま完成につながる
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); saveButton.click(); }
  });

  saveButton.onclick = () => {
    if (!animal) return;
    if (!isAvatarAnimalUnlocked(animal, missionCount)) {
      notifyLocked({ animal });
      return;
    }
    const name = nameInput.value.trim().slice(0, NAME_MAX);
    ctx.session.setAvatar({
      animal, color, name,
      parts: animal === "custom" ? { ...parts } : null,
      paint: animal === "custom" ? paint : null,
    });
    const label = animal === "custom"
      ? "オリジナルキャラ"
      : AVATAR_ANIMALS.find((a) => a.id === animal)?.label ?? "";
    ctx.notify?.(name ? `${name}（${label}）に へんしん！` : `${label}に へんしん！`);
    close();
    onChange?.();
  };

  root.appendChild(modal);
  localizeUi(modal);
  draw();
}
