import { esc } from "../shared/utils.js";

// きょうのミッションの設定カード。おうちのひとが「1日1さつ」の対象を選べる。
// 「どのえほんでもOK」か、特定の1冊を指定するか。オフにすればこども画面から消える。
function missionSettingMarkup(ctx) {
  const s = ctx.session;
  const mission = s.getDailyMission();
  const doneToday = s.isDailyMissionDoneToday();
  const doneCount = s.dailyMissionDoneCount();
  const options = [
    { value: "", label: "どのえほんでもOK" },
    ...ctx.repo.books.map((b) => ({
      value: b.id,
      label: ctx.repo.book(b.id)?.title ?? b.title ?? b.id,
    })),
  ];
  return `
    <section class="mission-setting${mission.enabled ? "" : " is-off"}">
      <div class="mission-setting-head">
        <h3>きょうのミッション</h3>
        <button type="button" class="settings-switch${mission.enabled ? " is-on" : ""}"
          data-mission-toggle role="switch" aria-checked="${mission.enabled}">
          ${mission.enabled ? "オン" : "オフ"}
        </button>
      </div>
      <p class="mission-setting-desc">こどものホームに「1日1さつ よもう」の目標を表示します。よむ絵本はここで変えられます。</p>
      <label class="mission-setting-row">
        <span>よむ えほん</span>
        <select class="settings-select" data-mission-book aria-label="ミッションで よむ えほん"
          ${mission.enabled ? "" : "disabled"}>
          ${options.map((o) => `
            <option value="${esc(o.value)}"${o.value === (mission.bookId ?? "") ? " selected" : ""}>${esc(o.label)}</option>`).join("")}
        </select>
      </label>
      <p class="mission-setting-status" data-mission-status>
        きょう：${doneToday ? "クリアずみ 🎉" : "まだ"} ／ これまで ${doneCount}日 クリア
      </p>
    </section>`;
}

export const ParentScreen = {
  render(ctx) {
    const s = ctx.session;
    const week = s.activityDaysThisWeek();
    const total = s.activityDayCount();
    const log = s.memoryLog;
    const logHtml = log.length
      ? log.map((m) => `
          <li class="log-row">
            <span class="log-date">${esc(m.date)}</span>
            <span class="log-book">${esc(m.bookTitle)}</span>
            <span class="log-count">${m.count}こ たっせい</span>
          </li>`).join("")
      : `<li class="empty">まだ きろくが ありません。「こども」で あそんでみてね。</li>`;
    return `
      <div class="screen parent">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="parent-title">おうちのひと レポート</h2>
        <div class="stat-row">
          <div class="stat"><b>${week}</b><span>今週 あそんだ日</span></div>
          <div class="stat"><b>${total}</b><span>これまで あそんだ日</span></div>
        </div>
        <p class="note">※ ストリークは「外で活動した日数」に付き、途切れても没収しません（健全設計）。</p>
        ${missionSettingMarkup(ctx)}
        <h3 class="log-title">きろく</h3>
        <ul class="log">${logHtml}</ul>
        <button class="settings-launch settings-launch--parent" data-settings type="button">⚙ せってい</button>
        <button class="ghost" data-reset>デモ用: きろくをリセット</button>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("SELECT");
    root.querySelector("[data-settings]").onclick = () => ctx.go("SETTINGS", { from: "PARENT" });
    root.querySelector("[data-reset]").onclick = () => { ctx.session.reset(); ctx.go("PARENT"); };

    // きょうのミッションの設定。切り替えは画面遷移せずその場で反映する。
    const missionCard = root.querySelector(".mission-setting");
    const missionToggle = root.querySelector("[data-mission-toggle]");
    const missionSelect = root.querySelector("[data-mission-book]");
    missionToggle.onclick = () => {
      const enabled = !ctx.session.getDailyMission().enabled;
      ctx.session.setDailyMission({ enabled });
      missionToggle.classList.toggle("is-on", enabled);
      missionToggle.setAttribute("aria-checked", String(enabled));
      missionToggle.textContent = enabled ? "オン" : "オフ";
      missionCard.classList.toggle("is-off", !enabled);
      missionSelect.disabled = !enabled;
      ctx.notify?.(enabled ? "きょうのミッションを オンにしました" : "きょうのミッションを オフにしました");
    };
    missionSelect.onchange = (event) => {
      const bookId = event.target.value || null;
      ctx.session.setDailyMission({ bookId });
      const title = bookId ? ctx.repo.book(bookId)?.title : null;
      ctx.notify?.(title ? `ミッションを『${title}』にしました` : "ミッションを「どのえほんでもOK」にしました");
    };
  },
};
