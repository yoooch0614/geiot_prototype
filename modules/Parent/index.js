import { esc } from "../shared/utils.js";

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
          <div class="stat"><b>${week}</b><span>今週 そとで あそんだ日</span></div>
          <div class="stat"><b>${total}</b><span>これまで あそんだ日</span></div>
        </div>
        <p class="note">※ ストリークは「外で活動した日数」に付き、途切れても没収しません（健全設計）。</p>
        <h3 class="log-title">きろく</h3>
        <ul class="log">${logHtml}</ul>
        <button class="ghost" data-reset>デモ用: きろくをリセット</button>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("MODE");
    root.querySelector("[data-reset]").onclick = () => { ctx.session.reset(); ctx.go("PARENT"); };
  },
};
