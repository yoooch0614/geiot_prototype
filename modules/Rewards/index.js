import { esc } from "../shared/utils.js";
import { avatarSvg, openAvatarPicker } from "../shared/avatars.js";

const MAP_DAYS = 20;

function mapMarkup(ctx, position) {
  const safePosition = Math.max(0, Math.min(MAP_DAYS, Number(position) || 0));
  const nodes = Array.from({ length: MAP_DAYS }, (_, index) => {
    const day = index + 1;
    const row = Math.floor(index / 5);
    const col = row % 2 === 0 ? index % 5 : 4 - (index % 5);
    const current = day === safePosition;
    return `
      <span class="login-map-node${day <= safePosition ? " is-visited" : ""}${current ? " is-current" : ""}"
        style="--map-row:${row};--map-col:${col}" data-map-day="${day}">
        <span class="login-map-node__sign">${day % 5 === 0 ? "🎁" : day}</span>
        <span class="login-map-node__label">Day ${day}</span>
        ${current && avatarSvg(ctx.session.getAvatar()) ? `<span class="login-map-rabbit" aria-label="いまここ">${avatarSvg(ctx.session.getAvatar())}</span>` : ""}
      </span>`;
  }).join("");
  return `
    <div class="login-map" aria-label="連続ログインのまち">
      <span class="login-map-town login-map-town--one" aria-hidden="true">🏠</span>
      <span class="login-map-town login-map-town--two" aria-hidden="true">🌳</span>
      <span class="login-map-town login-map-town--three" aria-hidden="true">🏡</span>
      <div class="login-map-path" aria-hidden="true"></div>
      <div class="login-map-nodes">${nodes}</div>
    </div>`;
}

function rewardPreview(reward) {
  if (!reward) return "";
  return `
    <span class="login-gift-reward-icon" aria-hidden="true">${rewardVisualMarkup(reward, "login-gift-reward-asset")}</span>
    <span class="login-gift-reward-name">${esc(reward.name)}</span>`;
}

function rewardVisualMarkup(item, className = "") {
  const file = item?.file || (typeof item?.image === "string" && item.image.startsWith("content/") ? item.image : "");
  if (file) {
    return `<img${className ? ` class="${esc(className)}"` : ""} src="${esc(file)}" alt="" draggable="false">`;
  }
  return esc(item?.image || "🎁");
}

export const LoginRewardScreen = {
  render(ctx, params = {}) {
    const status = ctx.session.getLoginStatus();
    const pending = status.pendingReward;
    const returnTo = params.returnTo || "MODE";
    const back = returnTo !== "MODE"
      ? `<button class="back" data-back>‹ もどる</button>`
      : "";
    const dayCopy = params.isNewDay
      ? `Day ${status.streak} の まちへ、いっぽ すすんだよ！`
      : `れんぞく ${status.streak || 0} 日。まちを のぞいてみよう！`;
    return `
      <div class="screen center login-reward-screen">
        ${back}
        <div class="login-reward-heading">
          <span class="login-reward-kicker">LOGIN ADVENTURE</span>
          <h1>まちの おさんぽ</h1>
          <p>${dayCopy}</p>
        </div>
        ${mapMarkup(ctx, status.position)}
        <div class="login-streak-badge"><strong>Day ${status.streak || 0}</strong><span>れんぞくログイン</span></div>
        ${pending ? `
          <section class="login-gift" data-login-gift>
            <p class="login-gift-copy" data-gift-copy>Day ${status.streak} の おたのしみ！</p>
            <button type="button" class="login-gift-box" data-login-gift-button aria-label="プレゼントをひらく">🎁</button>
            <div class="login-gift-reveal" data-gift-reveal hidden>
              <span class="login-gift-reveal-label">新しいアイテムをゲット！</span>
              <span class="login-gift-reward" data-gift-reward>${rewardPreview(pending)}</span>
            </div>
            <p class="login-gift-hint" data-gift-hint>タッチして あけてね</p>
          </section>`
          : `<p class="login-walk-copy">きょうも まちの なかまに あえたね。<br>つぎの プレゼントまで あと ${5 - (status.streak % 5 || 5)} 日！</p>`}
        <button type="button" class="big-next login-reward-next" data-login-next${pending ? " hidden" : ""}>${pending ? "プレゼントを ひらく" : "ぼうけんへ ›"}</button>
      </div>`;
  },

  mount(ctx, params = {}, root) {
    const returnTo = params.returnTo || "MODE";
    root.querySelector("[data-back]")?.addEventListener("click", () => ctx.go(returnTo));
    const pending = ctx.session.getPendingLoginReward();
    const giftButton = root.querySelector("[data-login-gift-button]");
    const giftReveal = root.querySelector("[data-gift-reveal]");
    const giftHint = root.querySelector("[data-gift-hint]");
    const giftCopy = root.querySelector("[data-gift-copy]");
    const next = root.querySelector("[data-login-next]");

    if (giftButton && pending) {
      giftButton.onclick = () => {
        const reward = ctx.session.claimPendingLoginReward();
        if (!reward) return;
        giftButton.disabled = true;
        giftButton.classList.add("is-open");
        giftButton.innerHTML = rewardVisualMarkup(reward, "login-gift-open-image");
        giftCopy.textContent = reward.isNew ? "たいせつに あつめよう！" : "また あえたね！";
        giftHint.hidden = true;
        giftReveal.hidden = false;
        next.hidden = false;
        next.textContent = "ぼうけんへ ›";
        ctx.notify?.("新しいアイテムを ゲット！");
      };
    }
    next?.addEventListener("click", () => ctx.go(returnTo));
  },
};

const SOURCE_LABELS = {
  login: "ログインの おくりもの",
  login_bonus: "ログインボーナス",
  book: "えほんの ごほうび",
};
const TYPE_LABELS = {
  hat: "ぼうし",
  clothes: "ふく",
  accessory: "アクセサリー",
  held: "もちもの",
  back: "せおいもの",
  plush: "ぬいぐるみ",
  furniture: "家具",
  decor: "かざり",
};

function itemMarkup(item) {
  const source = item.source ? SOURCE_LABELS[item.source] : "まだ みつけていないよ";
  const wearable = ["hat", "clothes", "accessory", "held", "back", "plush"].includes(item.type);
  const tag = item.obtained && wearable ? "button" : "div";
  const equipAttrs = item.obtained && wearable
    ? ` type="button" data-equip-reward="${esc(item.id)}" aria-pressed="${item.equipped ? "true" : "false"}"`
    : "";
  return `
    <${tag} class="collection-item${item.obtained ? " is-obtained" : " is-locked"}${item.equipped ? " is-equipped" : ""}" title="${esc(item.name)}"${equipAttrs}>
      <span class="collection-item-image" aria-hidden="true">${item.obtained ? rewardVisualMarkup(item, "collection-item-asset") : "？"}</span>
      <span class="collection-item-name">${item.obtained ? esc(item.name) : "ひみつの アイテム"}</span>
      <span class="collection-item-type">${esc(TYPE_LABELS[item.type] || item.type)} · ${esc(source)}</span>
      ${item.obtained && wearable ? `<span class="collection-item-action">${item.equipped ? "はずす" : "Avatarに つける"}</span>` : ""}
    </${tag}>`;
}

function placedItems(items) {
  const obtained = items.filter((item) => item.obtained && item.placement === "shelf");
  return obtained.map((item, index) => `
    <span class="collection-room-item collection-room-item--${esc(item.type)} collection-room-item--${index % 5}"
      title="${esc(item.name)}" aria-label="${esc(item.name)}">${rewardVisualMarkup(item, "collection-room-item-asset")}</span>`).join("");
}

function furnitureItems(items, layer) {
  const furniture = items.filter((item) => item.obtained && item.placement === "floor");
  const selected = furniture.filter((_, index) => layer === "front" ? index % 2 === 1 : index % 2 === 0);
  return selected.map((item, index) => `
    <span class="collection-room-furniture-item collection-room-furniture-item--${index % 4}" data-item-id="${esc(item.id)}"
      title="${esc(item.name)}" aria-label="${esc(item.name)}">${rewardVisualMarkup(item, "collection-room-furniture-asset")}</span>`).join("");
}

function wallItems(items) {
  return items
    .filter((item) => item.obtained && item.placement === "wall")
    .map((item, index) => `
      <span class="collection-room-wall-item collection-room-wall-item--${index % 3}" title="${esc(item.name)}" aria-label="${esc(item.name)}">
        ${rewardVisualMarkup(item, "collection-room-wall-asset")}
      </span>`)
    .join("");
}

function wardrobeItems(items) {
  return items
    .filter((item) => item.obtained && ["hat", "clothes"].includes(item.type))
    .slice(0, 4)
    .map((item) => `<span class="collection-room-wear-item" title="${esc(item.name)}">${rewardVisualMarkup(item, "collection-room-wear-asset")}</span>`)
    .join("");
}

function equippedWear(items, type, position) {
  const item = items.find((candidate) => candidate.equipped && (candidate.slot || candidate.type) === type);
  return item
    ? `<span class="collection-room-equipped collection-room-equipped--${position}" title="${esc(item.name)}">${rewardVisualMarkup(item, "collection-room-equipped-asset")}</span>`
    : "";
}

function avatarRoomMarkup(avatar, items) {
  return `
    <div class="collection-room-buddy" aria-label="${esc(avatar.name || "じぶんの Avatar")}">
      <span class="collection-room-avatar">
        ${equippedWear(items, "back", "back")}
        ${equippedWear(items, "hat", "hat")}
        ${equippedWear(items, "clothes", "clothes")}
        ${equippedWear(items, "accessory", "accessory")}
        ${equippedWear(items, "plush", "plush")}
        ${equippedWear(items, "held", "held")}
        ${avatarSvg(avatar)}
      </span>
      ${avatar.name ? `<span class="collection-room-buddy-name">${esc(avatar.name)}</span>` : ""}
    </div>`;
}

function avatarRequiredMarkup(returnTo) {
  return `
    <div class="screen center collection-locked-screen">
      <button class="back" data-back>‹ おもいで</button>
      <div class="collection-locked-card">
        <span class="collection-locked-icon" aria-hidden="true">🏡</span>
        <p class="collection-locked-kicker">MY ROOM</p>
        <h1>じぶんの Avatar を つくってね！</h1>
        <p>收藏房间是你自己的小房间。<br>请先创建自己的 Avatar，再进入房间。</p>
        <button class="big-next collection-create-avatar" type="button" data-create-avatar>创建 Avatar ›</button>
      </div>
    </div>`;
}

export const CollectionRoomScreen = {
  render(ctx, params = {}) {
    const avatar = ctx.session.getAvatar();
    if (!avatar?.animal) return avatarRequiredMarkup(params.returnTo || "SELECT");
    const items = ctx.session.getCollectionItems();
    const obtained = items.filter((item) => item.obtained).length;
    return `
      <div class="screen collection-screen">
        <button class="back" data-back>‹ おもいで</button>
        <div class="collection-heading">
          <span class="collection-heading-icon" aria-hidden="true">🏡</span>
          <div><h1>コレクションルーム</h1><p>あつめた ごほうびを かざろう！</p></div>
          <strong>${obtained} / ${items.length}</strong>
        </div>
        <section class="collection-room collection-room--3d" aria-label="3D ごほうびコレクションルーム">
          <div class="collection-room-back-wall" aria-hidden="true">
            <div class="collection-room-window"><span>☀</span></div>
            <div class="collection-room-clock">◷</div>
            <div class="collection-room-wall-decor">${wallItems(items)}</div>
            <div class="collection-room-shelf">${placedItems(items)}</div>
            <div class="collection-room-wardrobe"><span>♧</span><div class="collection-room-wardrobe-items">${wardrobeItems(items)}</div><i></i><i></i></div>
          </div>
          <div class="collection-room-side-wall" aria-hidden="true"></div>
          <div class="collection-room-floor" aria-hidden="true"></div>
          <div class="collection-room-rear-furniture-layer" aria-hidden="true">${furnitureItems(items, "rear")}</div>
          <div class="collection-room-rug" aria-hidden="true"></div>
          <div class="collection-room-avatar-layer">${avatarRoomMarkup(avatar, items)}</div>
          <div class="collection-room-front-furniture-layer" aria-hidden="true">${furnitureItems(items, "front")}</div>
        </section>
        <section class="collection-list" aria-label="ごほうび一覧">
          <h2>みつけた アイテム</h2>
          <div class="collection-grid">${items.map(itemMarkup).join("")}</div>
        </section>
      </div>`;
  },
  mount(ctx, params = {}, root) {
    const returnTo = params.returnTo || "SELECT";
    const goBack = () =>
      returnTo === "GALLERY" ? ctx.go("GALLERY") : ctx.go("SELECT", { view: "memories" })
    root.querySelector("[data-back]")?.addEventListener("click", goBack);
    if (!ctx.session.hasAvatar?.() && !ctx.session.getAvatar()?.animal) {
      root.querySelector("[data-create-avatar]")?.addEventListener("click", () =>
        openAvatarPicker(ctx, root, { onChange: () => ctx.go("COLLECTION", params) })
      );
      return;
    }
    root.querySelectorAll("[data-equip-reward]").forEach((button) => {
      button.addEventListener("click", () => {
        if (ctx.session.toggleRewardEquip(button.dataset.equipReward)) ctx.go("COLLECTION", params);
      });
    });
  },
};
