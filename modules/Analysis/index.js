import { esc } from "../shared/utils.js";
import { buildWorkStyleAnalysis } from "./workStyles.js";

const ANALYSIS_TRAITS = [
  { icon: "palette", label: "好きな色", value: "写真の色を記録すると反映" },
  { icon: "smile", label: "性格", value: "こうきしんおうせいで、やさしい" },
  { icon: "star", label: "好きなこと", value: "どうぶつ・のりもの・おえかき" },
  { icon: "book", label: "習い事の提案", value: "図工教室・リトミック" },
];

const COLOR_FAMILY_LABELS = {
  red: "あか系",
  orange: "オレンジ系",
  yellow: "きいろ系",
  green: "みどり系",
  cyan: "みずいろ系",
  blue: "あお系",
  purple: "むらさき系",
  pink: "ピンク系",
};

function colorSummary(evidence = {}) {
  return Object.entries(evidence.colorFamilies ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([family, count]) => `${COLOR_FAMILY_LABELS[family] || family}${count > 1 ? `×${count}` : ""}`)
    .join("・");
}

function analysisTraits(analysis) {
  const summary = colorSummary(analysis.evidence);
  return ANALYSIS_TRAITS.map((trait) => trait.icon === "palette"
    ? { ...trait, value: summary || trait.value }
    : trait);
}

function normalizeFilters(params = {}) {
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month : "";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.day ?? "") ? params.day : "";
  return { month, day };
}

function matchesDate(date, filters) {
  const value = String(date ?? "");
  if (filters.day) return value === filters.day;
  if (filters.month) return value.startsWith(`${filters.month}-`);
  return true;
}

function formatMonthValue(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "long",
  }).format(new Date(`${value}-01T00:00:00`));
}

function formatDayValue(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recordDates(session) {
  const dates = new Set([
    localDateKey(),
    ...(session.activityDays ?? []),
    ...(session.memoryLog ?? []).map((item) => item.date),
  ]);
  return [...dates]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
    .reverse();
}

function monthChoices(session, selected) {
  const months = new Set(recordDates(session).map((date) => date.slice(0, 7)));
  const now = new Date();
  for (let month = 1; month <= 12; month += 1) {
    months.add(`${now.getFullYear()}-${String(month).padStart(2, "0")}`);
  }
  if (selected) months.add(selected);
  return [...months].sort().reverse();
}

function optionMarkup(value, label, selected = false) {
  return `<option value="${esc(value)}"${selected ? " selected" : ""}>${esc(label)}</option>`;
}

function periodLabel(filters) {
  if (filters.day) return formatDayValue(filters.day);
  if (filters.month) return formatMonthValue(filters.month);
  return "すべての期間";
}

function reportStats(session, rawFilters = {}) {
  const filters = normalizeFilters(rawFilters);
  const allLog = (session.memoryLog ?? []).filter((item) => matchesDate(item.date, filters));
  const activityDays = [...(session.activityDays ?? [])]
    .filter((date) => matchesDate(date, filters));
  const log = (filters.month || filters.day ? allLog : allLog.slice(0, 12))
    .map((item) => ({
      date: item.date || "",
      bookTitle: item.bookTitle || "",
      count: Number(item.count) || 0,
    }));
  return {
    filters,
    periodLabel: periodLabel(filters),
    completedCount: allLog.length,
    missionCount: allLog
      .reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    activityDays: activityDays.length,
    week: activityDays.length,
    log,
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

function buildExportSvg(report, analysis) {
  const width = 1600;
  const padding = 80;
  const chartCard = { x: padding, y: 390, width: 720, height: 650 };
  const traitsCard = { x: 850, y: 390, width: 670, height: 650 };
  const historyRows = report.log.length ? report.log : [{ date: "", bookTitle: "まだ活動記録がありません", count: 0 }];
  const historyY = 1080;
  const historyHeight = 110 + historyRows.length * 58;
  const height = historyY + historyHeight + 100;
  const axes = analysis.axes;
  const traits = analysisTraits(analysis);
  const center = { x: 440, y: 710 };
  const radius = 190;
  const angles = axes.map((_, i) => (Math.PI * 2 * i) / axes.length - Math.PI / 2);
  const points = axes.map((axis, i) => ({
    ...axis,
    x: center.x + Math.cos(angles[i]) * radius * axis.value / 100,
    y: center.y + Math.sin(angles[i]) * radius * axis.value / 100,
  }));
  const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const rings = [0.2, 0.4, 0.6, 0.8, 1].map((scale) =>
    `<circle cx="${center.x}" cy="${center.y}" r="${(radius * scale).toFixed(1)}" class="export-ring" />`
  ).join("");
  const axisLines = axes.map((axis, i) => {
    const x = center.x + Math.cos(angles[i]) * radius;
    const y = center.y + Math.sin(angles[i]) * radius;
    return `<line x1="${center.x}" y1="${center.y}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="export-axis" />`;
  }).join("");
  const labels = axes.map((axis, i) => {
    const x = center.x + Math.cos(angles[i]) * (radius + 58);
    const y = center.y + Math.sin(angles[i]) * (radius + 58);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" class="export-axis-label" text-anchor="middle" fill="${axis.color}">${xmlEscape(axis.label)}</text>
      <text x="${x.toFixed(1)}" y="${(y + 24).toFixed(1)}" class="export-axis-value" text-anchor="middle">${axis.value}</text>`;
  }).join("");
  const traitRows = traits.map((trait, i) => {
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
      <text x="${padding}" y="132" class="subtitle">専門家に相談するときの共有用レポート　${xmlEscape(dateLabel)}　対象：${xmlEscape(report.periodLabel)}</text>
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
      <text x="${chartCard.x + 32}" y="440" class="card-title">HEXACO（${analysis.source === "activity" ? "活動から集計" : "デモ表示"}）</text>
      ${rings}${axisLines}<polygon points="${polygon}" class="export-polygon" />${labels}
      <circle cx="${center.x}" cy="${center.y}" r="5" fill="#6c7b70" />

      <rect x="${traitsCard.x}" y="${traitsCard.y}" width="${traitsCard.width}" height="${traitsCard.height}" rx="24" fill="#ffffff" />
      <text x="${traitsCard.x + 32}" y="440" class="card-title">お子さまの HEXACO メモ</text>
      ${traitRows}

      <rect x="${padding}" y="${historyY}" width="${width - padding * 2}" height="${historyHeight}" rx="24" fill="#ffffff" />
      <text x="${padding + 32}" y="${historyY + 58}" class="card-title">活動履歴（実際の記録）</text>
      ${historyMarkup}
      <text x="${padding}" y="${height - 42}" class="footnote">※ HEXACO と職業候補は遊びや体験を振り返るための参考表示です。診断・評価ではありません。</text>
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

function exportPng(report, analysis) {
  const svg = buildExportSvg(report, analysis);
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
  render(ctx, params = {}) {
    const s = ctx.session;
    const filters = normalizeFilters(params);
    const report = reportStats(s, filters);
    const analysis = buildWorkStyleAnalysis(s, ctx.repo, ctx.workStyles);
    const months = monthChoices(s, filters.month);
    const days = recordDates(s);
    const { completedCount, missionCount, week: streak } = report;

    // 軸ごとに色を持たせる。時計回りに配置され、conic-gradient の色停止位置ともここで揃えている。
    const axes = analysis.axes;

    const size = 300;
    const center = size / 2;
    const radius = 84;
    const maxValue = 100;

    const points = axes.map((axis, index) => {
      const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
      const distance = (axis.value / maxValue) * radius;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      return { ...axis, x, y, angle };
    });

    const polygonPoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // グラデーション塗りは conic-gradient で作った円を、軸の数に合わせた多角形に clip-path で
    // 切り抜くことで表現する（各軸の色停止位置は points と同じ角度に揃えている）。
    const clipPercent = points.map((p) => `${((p.x / size) * 100).toFixed(1)}% ${((p.y / size) * 100).toFixed(1)}%`).join(", ");
    const gradientStops = points
      .map((p, i) => `${p.color} ${((i / axes.length) * 100).toFixed(1)}%`)
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

    // 特性まとめのアイコンは絵文字ではなくCSS図形で表現する
    const traits = analysisTraits(analysis);

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

    const uploadedColorSummary = colorSummary(analysis.evidence);
    const workStyleSource = analysis.source === "activity"
      ? `えほんの達成記録${uploadedColorSummary ? `とアップロード写真の色（${uploadedColorSummary}）` : ""}から、今の活動傾向を集計しています。`
      : "活動記録がまだないため、デモ値で計算しています。写真をアップロードすると色も結果に反映されます。";
    const workStyleMatches = analysis.matches.length
      ? `<ol class="analysis-work-style-list">${analysis.matches.map((match) => `
          <li>
            <span class="analysis-work-style-rank">${match.score}%</span>
            <span class="analysis-work-style-copy"><b>${esc(match.titleJa)}</b><small>${match.titleJa !== match.title ? `${esc(match.title)} · ` : ""}O*NET ${esc(match.code)}</small></span>
          </li>`).join("")}</ol>`
      : `<p class="analysis-work-style-empty">参照データを読み込めないため、候補を表示できません。</p>`;

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
        <div class="analysis-card analysis-filter-card" aria-labelledby="analysis-filter-title">
          <div class="analysis-filter-heading">
            <div class="analysis-filter-heading-copy">
              <span class="analysis-filter-icon" aria-hidden="true"></span>
              <div>
                <p class="analysis-filter-kicker">きろくを えらぶ</p>
                <h3 id="analysis-filter-title" class="log-title">いつの記録を見る？</h3>
                <p class="analysis-filter-summary">${esc(report.periodLabel)}</p>
              </div>
            </div>
            <button type="button" class="analysis-filter-clear" data-analysis-clear>
              <span class="analysis-filter-clear-icon" aria-hidden="true">↺</span>
              <span>すべて</span>
            </button>
          </div>
          <div class="analysis-filter-controls">
            <!-- select はカード全体に透明で重ねる。文字の行だけだと当たり判定が
                 小さすぎて「押しても開かない」ため、カードのどこを押しても開くようにする。
                 いま選ばれている値は下の small に静的に表示する（選ぶと再描画される） -->
            <label class="analysis-filter-choice analysis-filter-choice--month${filters.month ? " is-active" : ""}">
              <span class="analysis-filter-choice-mark" aria-hidden="true">月</span>
              <span class="analysis-filter-choice-copy">
                <strong>月ごと</strong>
                <small>${esc(filters.month ? formatMonthValue(filters.month) : "すべての月")}</small>
              </span>
              <span class="analysis-filter-choice-arrow" aria-hidden="true">›</span>
              <select class="analysis-filter-select" data-analysis-month aria-label="月を選ぶ">
                ${optionMarkup("", "すべての月", !filters.month)}
                ${months.map((month) => optionMarkup(month, formatMonthValue(month), month === filters.month)).join("")}
              </select>
            </label>
            <label class="analysis-filter-choice analysis-filter-choice--day${filters.day ? " is-active" : ""}">
              <span class="analysis-filter-choice-mark" aria-hidden="true">日</span>
              <span class="analysis-filter-choice-copy">
                <strong>日にちごと</strong>
                <small>${esc(filters.day ? formatDayValue(filters.day) : "すべての日")}</small>
              </span>
              <span class="analysis-filter-choice-arrow" aria-hidden="true">›</span>
              <select class="analysis-filter-select" data-analysis-day aria-label="日にちを選ぶ">
                ${optionMarkup("", "すべての日", !filters.day)}
                ${days.map((day) => optionMarkup(day, formatDayValue(day), day === filters.day)).join("")}
              </select>
            </label>
          </div>
          <p class="analysis-filter-help">月または日にちを選ぶと、数字と活動履歴がその期間に切り替わります。</p>
        </div>
        <div class="stat-row">
          <div class="stat"><b>${completedCount}</b><span>できたえほん</span></div>
          <div class="stat"><b>${missionCount}</b><span>できたミッション</span></div>
          <div class="stat"><b>${report.activityDays}</b><span>活動した日</span></div>
        </div>
        <div class="analysis-card analysis-chart-card">
            <h3 class="log-title">HEXACO（ヘキサコ・6因子）</h3>
          <div class="analysis-chart-wrap" style="width:${size}px;height:${size}px;">
            <div class="analysis-chart-glow" style="clip-path: polygon(${clipPercent}); background: conic-gradient(from 0deg, ${gradientStops});"></div>
            <svg viewBox="0 0 ${size} ${size}" class="analysis-chart" role="img" aria-label="子どもの HEXACO 6因子参考プロフィール">
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
        <div class="analysis-card analysis-work-style-card">
          <h3 class="log-title">HEXACO と職業の つながり</h3>
          <p class="analysis-work-style-source">${esc(workStyleSource)}</p>
          ${workStyleMatches}
          <p class="analysis-work-style-note">※ 将来の職業診断ではなく、遊びや体験と仕事の スタイルのつながりを見る参考表示です。</p>
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
        <p class="analysis-disclaimer">※ HEXACO と職業候補はプロトタイプの参考表示です。診断・評価ではありません。</p>
      </div>`;
  },
  mount(ctx, params = {}, root) {
    root.querySelector("[data-back]").onclick = () => ctx.go("SELECT");
    const report = reportStats(ctx.session, params);
    const analysis = buildWorkStyleAnalysis(ctx.session, ctx.repo, ctx.workStyles);
    root.querySelector("[data-export-png]").onclick = () => exportPng(report, analysis);
    root.querySelector("[data-export-pdf]").onclick = () => {
      const cleanup = () => document.body.classList.remove("is-printing-analysis");
      document.body.classList.add("is-printing-analysis");
      window.addEventListener("afterprint", cleanup, { once: true });
      window.print();
      window.setTimeout(cleanup, 3000);
    };

    const monthInput = root.querySelector("[data-analysis-month]");
    const dayInput = root.querySelector("[data-analysis-day]");
    monthInput.onchange = () => {
      ctx.go("ANALYSIS", { month: monthInput.value, day: "" });
    };
    dayInput.onchange = () => {
      ctx.go("ANALYSIS", { month: "", day: dayInput.value });
    };
    root.querySelector("[data-analysis-clear]").onclick = () => ctx.go("ANALYSIS");
  },
};
