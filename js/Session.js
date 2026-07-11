/*
 * Session ── ロジック層（状態と保存）
 * ------------------------------------------------------------
 * ・モード（こども / おうちのひと）
 * ・いま読んでいる絵本とページ
 * ・今回のプレイで達成したミッション（写真つき）
 * ・完成した絵本日記（思い出）＝ギャラリー
 * ・外で活動した日（健全なストリーク：没収しない・責めない）
 *
 * 進捗のメタ情報は localStorage に保存する。
 * 写真そのものはメモリ内だけ（リロードで消える）。永続化は後回し（IndexedDB）。
 */
const STORAGE_KEY = "ehon.session.v2";
const DEFAULT_PIN = "0000"; // おうちのひとゲート（プロト用の固定PIN）

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export class Session {
  constructor() {
    // --- メモリ内（保存しない）---
    this.mode = null;         // 'child' | 'parent'
    this.bookId = null;
    this.pageIndex = 0;
    this.runMissions = [];    // 今回のプレイの達成 [{missionId, photoUrl, caption, missionText}]
    this.memories = [];       // 完成した絵本日記（写真つき・当セッション限り）

    // --- 保存する（メタのみ）---
    this.activityDays = new Set(); // 外で活動した日
    this.memoryLog = [];           // [{id, bookTitle, date, count}] 親レポート用（写真なし）
    this.pin = DEFAULT_PIN;

    this._restore();
  }

  // ── モード ─────────────────────────
  setMode(mode) { this.mode = mode; }
  checkPin(input) { return String(input) === String(this.pin); }

  // ── 絵本プレイ ───────────────────────
  startBook(bookId) {
    this.bookId = bookId;
    this.pageIndex = 0;
    this.runMissions = [];
  }
  goTo(i) { this.pageIndex = i; }
  next(count) { if (this.pageIndex < count - 1) this.pageIndex++; }
  prev() { if (this.pageIndex > 0) this.pageIndex--; }

  // ── ミッション達成 ─────────────────────
  // photoUrl が null なら「タップ達成」（写真なし）
  // missionImage はそのミッションの挿絵（写真がないとき日記の代わり絵に使う）
  // missionCharacter は写真の上に重ねるキャラクター（おはなしページと同じ演出）
  completeMission({ missionId, missionText, caption, photoUrl, missionImage, missionCharacter }) {
    this.runMissions.push({ missionId, missionText, caption, photoUrl, missionImage, missionCharacter });
    this.activityDays.add(today()); // 外で活動した日として記録
    this._save();
  }
  isMissionDone(missionId) {
    return this.runMissions.some((m) => m.missionId === missionId);
  }
  // そのミッションでこどもが撮った写真。ページの透明部分（くるま・おうち・おはな）に
  // 敷いて見せるために使う（page.fillFrom）。
  missionPhoto(missionId) {
    return this.runMissions.find((m) => m.missionId === missionId)?.photoUrl ?? null;
  }

  // ── 絵本完了 → 絵本日記を生成 ──────────────
  // 日記には「おはなしの挿絵」と「ミッションのしゃしん」を絵本の順番どおりに収める。
  // 例）はっぱのぼうけん = 挿絵3枚 + しゃしん2枚 の5枚アルバム
  buildMemory(book) {
    const done = new Map(this.runMissions.map((m) => [m.missionId, m]));
    const entries = [];
    for (const page of book.pages ?? []) {
      if (page.type === "story" && page.image) {
        entries.push({ kind: "story", image: page.image });
      } else if (page.type === "mission" && done.has(page.id)) {
        const m = done.get(page.id);
        entries.push({
          kind: "mission",
          photoUrl: m.photoUrl,
          caption: m.caption,
          missionText: m.missionText,
          missionImage: m.missionImage,
          missionCharacter: m.missionCharacter,
        });
      }
    }
    const memory = {
      id: `mem-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      date: today(),
      entries,
    };
    this.memories.unshift(memory);               // ギャラリー（写真つき・メモリ）
    this.memoryLog.unshift({                      // 親レポート（メタのみ・保存）
      id: memory.id,
      bookTitle: book.title,
      date: memory.date,
      count: this.runMissions.length,             // 親レポートは達成ミッション数のまま
    });
    this._save();
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
    this.memories = [];
    this.runMissions = [];
    this._save();
  }

  // ── 保存 / 復元 ───────────────────────
  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activityDays: [...this.activityDays],
        memoryLog: this.memoryLog,
        pin: this.pin,
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
      this.pin = s.pin ?? DEFAULT_PIN;
    } catch (_) {}
  }
}
