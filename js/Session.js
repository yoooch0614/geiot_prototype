/*
 * Session ── ロジック層（状態と保存）
 * ------------------------------------------------------------
 * ・モード（こども / おうちのひと）
 * ・いま読んでいる絵本とページ
 * ・今回のプレイで達成したミッション（写真つき）
 * ・完成した絵本日記（思い出）＝ギャラリー
 * ・お気に入りのページ／写真＝しおり
 * ・外で活動した日（健全なストリーク：没収しない・責めない）
 *
 * 保存先は2段構え：
 *   - localStorage … 軽いメタ情報（活動日・親レポート・PIN）
 *   - IndexedDB   … 写真を含む大きいデータ（思い出・読みかけの本）
 *     → リロードしても、思い出ギャラリーと撮った写真は消えない。
 *     → 読みかけの本は「つづきから」再開できる（撮った写真も残る）。
 */
import { Storage } from "./Storage.js";
import {
  BOOK_REWARD_CATALOG,
  LEGACY_LOGIN_REWARD_CATALOG,
  LOGIN_REWARD_CATALOG,
  REWARD_CATALOG,
  localDateKey,
  rewardDefinition,
  rewardRecord,
} from "../modules/shared/rewards.js";

const STORAGE_KEY = "ehon.session.v2";
const MEMORIES_KEY = "memories.v1"; // IndexedDB: 完成した絵本日記（写真つき）
const RUN_KEY = "run.v1";           // IndexedDB: 読みかけの本（ページ位置＋達成ミッション）
const MAX_MEMORIES = 30;            // 端末容量の保険。古い思い出から順に押し出す
const DEFAULT_PIN = "0000";         // おうちのひとゲートの初期PIN
const PIN_MAX_FAILURES = 3;
const PIN_LOCK_MS = 30 * 1000;
const WEARABLE_TYPES = ["hat", "clothes", "accessory", "held", "back", "plush"];

function today() {
  return localDateKey(); // YYYY-MM-DD（端末のローカル日付）
}

function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

export class Session {
  constructor() {
    // --- メモリ内 ---
    this.mode = null;         // 'child' | 'parent'
    this.bookId = null;
    this.pageIndex = 0;
    this.runMissions = [];    // 今回のプレイの達成 [{missionId, photoUrl, caption, missionText}]
    this.completedMissionCount = 0; // Avatar解放に使う、端末での累計ミッション数
    this.lastMissionCompletion = null; // 直前の達成（お祝い画面の解放通知用）
    this.memories = [];       // 完成した絵本日記（写真つき・IndexedDBから復元される）
    this.bookmarks = [];      // お気に入りのページ／日記エントリー（軽いメタ情報だけ）
    this.welcomeGuideSeen = false; // 最初のアプリ全体ガイドを見たか
    this.guideSeen = false;  // こども向けの初回「あそびかた」案内を見たか
    this.parentGuideSeen = false; // おうちのひと向けの初回「操作方法」案内を見たか

    // --- localStorage（メタのみ）---
    this.activityDays = new Set(); // 外で活動した日
    this.memoryLog = [];           // [{id, bookTitle, date, count}] 親レポート用（写真なし）
    // きょうのミッション（1日1さつ）。おうちのひとが設定する。
    // bookId が null なら「どの絵本でもOK」、指定があればその絵本だけがクリア対象。
    this.dailyMission = { enabled: true, bookId: null };
    this.missionDoneDays = {};     // { "YYYY-MM-DD": 読み終えた絵本のタイトル }
    // ログインボーナス。ログイン日は端末内のローカル日付で判定し、
    // 同じ日に何度アプリを開いても streak を増やさない。
    this.lastLoginDate = null;
    this.loginStreak = 0;
    this.mapPosition = 0;
    this.pendingLoginRewardIds = [];
    // collection room に並ぶ「すでに手に入れた」アイテム。
    this.claimedRewards = [];
    // Avatar に身につけているごほうび（帽子・服・アクセサリー等）。
    this.equippedRewardIds = [];
    // こどもの「じぶんアバター」（オリジナルキャラクター）。
    // animal は modules/shared/avatars.js のID（"custom" ならパーツ組み立て）。
    // parts はカスタム時のパーツ選択、paint はいろぬり（PNGデータURL）、
    // name はこどもがつけた なまえ。
    this.avatar = { animal: null, color: "green", name: null, parts: null, paint: null };
    this.pin = DEFAULT_PIN;
    this.pinFailedAttempts = 0;
    this.pinLockedUntil = 0;

    // --- IndexedDBに保存中の「読みかけの本」 ---
    this._savedRun = null;    // {bookId, pageIndex, missions}
    this._runTimer = null;

    this._restore();
  }

  // ── 起動時にIndexedDBから復元（app.jsのboot()でawaitする）──
  async restore() {
    const [memories, run] = await Promise.all([
      Storage.get(MEMORIES_KEY),
      Storage.get(RUN_KEY),
    ]);
    if (Array.isArray(memories)) this.memories = memories;
    if (run && run.bookId) this._savedRun = run;
  }

  // ── モード ─────────────────────────
  setMode(mode) { this.mode = mode; }
  checkPin(input) { return String(input) === String(this.pin); }
  getPinLockRemaining() {
    return Math.max(0, Number(this.pinLockedUntil) - Date.now());
  }
  isPinLocked() { return this.getPinLockRemaining() > 0; }
  pinAttemptsLeft() {
    if (this.isPinLocked()) return 0;
    return Math.max(0, PIN_MAX_FAILURES - this.pinFailedAttempts);
  }
  recordPinFailure() {
    if (this.isPinLocked()) return this.getPinLockRemaining();
    this.pinFailedAttempts += 1;
    if (this.pinFailedAttempts >= PIN_MAX_FAILURES) {
      this.pinLockedUntil = Date.now() + PIN_LOCK_MS;
      this.pinFailedAttempts = 0;
    }
    this._save();
    return this.getPinLockRemaining();
  }
  resetPinFailures() {
    if (!this.pinFailedAttempts && !this.pinLockedUntil) return;
    this.pinFailedAttempts = 0;
    this.pinLockedUntil = 0;
    this._save();
  }
  setPin(input) {
    const next = String(input ?? "");
    if (!/^\d{4}$/.test(next)) return false;
    this.pin = next;
    this._save();
    return true;
  }
  hasSeenWelcomeGuide() { return this.welcomeGuideSeen; }
  markWelcomeGuideSeen() { this.welcomeGuideSeen = true; this._save(); }
  hasSeenGuide() { return this.guideSeen; }
  markGuideSeen() { this.guideSeen = true; this._save(); }
  hasSeenParentGuide() { return this.parentGuideSeen; }
  markParentGuideSeen() { this.parentGuideSeen = true; this._save(); }

  // ── ログインボーナス / コレクション ────────────────
  // 起動時に一度だけ呼ぶ。新しい日なら一歩進み、5日目ごとのプレゼントを
  // pending にしてから保存する。プレゼントを開く操作は画面側で行う。
  recordDailyLogin() {
    const date = today();
    if (this.lastLoginDate === date) {
      return {
        isNewDay: false,
        date,
        streak: this.loginStreak,
        position: this.mapPosition,
        pendingReward: this.getPendingLoginReward(),
        shouldShow: this.pendingLoginRewardIds.length > 0,
      };
    }

    this.loginStreak = this.lastLoginDate === yesterday()
      ? Math.max(0, this.loginStreak) + 1
      : 1;
    this.lastLoginDate = date;
    this.mapPosition = ((this.loginStreak - 1) % 20) + 1;
    if (this.loginStreak % 5 === 0) {
      // 目录没有的里程碑暂时不重复发旧物品；以后加入 021、022 后会自动接上。
      const reward = LOGIN_REWARD_CATALOG[this.loginStreak / 5 - 1];
      if (reward && !this.pendingLoginRewardIds.includes(reward.id)) {
        this.pendingLoginRewardIds.push(reward.id);
      }
    }
    this._save();
    return {
      isNewDay: true,
      date,
      streak: this.loginStreak,
      position: this.mapPosition,
      pendingReward: this.getPendingLoginReward(),
      shouldShow: true,
    };
  }

  getLoginStatus() {
    return {
      lastLoginDate: this.lastLoginDate,
      streak: this.loginStreak,
      position: this.mapPosition,
      pendingReward: this.getPendingLoginReward(),
    };
  }

  getPendingLoginReward() {
    return rewardDefinition(this.pendingLoginRewardIds[0]);
  }

  claimPendingLoginReward() {
    const rewardId = this.pendingLoginRewardIds.shift();
    const definition = rewardDefinition(rewardId);
    if (!definition) {
      this._save();
      return null;
    }
    const reward = this._grantReward(definition, "login_bonus", today());
    this._save();
    return reward;
  }

  getRewards() {
    return this.claimedRewards.map((reward) => ({ ...reward }));
  }

  // 未获得项目也返回 collection room 可用的数据结构，UI 因此不需要另行维护
  // 一份「问号物品」列表。
  getCollectionItems() {
    const obtained = new Map(this.claimedRewards.map((reward) => [reward.id, reward]));
    const knownIds = new Set(REWARD_CATALOG.map((definition) => definition.id));
    const legacyObtained = this.claimedRewards
      .filter((reward) => !knownIds.has(reward.id))
      .map((reward) => LEGACY_LOGIN_REWARD_CATALOG.find((definition) => definition.id === reward.id))
      .filter(Boolean);
    return [...REWARD_CATALOG, ...legacyObtained].map((definition) => ({
      ...definition,
      obtained: obtained.has(definition.id),
      obtainedDate: obtained.get(definition.id)?.obtainedDate || null,
      source: obtained.get(definition.id)?.source || null,
      equipped: this.equippedRewardIds.includes(definition.id),
    }));
  }

  _grantReward(definition, source, obtainedDate = today(), referenceId = null) {
    const existing = this.claimedRewards.find((reward) => reward.id === definition?.id);
    if (existing) return { ...existing, isNew: false };
    const reward = rewardRecord(definition, source, obtainedDate, referenceId);
    if (!reward) return null;
    this.claimedRewards.unshift(reward);
    // 新しく身につけられるごほうびは、受け取った瞬間に Avatar へ反映する。
    // 同じ種類の道具だけを自動で入れ替え、コレクション画面から後で外せる。
    if (WEARABLE_TYPES.includes(definition.type)) {
      this.equippedRewardIds = this.equippedRewardIds
        .filter((id) => rewardDefinition(id)?.type !== definition.type);
      this.equippedRewardIds.push(definition.id);
    }
    return { ...reward, isNew: true };
  }

  // 絵本を読み終えるたび、まだ持っていない本由来アイテムをひとつ選ぶ。
  // カタログを一周した後も「ごほうびを受け取った」演出は残し、既存アイテムを
  // 重複保存しないことで部屋が散らからないようにする。
  _grantBookReward(memoryId, bookId) {
    const next = BOOK_REWARD_CATALOG.find((definition) =>
      !this.claimedRewards.some((reward) => reward.id === definition.id)
    );
    const definition = next || BOOK_REWARD_CATALOG[
      this.memories.length % BOOK_REWARD_CATALOG.length
    ];
    return this._grantReward(definition, "book", today(), `${bookId}:${memoryId}`);
  }

  // ── 絵本プレイ ───────────────────────
  // 同じ本の「読みかけ」が保存されていれば、そこから再開する
  // （リロードや本棚に戻った後でも、撮った写真とページ位置が残る）。
  // restart: true なら、読みかけがあっても最初のページからやり直す。
  // そのプレイで撮った写真も捨てて、まっさらな状態で読みはじめる。
  // つづきから始めるか最初からかは、本を選んだときに本人にたずねる（Select画面）。
  startBook(bookId, { restart = false } = {}) {
    this.bookId = bookId;
    this.lastMissionCompletion = null;
    if (!restart && this.hasResume(bookId)) {
      this.pageIndex = this._savedRun.pageIndex ?? 0;
      this.runMissions = this._savedRun.missions ?? [];
    } else {
      this.pageIndex = 0;
      this.runMissions = [];
    }
    this._saveRun();
  }
  // この本に「つづき」があるか（本棚の「つづきから」バッジにも使う）
  hasResume(bookId) {
    const r = this._savedRun;
    return !!(r && r.bookId === bookId &&
      ((r.missions?.length ?? 0) > 0 || (r.pageIndex ?? 0) > 0));
  }
  goTo(i) { this.pageIndex = i; this._saveRunSoon(); }
  next(count) { if (this.pageIndex < count - 1) { this.pageIndex++; this._saveRunSoon(); } }
  prev() { if (this.pageIndex > 0) { this.pageIndex--; this._saveRunSoon(); } }

  // ── ミッション達成 ─────────────────────
  // photoUrl が null なら「タップ達成」（写真なし）
  // missionImage はそのミッションの挿絵（写真がないとき日記の代わり絵に使う）
  // missionCharacter は写真の上に重ねるキャラクター（おはなしページと同じ演出）
  completeMission({ missionId, missionText, caption, photoUrl, missionImage, missionCharacter, vehicleColor, vehicleSourceUrl, vehicleTextureScale, originalPage = null, completedPage = null }) {
    // 元ページと完成ページは別オブジェクトで保存する。
    // 確認画面のスクラッチボードが、写真を貼った後の画像を参照しないための境界。
    const original = originalPage && typeof originalPage === "object"
      ? { ...originalPage }
      : { type: "mission", id: missionId, image: missionImage || null };
    const completed = completedPage && typeof completedPage === "object"
      ? { ...completedPage }
      : {
          type: "mission",
          id: missionId,
          image: photoUrl || missionImage || null,
          photoUrl: photoUrl || null,
        };
    const mission = {
      missionId, missionText, caption, photoUrl, missionImage, missionCharacter,
      vehicleColor, vehicleSourceUrl, vehicleTextureScale,
      originalPage: original,
      completedPage: completed,
    };
    const existingIndex = this.runMissions.findIndex((item) => item.missionId === missionId);
    const isNewMission = existingIndex < 0;
    if (isNewMission) {
      this.runMissions.push(mission);
      this.completedMissionCount += 1;
    } else {
      // 再撮影や保存の再試行では記録だけ新しくし、解放回数は増やさない。
      this.runMissions[existingIndex] = mission;
    }
    this.lastMissionCompletion = {
      missionId,
      isNewMission,
      completedMissionCount: this.completedMissionCount,
    };
    this.activityDays.add(today()); // 外で活動した日として記録
    this._save();
    this._saveRun(); // 写真はすぐIndexedDBへ（リロードしても消えない）
    return { ...this.lastMissionCompletion };
  }
  isMissionDone(missionId) {
    return this.runMissions.some((m) => m.missionId === missionId);
  }
  getCompletedMissionCount() { return this.completedMissionCount; }
  takeLastMissionCompletion() {
    const result = this.lastMissionCompletion;
    this.lastMissionCompletion = null;
    return result ? { ...result } : null;
  }
  // そのミッションでこどもが撮った写真。ページの透明部分（くるま・おうち・おはな）に
  // 敷いて見せるために使う（page.fillFrom）。
  missionPhoto(missionId) {
    return this.runMissions.find((m) => m.missionId === missionId)?.photoUrl ?? null;
  }

  // ── しおり（お気に入り） ─────────────────
  // 写真本体は保存せず、完成した memory と entryIndex だけを参照する。
  // そのため localStorage の容量を圧迫せず、写真は今までどおり IndexedDB に任せられる。
  isPageBookmarked(bookId, pageId, pageIndex) {
    return this.bookmarks.some((b) => b.kind === "page" && b.bookId === bookId &&
      (pageId ? b.pageId === pageId : b.pageIndex === pageIndex));
  }

  togglePageBookmark({ bookId, bookTitle, pageId, pageIndex, image, text }) {
    const stablePageId = pageId || `page-${pageIndex}`;
    const id = `page:${bookId}:${stablePageId}`;
    const i = this.bookmarks.findIndex((b) => b.id === id);
    if (i >= 0) {
      this.bookmarks.splice(i, 1);
      this._save();
      return false;
    }
    this.bookmarks.unshift({
      id,
      kind: "page",
      bookId,
      bookTitle,
      pageId: stablePageId,
      pageIndex,
      image,
      text,
      createdAt: new Date().toISOString(),
    });
    this._save();
    return true;
  }

  isMemoryBookmarked(memoryId, entryIndex) {
    return this.bookmarks.some((b) => b.kind === "memory" &&
      b.memoryId === memoryId && b.entryIndex === entryIndex);
  }

  toggleMemoryBookmark({ memoryId, bookTitle, entryIndex, label }) {
    const id = `memory:${memoryId}:${entryIndex}`;
    const i = this.bookmarks.findIndex((b) => b.id === id);
    if (i >= 0) {
      this.bookmarks.splice(i, 1);
      this._save();
      return false;
    }
    this.bookmarks.unshift({
      id,
      kind: "memory",
      memoryId,
      bookTitle,
      entryIndex,
      label,
      createdAt: new Date().toISOString(),
    });
    this._save();
    return true;
  }

  removeBookmark(id) {
    const before = this.bookmarks.length;
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
    if (this.bookmarks.length !== before) this._save();
  }

  // ── きょうのミッション ───────────────────
  // 「1日1さつ よむ」のデイリーミッション。おうちのひとが対象の絵本を
  // 指定でき（未指定ならどの絵本でもよい）、オン/オフも切り替えられる。
  // クリア判定は絵本を最後まで読み終えたとき（buildMemory）に行う。
  getDailyMission() { return { ...this.dailyMission }; }
  setDailyMission({ enabled = this.dailyMission.enabled, bookId = this.dailyMission.bookId } = {}) {
    this.dailyMission = { enabled: Boolean(enabled), bookId: bookId || null };
    this._save();
  }
  isDailyMissionDoneToday() {
    return Object.prototype.hasOwnProperty.call(this.missionDoneDays, today());
  }
  dailyMissionDoneCount() { return Object.keys(this.missionDoneDays).length; }
  _recordDailyMission(book) {
    if (!this.dailyMission.enabled) return;
    if (this.dailyMission.bookId && this.dailyMission.bookId !== book.id) return;
    if (this.isDailyMissionDoneToday()) return;
    this.missionDoneDays[today()] = book.title;
    // _save() は呼び出し元の buildMemory がまとめて行う
  }

  // ── じぶんアバター ─────────────────────
  // どうぶつと色の組み合わせ。妥当性チェックは呼び出し側（avatars.js）が
  // 選択肢を出す時点で済んでいるので、ここでは形だけ整えて保存する。
  getAvatar() {
    return { ...this.avatar, parts: this.avatar.parts ? { ...this.avatar.parts } : null };
  }
  hasAvatar() { return Boolean(this.avatar?.animal); }
  setAvatar({ animal = this.avatar.animal, color = this.avatar.color, name = this.avatar.name, parts = this.avatar.parts, paint = this.avatar.paint } = {}) {
    const hadAvatar = this.hasAvatar();
    const safeName = String(name ?? "").trim().slice(0, 8);
    this.avatar = {
      animal: animal || null,
      color: String(color || "green").slice(0, 24), // プリセットID か #rrggbb（じぶんの色）
      name: safeName || null,
      parts: Session._sanitizeParts(parts),
      paint: Session._sanitizePaint(paint),
    };
    // 先にごほうびを受け取っていた場合も、最初の Avatar 作成時に
    // 各カテゴリーの最新アイテムを一度だけ身につける。
    if (!hadAvatar && this.avatar.animal && this.equippedRewardIds.length === 0) {
      const equippedTypes = new Set();
      this.claimedRewards.forEach((reward) => {
        if (!WEARABLE_TYPES.includes(reward.type) || equippedTypes.has(reward.type)) return;
        equippedTypes.add(reward.type);
        this.equippedRewardIds.push(reward.id);
      });
    }
    this._save();
  }
  toggleRewardEquip(rewardId) {
    const definition = rewardDefinition(rewardId);
    const wearable = WEARABLE_TYPES.includes(definition?.type);
    if (!definition || !wearable || !this.claimedRewards.some((reward) => reward.id === definition.id)) return false;
    if (this.equippedRewardIds.includes(definition.id)) {
      this.equippedRewardIds = this.equippedRewardIds.filter((id) => id !== definition.id);
    } else {
      // 每一种身分类别只保留一件，换装时自动替换同类别的旧道具。
      this.equippedRewardIds = this.equippedRewardIds.filter((id) => rewardDefinition(id)?.type !== definition.type);
      this.equippedRewardIds.push(definition.id);
    }
    this._save();
    return true;
  }
  // いろぬりは canvas の PNG データURL だけを受け付ける（他の形式やURLは保存しない）。
  // localStorage を圧迫しないよう、長さにも上限を置く。
  static _sanitizePaint(paint) {
    return typeof paint === "string" &&
      paint.length <= 200000 &&
      /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(paint)
      ? paint : null;
  }
  // パーツは「文字列IDの浅いオブジェクト」だけを受け付ける。
  // 知らないIDが混ざっても描画側（avatars.js）が既定パーツに倒すので、ここでは形だけ守る。
  static _sanitizeParts(parts) {
    if (!parts || typeof parts !== "object" || Array.isArray(parts)) return null;
    const out = {};
    for (const key of ["skin", "ears", "eyes", "mouth", "acc"]) {
      if (typeof parts[key] === "string") out[key] = parts[key].slice(0, 24);
    }
    return Object.keys(out).length ? out : null;
  }

  // ── きろくの書き出し ─────────────────────
  // 写真を含む思い出は IndexedDB に保存しているため、設定や軽い記録と
  // ひとつの JSON にまとめて、端末の外へバックアップできるようにする。
  // PIN や PIN の失敗回数など、書き出す必要のない保護情報は含めない。
  exportData(settings = {}) {
    return {
      format: "ehon-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      memories: this.memories,
      bookmarks: this.bookmarks,
      activityDays: [...this.activityDays],
      memoryLog: this.memoryLog,
      dailyMission: { ...this.dailyMission },
      missionDoneDays: { ...this.missionDoneDays },
      completedMissionCount: this.completedMissionCount,
      avatar: { ...this.avatar },
      equippedRewardIds: [...this.equippedRewardIds],
      lastLoginDate: this.lastLoginDate,
      loginStreak: this.loginStreak,
      mapPosition: this.mapPosition,
      pendingLoginRewardIds: [...this.pendingLoginRewardIds],
      claimedRewards: this.claimedRewards,
      resume: this._savedRun,
      settings: { ...settings },
    };
  }

  // ── 絵本完了 → 絵本日記を生成 ──────────────
  // 日記には「おはなしの挿絵」と「ミッションのしゃしん」を絵本の順番どおりに収める。
  // 例）はっぱのぼうけん = 挿絵3枚 + しゃしん2枚 の5枚アルバム
  buildMemory(book) {
    const done = new Map(this.runMissions.map((m) => [m.missionId, m]));
    const bookColorPhotos = book.id === "book-niji"
      ? Object.fromEntries(["nm1", "nm2", "nm3"].map((id) => {
          const mission = done.get(id);
          return [id, mission?.vehicleSourceUrl || mission?.photoUrl || null];
        }).filter(([, photo]) => photo))
      : {};
    const bookColorScales = book.id === "book-niji"
      ? Object.fromEntries(["nm1", "nm2", "nm3"].map((id) => [id, Number(done.get(id)?.vehicleTextureScale) || 1]))
      : {};
    const bookColorValues = book.id === "book-niji"
      ? Object.fromEntries(["nm1", "nm2", "nm3"].map((id) => [id, done.get(id)?.vehicleColor || null]).filter(([, color]) => color))
      : {};
    const entries = [];
    for (const page of book.pages ?? []) {
      if (page.type === "story" && page.image) {
        // 挿絵の透明部分（くるま・おうち・おはな）に敷く写真も一緒に残しておく。
        // これが無いと、日記では透明のまま＝色のない絵に見えてしまう（おはなし画面と食い違う）。
        const originalPage = {
          id: page.id,
          type: "story",
          image: page.image,
        };
        const completedPage = {
          id: page.id,
          type: "story",
          image: page.image,
          // book-niji は各ページの透明部分へ、撮影ガイド内の写真を直接描く。
          // ミッションページの完成画像（別ページの絵）を下に敷くと、絵ごとの
          // 車・家の位置の違いで写真がずれて見えるため保存しない。
          fillPhoto: book.id === "book-niji"
            ? null
            : page.fillFrom ? (done.get(page.fillFrom)?.photoUrl ?? null) : null,
          colorFills: page.colorFills ?? null,
        };
        entries.push({
          kind: "story",
          image: page.image,
          // 後方互換用の従来フィールドは残し、新しい表示用データは分離して持つ。
          fillPhoto: completedPage.fillPhoto,
          colorFills: completedPage.colorFills,
          originalPage,
          completedPage,
        });
      } else if (page.type === "mission" && done.has(page.id)) {
        const m = done.get(page.id);
        const originalPage = m.originalPage && typeof m.originalPage === "object"
          ? { ...m.originalPage }
          : { id: page.id, type: "mission", image: page.image };
        const completedPage = m.completedPage && typeof m.completedPage === "object"
          ? { ...m.completedPage }
          : {
              id: page.id,
              type: "mission",
              image: m.photoUrl || page.image,
              photoUrl: m.photoUrl || null,
            };
        entries.push({
          kind: "mission",
          missionId: page.id,
          developmentDomains: page.developmentDomains ?? [],
          photoUrl: m.photoUrl,
          caption: m.caption,
          missionText: m.missionText,
          missionImage: m.missionImage,
          missionCharacter: m.missionCharacter,
          vehicleColor: m.vehicleColor || null,
          originalPage,
          completedPage,
        });
      }
    }
    const memory = {
      // 時刻だけだと、同じミリ秒に2つ作られたとき id がぶつかる。ぶつかると、おもいで一覧で
      // 古いほうを開いたのに新しいほうが出る（＝上書きされたように見える）。乱数を足して防ぐ。
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      bookId: book.id,
      bookTitle: book.title,
      date: today(),
      bookColorPhotos,
      bookColorScales,
      bookColorValues,
      // 読んだときのアバターをそのまま残す（あとで作りなおしても日記は当時のまま）
      reader: this.avatar.animal
        ? { ...this.avatar, parts: this.avatar.parts ? { ...this.avatar.parts } : null }
        : null,
      entries,
    };
    // 絵本完了のごほうびは、完了した瞬間に collection room へ保存する。
    // Complete 画面ではこの記録を「プレゼントを開ける」演出として見せるので、
    // 途中でリロードしても獲得アイテムが消えない。
    const bookReward = this._grantBookReward(memory.id, book.id);
    memory.reward = bookReward ? { ...bookReward } : null;
    this.memories.unshift(memory);               // ギャラリー（写真つき）
    if (this.memories.length > MAX_MEMORIES) this.memories.length = MAX_MEMORIES;
    this.memoryLog.unshift({                      // 親レポート（メタのみ・保存）
      id: memory.id,
      bookTitle: book.title,
      date: memory.date,
      count: this.runMissions.length,             // 親レポートは達成ミッション数のまま
    });
    this._recordDailyMission(book);               // きょうのミッション（1日1さつ）の判定
    this._save();
    Storage.set(MEMORIES_KEY, this.memories);     // 思い出をIndexedDBへ
    this._clearRun();                             // 読み終えたので「つづき」は消す
    return memory;
  }

  // ── 親レポート用の集計 ─────────────────
  activityDayCount() { return this.activityDays.size; }
  activityDaysThisWeek() {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // 週の月曜
    const from = monday.toISOString().slice(0, 10);
    return [...this.activityDays].filter((d) => d >= from).length;
  }

  reset() {
    this.activityDays = new Set();
    this.memoryLog = [];
    this.missionDoneDays = {}; // ミッションの設定（dailyMission）は親の意図なので残す
    this.completedMissionCount = 0;
    this.lastMissionCompletion = null;
    this.lastLoginDate = null;
    this.loginStreak = 0;
    this.mapPosition = 0;
    this.pendingLoginRewardIds = [];
    this.claimedRewards = [];
    this.equippedRewardIds = [];
    this.avatar = { animal: null, color: "green", name: null, parts: null, paint: null };
    this.memories = [];
    this.bookmarks = [];
    this.welcomeGuideSeen = false;
    this.guideSeen = false;
    this.parentGuideSeen = false;
    this.runMissions = [];
    this._save();
    Storage.remove(MEMORIES_KEY);
    this._clearRun();
  }

  // ── 保存 / 復元 ───────────────────────
  // 「読みかけの本」をIndexedDBへ保存する。
  // ページをめくるたびに写真ごと書き直すのはもったいないので、
  // ページ移動は少し待ってからまとめて保存する（_saveRunSoon）。
  _saveRun() {
    clearTimeout(this._runTimer);
    this._savedRun = {
      bookId: this.bookId,
      pageIndex: this.pageIndex,
      missions: this.runMissions,
    };
    Storage.set(RUN_KEY, this._savedRun);
  }
  _saveRunSoon() {
    clearTimeout(this._runTimer);
    this._runTimer = setTimeout(() => this._saveRun(), 300);
  }
  _clearRun() {
    clearTimeout(this._runTimer);
    this._savedRun = null;
    Storage.remove(RUN_KEY);
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activityDays: [...this.activityDays],
        memoryLog: this.memoryLog,
        dailyMission: this.dailyMission,
        missionDoneDays: this.missionDoneDays,
        completedMissionCount: this.completedMissionCount,
        avatar: this.avatar,
        equippedRewardIds: this.equippedRewardIds,
        lastLoginDate: this.lastLoginDate,
        loginStreak: this.loginStreak,
        mapPosition: this.mapPosition,
        pendingLoginRewardIds: this.pendingLoginRewardIds,
        claimedRewards: this.claimedRewards,
        bookmarks: this.bookmarks,
        welcomeGuideSeen: this.welcomeGuideSeen,
        guideSeen: this.guideSeen,
        parentGuideSeen: this.parentGuideSeen,
        pin: this.pin,
        pinFailedAttempts: this.pinFailedAttempts,
        pinLockedUntil: this.pinLockedUntil,
      }));
    } catch (_) {}
  }
  _restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.activityDays = new Set(s.activityDays ?? []);
      this.memoryLog = s.memoryLog ?? [];
      if (s.dailyMission && typeof s.dailyMission === "object") {
        this.dailyMission = {
          enabled: s.dailyMission.enabled !== false,
          bookId: s.dailyMission.bookId || null,
        };
      }
      if (s.missionDoneDays && typeof s.missionDoneDays === "object" && !Array.isArray(s.missionDoneDays)) {
        this.missionDoneDays = s.missionDoneDays;
      }
      this.completedMissionCount = Math.max(0, Math.floor(Number(s.completedMissionCount) || 0));
      this.lastLoginDate = typeof s.lastLoginDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.lastLoginDate)
        ? s.lastLoginDate : null;
      this.loginStreak = Math.max(0, Math.floor(Number(s.loginStreak) || 0));
      this.mapPosition = Math.max(0, Math.min(20, Math.floor(Number(s.mapPosition) || 0)));
      this.pendingLoginRewardIds = Array.isArray(s.pendingLoginRewardIds)
        ? s.pendingLoginRewardIds.filter((id) => Boolean(rewardDefinition(id)))
        : [];
      // 旧备份没有 claimedRewards，配列が壊れていてもアプリはそのまま使える。
      this.claimedRewards = Array.isArray(s.claimedRewards)
        ? s.claimedRewards.filter((reward) => reward && typeof reward.id === "string" && Boolean(rewardDefinition(reward.id)))
          .map((reward) => ({
            ...rewardDefinition(reward.id),
            ...reward,
            obtained: true,
            obtainedDate: reward.obtainedDate || null,
            source: reward.source === "book"
              ? "book"
              : reward.source === "login_bonus" ? "login_bonus" : "login",
          }))
        : [];
      const claimedIds = new Set(this.claimedRewards.map((reward) => reward.id));
      if (Array.isArray(s.equippedRewardIds)) {
        this.equippedRewardIds = s.equippedRewardIds.filter((id) => {
          const definition = rewardDefinition(id);
      return claimedIds.has(id) && WEARABLE_TYPES.includes(definition?.type);
        });
      } else {
        // 新字段加入前已经获得的可穿戴奖励也要能出现在自己的 Avatar 上。
        const migratedTypes = new Set();
        this.equippedRewardIds = this.claimedRewards
          .filter((reward) => {
            if (!WEARABLE_TYPES.includes(reward.type) || migratedTypes.has(reward.type)) return false;
            migratedTypes.add(reward.type);
            return true;
          })
          .map((reward) => reward.id);
      }
      if (s.avatar && typeof s.avatar === "object") {
        const savedName = String(s.avatar.name ?? "").trim().slice(0, 8);
        this.avatar = {
          animal: s.avatar.animal || null,
          color: s.avatar.color || "green",
          name: savedName || null,
          parts: Session._sanitizeParts(s.avatar.parts),
          paint: Session._sanitizePaint(s.avatar.paint),
        };
      }
      this.bookmarks = Array.isArray(s.bookmarks) ? s.bookmarks : [];
      this.welcomeGuideSeen = Boolean(s.welcomeGuideSeen);
      this.guideSeen = Boolean(s.guideSeen);
      this.parentGuideSeen = Boolean(s.parentGuideSeen);
      this.pin = s.pin ?? DEFAULT_PIN;
      this.pinFailedAttempts = Math.max(0, Math.floor(Number(s.pinFailedAttempts) || 0));
      this.pinLockedUntil = Math.max(0, Number(s.pinLockedUntil) || 0);
      if (this.pinLockedUntil <= Date.now()) this.pinLockedUntil = 0;
    } catch (_) {}
  }
}
