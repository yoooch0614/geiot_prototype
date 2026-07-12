import { esc } from "../shared/utils.js";

const ANALYSIS_AXES = [
  { label: "戦術", value: 78, color: "#e5484d" },
  { label: "冒険", value: 64, color: "#ec4899" },
  { label: "職人", value: 82, color: "#f5b301" },
  { label: "芸術", value: 73, color: "#4caf50" },
  { label: "協調", value: 88, color: "#3b82f6" },
];

const ANALYSIS_TRAITS = [
  { icon: "palette", label: "好きな色", value: "みずいろ・きいろ" },
  { icon: "smile", label: "性格", value: "こうきしんおうせいで、やさしい" },
  { icon: "star", label: "好きなこと", value: "どうぶつ・のりもの・おえかき" },
  { icon: "book", label: "習い事の提案", value: "図工教室・リトミック" },
];

function reportStats(session) {
  return {
    completedCount: session.memories.length,
    missionCount: (session.memoryLog ?? [])
      .reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    activityDays: session.activityDayCount(),
    week: session.activityDaysThisWeek(),
    log: (session.memoryLog ?? []).slice(0, 12).map((item) => ({
      date: item.date || "",
      bookTitle: item.bookTitle || "",
      count: Number(item.count) || 0,
    })),
  };
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value, maxChars) {
  const chars = [...String(value ?? "")];
  const lines = [];
  for (let i = 0; i < chars.length; i += maxChars) lines.push(chars.slice(i, i + maxChars).join(""));
  return lines.length ? lines : [""];
}

function svgLines(value, x, y, maxChars, lineHeight, className, anchor = "start") {
  return wrapText(value, maxChars)
    .map((line, i) => `<text x="${x}" y="${y + i * lineHeight}" class="${className}" text-anchor="${anchor}">${xmlEscape(line)}</text>`)
    .join("");
}

function buildExportSvg(report) {
  const width = 1600;
  const padding = 80;
  const chartCard = { x: padding, y: 390, width: 720, height: 650 };
  const traitsCard = { x: 850, y: 390, width: 670, height: 650 };
  const historyRows = report.log.length ? report.log : [{ date: "", bookTitle: "まだ活動記録がありません", count: 0 }];
  const historyY = 1080;
  const historyHeight = 110 + historyRows.length * 58;
  const height = historyY + historyHeight + 100;
  const center = { x: 440, y: 710 };
  const radius = 190;
  const angles = ANALYSIS_AXES.map((_, i) => (Math.PI * 2 * i) / ANALYSIS_AXES.length - Math.PI / 2);
  const points = ANALYSIS_AXES.map((axis, i) => ({
    ...axis,
    x: center.x + Math.cos(angles[i]) * radius * axis.value / 100,
    y: center.y + Math.sin(angles[i]) * radius * axis.value / 100,
  }));
  const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const rings = [0.2, 0.4, 0.6, 0.8, 1].map((scale) =>
    `<circle cx="${center.x}" cy="${center.y}" r="${(radius * scale).toFixed(1)}" class="export-ring" />`
  ).join("");
  const axes = ANALYSIS_AXES.map((axis, i) => {
    const x = center.x + Math.cos(angles[i]) * radius;
    const y = center.y + Math.sin(angles[i]) * radius;
    return `<line x1="${center.x}" y1="${center.y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="export-axis" />`;
  }).join("");
  const labels = ANALYSIS_AXES.map((axis, i) => {
    const x = center.x + Math.cos(angles[i]) * (radius + 58);
    const y = center.y + Math.sin(angles[i]) * (radius + 58);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="export-axis-label" text-anchor="middle" fill="${axis.color}">${xmlEscape(axis.label)}</text>
      <text x="${x.toFixed(1)}" y="${(y + 24).toFixed(1)}" class="export-axis-value" text-anchor="middle">${axis.value}</text>`;
  }).join("");
  const traitRows = ANALYSIS_TRAITS.map((trait, i) => {
    const y = 520 + i * 112;
    return `<rect x="900" y="${y - 38}" width="570" height="88" rx="18" class="export-row" />
      ${svgLines(trait.label, 930, y, 14, 24, "export-trait-label")}
      ${svgLines(trait.value, 930, y + 30, 28, 24, "export-trait-value")}`;
  }).join("");
  const historyMarkup = historyRows.map((item, i) => {
    const y = historyY + 105 + i * 58;
    return `<line x1="${padding + 30}" y1="${y + 20}" x2="${width - padding - 30}" y2="${y + 20}" class="export-divider" />
      <text x="${padding + 35}" y="${y}" class="export-history-date">${xmlEscape(item.date)}</text>
      ${svgLines(item.bookTitle, padding + 210, y, 38, 24, "export-history-book")}
      <text x="${width - padding - 35}" y="${y}" class="export-history-count" text-anchor="end">${item.count ? `${item.count}こ たっせい` : ""}</text>`;
  }).join("");
  const dateLabel = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date());

  return {
    width,
    height,
    markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <style>
        text { font-family: Arial, "Hiragino Maru Gothic ProN", sans-serif; }
        .title { font-size: 48px; font-weight: 900; fill: #3a4a3f; }
        .subtitle { font-size: 22px; fill: #6c7b70; }
        .card-title { font-size: 25px; font-weight: 900; fill: #3a4a3f; }
        .stat-value { font-size: 52px; font-weight: 900; fill: #6bbf59; }
        .stat-label { font-size: 19px; font-weight: 700; fill: #6c7b70; }
        .export-ring { fill: none; stroke: #cbd8ce; stroke-width: 2; }
        .export-axis { stroke: #d6e0d7; stroke-width: 2; }
        .export-polygon { fill: #78d39b55; stroke: #4f9a45; stroke-width: 4; stroke-linejoin: round; }
        .export-axis-label { font-size: 22px; font-weight: 900; }
        .export-axis-value { font-size: 18px; fill: #6c7b70; }
        .export-trait-label { font-size: 20px; font-weight: 900; fill: #3a4a3f; }
        .export-trait-value { font-size: 19px; fill: #5d6c63; }
        .export-row { fill: #f5f8f2; }
        .export-history-date { font-size: 18px; fill: #8a958d; }
        .export-history-book { font-size: 20px; font-weight: 700; fill: #3a4a3f; }
        .export-history-count { font-size: 18px; font-weight: 700; fill: #6bbf59; }
        .export-divider { stroke: #e1e9e1; stroke-width: 2; }
        .footnote { font-size: 17px; fill: #7a877e; }
      </style>
      <rect width="${width}" height="${height}" fill="#f3f7ee" />
      <text x="${padding}" y="90" class="title">お子さまの せいちょうメモ</text>
      <text x="${padding}" y="132" class="subtitle">専門家に相談するときの共有用レポート　${xmlEscape(dateLabel)}</text>
      <rect x="${padding}" y="168" width="${width - padding * 2}" height="64" rx="18" fill="#e8f3e1" />
      <text x="${padding + 28}" y="208" class="subtitle">活動の記録と現在のメモを、相談時に見せやすい形にまとめています。</text>

      <rect x="${padding}" y="260" width="460" height="100" rx="20" fill="#ffffff" />
      <rect x="570" y="260" width="460" height="100" rx="20" fill="#ffffff" />
      <rect x="1060" y="260" width="460" height="100" rx="20" fill="#ffffff" />
      <text x="${padding + 230}" y="315" class="stat-value" text-anchor="middle">${report.completedCount}</text>
      <text x="${padding + 230}" y="343" class="stat-label" text-anchor="middle">完成したえほん</text>
      <text x="800" y="315" class="stat-value" text-anchor="middle">${report.missionCount}</text>
      <text x="800" y="343" class="stat-label" text-anchor="middle">できたミッション</text>
      <text x="1290" y="315" class="stat-value" text-anchor="middle">${report.activityDays}</text>
      <text x="1290" y="343" class="stat-label" text-anchor="middle">活動した日</text>

      <rect x="${chartCard.x}" y="${chartCard.y}" width="${chartCard.width}" height="${chartCard.height}" rx="24" fill="#ffffff" />
      <text x="${chartCard.x + 32}" y="440" class="card-title">5つの ちから（デモ表示）</text>
      ${rings}${axes}<polygon points="${polygon}" class="export-polygon" />${labels}
      <circle cx="${center.x}" cy="${center.y}" r="5" fill="#6c7b70" />

      <rect x="${traitsCard.x}" y="${traitsCard.y}" width="${traitsCard.width}" height="${traitsCard.height}" rx="24" fill="#ffffff" />
      <text x="${traitsCard.x + 32}" y="440" class="card-title">お子さまの とくちょう（デモ表示）</text>
      ${traitRows}

      <rect x="${padding}" y="${historyY}" width="${width - padding * 2}" height="${historyHeight}" rx="24" fill="#ffffff" />
      <text x="${padding + 32}" y="${historyY + 58}" class="card-title">活動履歴（実際の記録）</text>
      ${historyMarkup}
      <text x="${padding}" y="${height - 42}" class="footnote">※ 特性分析と特性メモは現在プロトタイプのデモ値です。診断・評価ではありません。</text>
    </svg>`,
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPng(report) {
  const svg = buildExportSvg(report);
  const svgUrl = URL.createObjectURL(new Blob([svg.markup], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svg.width;
    canvas.height = svg.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `seicho-memo-${new Date().toISOString().slice(0, 10)}.png`);
    }, "image/png");
  };
  image.src = svgUrl;
}

export const AnalysisScreen = {
  render(ctx) {
    const s = ctx.session;
    const report = reportStats(s);
    const { completedCount, missionCount, week: streak } = report;

    // 軸ごとに色を持たせる（デモ用の固定値）。時計回りに配置され、
    // conic-gradient の色停止位置ともここで揃えている。
    const axes5 = ANALYSIS_AXES;

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
    const traits = ANALYSIS_TRAITS;

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
      <div class="screen parent analysis-screen">
        <button class="back" data-back>‹ もどる</button>
        <h2 class="parent-title">お子さまの せいちょうメモ</h2>
        <p class="note">親モード向けに、今までの活動の様子を かんたんに まとめました。</p>
        <div class="analysis-export-actions" aria-label="レポートを書き出す">
          <button type="button" class="analysis-export-button" data-export-png>PNGで保存</button>
          <button type="button" class="analysis-export-button" data-export-pdf>PDFで保存</button>
        </div>
        <p class="analysis-export-note">専門家にわたすときは、PNGまたはPDFを保存してお使いください。</p>
        <div class="stat-row">
          <div class="stat"><b>${completedCount}</b><span>できたえほん</span></div>
          <div class="stat"><b>${missionCount}</b><span>できたミッション</span></div>
          <div class="stat"><b>${report.activityDays}</b><span>活動した日</span></div>
        </div>
        <div class="analysis-card analysis-chart-card">
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
        <div class="analysis-card analysis-traits-card">
          <h3 class="log-title">お子さまの とくちょう</h3>
          <div class="trait-list">${traitsMarkup}</div>
        </div>
        <div class="analysis-card analysis-next-card">
          <h3 class="log-title">おすすめの つぎの一歩</h3>
          <p class="analysis-lead">${streak > 0 ? "毎日 ちょっとずつ えほんを よむと、もっと たのしく つづけられます" : "はじめての えほんでも、ゆっくり すすめると きっと つながります"}</p>
        </div>
        <div class="analysis-card analysis-history">
          <h3 class="log-title">活動履歴（実際の記録）</h3>
          <ul class="analysis-history-list">${report.log.length
            ? report.log.map((item) => `<li><span>${esc(item.date)}</span><b>${esc(item.bookTitle)}</b><em>${item.count}こ たっせい</em></li>`).join("")
            : "<li class=\"analysis-history-empty\">まだ活動記録がありません。</li>"}</ul>
        </div>
        <p class="analysis-disclaimer">※ 5つの ちからと特性メモは現在プロトタイプのデモ表示です。診断・評価ではありません。</p>
      </div>`;
  },
  mount(ctx, _p, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("SELECT");
    const report = reportStats(ctx.session);
    root.querySelector("[data-export-png]").onclick = () => exportPng(report);
    root.querySelector("[data-export-pdf]").onclick = () => {
      const cleanup = () => document.body.classList.remove("is-printing-analysis");
      document.body.classList.add("is-printing-analysis");
      window.addEventListener("afterprint", cleanup, { once: true });
      window.print();
      window.setTimeout(cleanup, 3000);
    };
  },
};
