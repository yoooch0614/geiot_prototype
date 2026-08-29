import { esc } from "../shared/utils.js";

// 今日のミッションの設定カード。保護者が「1日1冊読む」の対象を選べる。
// 「すべての絵本」か、特定の1冊を指定するか。オフにすれば子ども画面から消える。
function missionSettingMarkup(ctx) {
  const s = ctx.session;
  const mission = s.getDailyMission();
  const doneToday = s.isDailyMissionDoneToday();
  const doneCount = s.dailyMissionDoneCount();
  const options = [
    { value: "", label: "すべての絵本" },
    ...ctx.repo.books.map((b) => ({
      value: b.id,
      label: ctx.repo.book(b.id)?.title ?? b.title ?? b.id,
    })),
  ];
  return `
    <section class="mission-setting${mission.enabled ? "" : " is-off"}">
      <div class="mission-setting-head">
        <h3>今日のミッション</h3>
        <button type="button" class="settings-switch${mission.enabled ? " is-on" : ""}"
          data-mission-toggle role="switch" aria-checked="${mission.enabled}">
          ${mission.enabled ? "オン" : "オフ"}
        </button>
      </div>
      <p class="mission-setting-desc">お子さまのホーム画面に「1日1冊読む」という目標を表示します。対象の絵本はここで変更できます。</p>
      <label class="mission-setting-row">
        <span>読む絵本</span>
        <select class="settings-select" data-mission-book aria-label="ミッションで読む絵本"
          ${mission.enabled ? "" : "disabled"}>
          ${options.map((o) => `
            <option value="${esc(o.value)}"${o.value === (mission.bookId ?? "") ? " selected" : ""}>${esc(o.label)}</option>`).join("")}
        </select>
      </label>
      <p class="mission-setting-status" data-mission-status>
        今日：${doneToday ? "達成済み 🎉" : "未達成"} ／ 累計 ${doneCount}日達成
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
            <span class="log-count">${m.count}件達成</span>
          </li>`).join("")
      : `<li class="empty">活動記録はまだありません。お子さまモードで活動すると、ここに表示されます。</li>`;
    return `
      <div class="screen parent">
        <button class="back" data-back>‹ 戻る</button>
        <h2 class="parent-title">活動レポート</h2>
        <div class="stat-row">
          <div class="stat"><b>${week}</b><span>今週の活動日数</span></div>
          <div class="stat"><b>${total}</b><span>累計活動日数</span></div>
        </div>
        <p class="note">※ ストリークはアプリ外で活動した日数を数えます。中断しても記録は失われません。</p>
        ${missionSettingMarkup(ctx)}
        <h3 class="log-title">活動履歴</h3>
        <ul class="log">${logHtml}</ul>
        <button class="settings-launch settings-launch--parent" data-settings type="button">⚙ 設定</button>
        <button class="ghost" data-reset>デモ用：記録をリセット</button>
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
      missionToggle.textContent = enabled ? ctx.t("common.on") : ctx.t("common.off");
      missionCard.classList.toggle("is-off", !enabled);
      missionSelect.disabled = !enabled;
      ctx.notify?.(enabled ? "今日のミッションを有効にしました" : "今日のミッションを無効にしました");
    };
    missionSelect.onchange = (event) => {
      const bookId = event.target.value || null;
      ctx.session.setDailyMission({ bookId });
      const title = bookId ? ctx.repo.book(bookId)?.title : null;
      ctx.notify?.(title ? `ミッションを『${title}』に変更しました` : "ミッションを「すべての絵本」に変更しました");
    };
  },
};
