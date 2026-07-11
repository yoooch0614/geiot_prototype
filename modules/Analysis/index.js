import { esc } from "../shared/utils.js";

export const AnalysisScreen = {
  render(ctx) {
    const s = ctx.session;
    const completedCount = s.memories.length;
    const missionCount = s.memories.reduce((sum, memory) => sum + (memory.entries?.length || 0), 0);
    const streak = s.activityDaysThisWeek();

    const labels = ["戦術", "冒険", "職人", "芸術", "協調"];
    const values = [78, 64, 82, 73, 88];
    const size = 220;
    const center = size / 2;
    const radius = 80;

    const rings = [0.35, 0.65, 1].map((scale) => {
      const r = radius * scale;
      return `<circle cx="${center}" cy="${center}" r="${r}" class="analysis-ring" />`;
    }).join("");

    const points = values.map((value, index) => {
      const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
      const distance = (value / 100) * radius;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      return { x, y };
    });

    const polygonPoints = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

    const axes = points.map((point) => `
      <line x1="${center}" y1="${center}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" class="analysis-axis" />
    `).join("");

    const labelsMarkup = labels.map((label, index) => {
      const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
      const x = center + Math.cos(angle) * (radius + 18);
      const y = center + Math.sin(angle) * (radius + 18);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="analysis-label">${esc(label)}</text>`;
    }).join("");

    return `
      <div class="screen parent">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="parent-title">お子さまの せいちょうメモ</h2>
        <p class="note">親モード向けに、今までの活動の様子を かんたんに まとめました。</p>
        <div class="stat-row">
          <div class="stat"><b>${completedCount}</b><span>できたえほん</span></div>
        </div>
        <div class="analysis-card">
          <h3 class="log-title">今の ちょうし</h3>
          <svg viewBox="0 0 ${size} ${size}" class="analysis-chart" role="img" aria-label="子どもの特性分析">
            ${rings}
            ${axes}
            <polygon points="${polygonPoints}" class="analysis-polygon" />
            ${points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5" class="analysis-point" />`).join("")}
            ${labelsMarkup}
            <circle cx="${center}" cy="${center}" r="4" class="analysis-center" />
          </svg>
        </div>
        <div class="analysis-card">
          <h3 class="log-title">おすすめの つぎの一歩</h3>
          <p class="analysis-lead">${streak > 0 ? "毎日 ちょっとずつ えほんを よむと、もっと たのしく つづけられます" : "はじめての えほんでも、ゆっくり すすめると きっと つながります"}</p>
        </div>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("SELECT");
  },
};
