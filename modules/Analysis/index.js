import { esc } from "../shared/utils.js";

export const AnalysisScreen = {
  render(ctx) {
    const s = ctx.session;
    const completedCount = s.memories.length;
    const missionCount = s.memories.reduce((sum, memory) => sum + (memory.entries?.length || 0), 0);
    const streak = s.activityDaysThisWeek();

    // 軸ごとに色を持たせる（デモ用の固定値）。時計回りに配置され、
    // conic-gradient の色停止位置ともここで揃えている。
    const axes5 = [
      { label: "戦術", value: 78, color: "#e5484d" },
      { label: "冒険", value: 64, color: "#ec4899" },
      { label: "職人", value: 82, color: "#f5b301" },
      { label: "芸術", value: 73, color: "#4caf50" },
      { label: "協調", value: 88, color: "#3b82f6" },
    ];

    const size = 300;
    const center = size / 2;
    const radius = 84;
    const maxValue = 100;

    const points = axes5.map((axis, index) => {
      const angle = (Math.PI * 2 * index) / axes5.length - Math.PI / 2;
      const distance = (axis.value / maxValue) * radius;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      return { ...axis, x, y, angle };
    });

    const polygonPoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // グラデーション塗りは conic-gradient で作った円を、五角形の形に clip-path で
    // 切り抜くことで表現する（各軸の色停止位置は points と同じ角度に揃えている）。
    const clipPercent = points.map((p) => `${((p.x / size) * 100).toFixed(1)}% ${((p.y / size) * 100).toFixed(1)}%`).join(", ");
    const gradientStops = points
      .map((p, i) => `${p.color} ${((i / axes5.length) * 100).toFixed(1)}%`)
      .concat([`${points[0].color} 100%`])
      .join(", ");

    // 目盛りの数字（1本の軸＝先頭の軸の上）に添える
    const ringSteps = [1, 2, 3, 4, 5];
    const ringLabels = ringSteps.map((step) => {
      const y = center - (radius * step) / ringSteps.length;
      return `<text x="${center + 4}" y="${y + 4}" class="analysis-ring-label">${step}</text>`;
    }).join("");

    const rings = [0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
      const r = radius * scale;
      return `<circle cx="${center}" cy="${center}" r="${r}" class="analysis-ring" />`;
    }).join("");

    const axesLines = points.map((p) => `
      <line x1="${center}" y1="${center}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="analysis-axis" />
    `).join("");

    const dotsMarkup = points.map((p) => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="${p.color}" class="analysis-point" />
    `).join("");

    const labelsMarkup = points.map((p) => {
      const lx = center + Math.cos(p.angle) * (radius + 30);
      const ly = center + Math.sin(p.angle) * (radius + 30);
      return `
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="analysis-label" style="fill:${p.color}">${esc(p.label)}</text>
        <text x="${lx.toFixed(1)}" y="${(ly + 15).toFixed(1)}" class="analysis-label-value">${p.value}</text>
      `;
    }).join("");

    // デモ用の特性まとめ（固定データ）。アイコンは絵文字ではなくCSS図形で表現する
    const traits = [
      { icon: "palette", label: "好きな色", value: "みずいろ・きいろ" },
      { icon: "smile", label: "性格", value: "こうきしんおうせいで、やさしい" },
      { icon: "star", label: "好きなこと", value: "どうぶつ・のりもの・おえかき" },
      { icon: "book", label: "習い事の提案", value: "図工教室・リトミック" },
    ];

    const traitIconMarkup = (icon) => {
      if (icon === "palette") {
        return `<span class="trait-icon trait-icon--palette" aria-hidden="true">
          <span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span>
        </span>`;
      }
      if (icon === "smile") {
        return `<span class="trait-icon trait-icon--smile" aria-hidden="true">
          <span class="eye e1"></span><span class="eye e2"></span><span class="mouth"></span>
        </span>`;
      }
      if (icon === "star") {
        return `<span class="trait-icon trait-icon--star" aria-hidden="true"></span>`;
      }
      if (icon === "book") {
        return `<span class="trait-icon trait-icon--book" aria-hidden="true">
          <span class="page"></span>
        </span>`;
      }
      return "";
    };

    const traitsMarkup = traits.map((t) => `
      <div class="trait-row">
        ${traitIconMarkup(t.icon)}
        <span class="trait-label">${esc(t.label)}</span>
        <span class="trait-value">${esc(t.value)}</span>
      </div>`).join("");

    return `
      <div class="screen parent">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="parent-title">お子さまの せいちょうメモ</h2>
        <p class="note">親モード向けに、今までの活動の様子を かんたんに まとめました。</p>
        <div class="stat-row">
          <div class="stat"><b>${completedCount}</b><span>できたえほん</span></div>
        </div>
        <div class="analysis-card">
          <h3 class="log-title">5つの ちから</h3>
          <div class="analysis-chart-wrap" style="width:${size}px;height:${size}px;">
            <div class="analysis-chart-glow" style="clip-path: polygon(${clipPercent}); background: conic-gradient(from 0deg, ${gradientStops});"></div>
            <svg viewBox="0 0 ${size} ${size}" class="analysis-chart" role="img" aria-label="子どもの特性分析">
              ${rings}
              ${axesLines}
              <polygon points="${polygonPoints}" class="analysis-polygon" />
              ${ringLabels}
              ${dotsMarkup}
              ${labelsMarkup}
              <circle cx="${center}" cy="${center}" r="3" class="analysis-center" />
            </svg>
          </div>
        </div>
        <div class="analysis-card">
          <h3 class="log-title">お子さまの とくちょう</h3>
          <div class="trait-list">${traitsMarkup}</div>
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