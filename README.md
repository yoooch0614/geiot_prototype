# えほえほ（プロトタイプ）

geiotで提案するアプリケーションのプロトタイプ制作。
前回 Flutter で作った絵本アプリを **HTML / CSS / JS + JSON + Python** に置き換えた web 版。
Flutter版のコアループ（モード選択 → 絵本選択 → 物語 → ミッション → 撮影 → 達成演出 → 絵本日記 → ギャラリー）をそのまま再現している。

三層分離は前回と同じ：**コンテンツ**（JSON+アセット）／**ロジック**／**プレゼンテーション**。

## Android APK を作る（中文）

这个项目已经加入 Capacitor Android 封装配置。整个网页应用和 `content/` 资源会一起打包进 APK，运行时不需要启动 `serve.py`。

需要先安装 Node.js 22+ 和 Android Studio（包含 Android SDK），然后在项目根目录执行：

```bash
npm install
npm run android:apk
```

第一次运行会自动创建 Android 工程、同步网页资源并生成可安装的 debug APK：

```text
android/ehoeho-debug.apk
```

以后修改网页或内容后，重新执行 `npm run android:apk` 即可。要在 Android Studio 中打开原生工程，可以执行：

```bash
npm run android:init
npm run android:open
```

默认 Android 包名是 `com.geiot.ehoeho`，可在首次生成 Android 工程前修改 `capacitor.config.json`。`android/` 是原生工程；`www/` 只是同步时的临时目录，不需要手动编辑。

---

## うごかす（PCで見る）

このフォルダで:

```bash
python3 serve.py
```

表示された `http://localhost:8000` をブラウザで開く。

> ダブルクリックで index.html を直接開くと、ブラウザの制約で JSON を読めない。
> かならず上のサーバー経由で開くこと（Python標準機能だけでOK）。

## 同じ Wi-Fi の iPad / iPhone で見る

1. PC と iPad を **同じ Wi-Fi** につなぐ
2. PCで `python3 serve.py` を実行
3. 表示される `http://<PCのIP>:8000` を **iPad の Safari** で開く
4. Safariの共有 →「ホーム画面に追加」でアプリっぽく使える（PWA）

写真撮影はまずアプリ内カメラ（絵本の型付き取景）を試し、権限・HTTPS・端末の都合で使えない場合はファイル入力（`<input capture>`）へフォールバックする。後者は **http のままでも動く**（`getUserMedia` と違い HTTPS 不要）。

---

## いじる場所（＝馴染みの言語だけ）

| やりたいこと | 触るファイル | 言語 |
|---|---|---|
| 絵本・ミッションの中身 | `content/books/<絵本>.json`（1冊1ファイル） | JSON |
| 絵本の並び順・追加 | `content/library.json`（索引） | JSON |
| イラスト・音声の差し替え | `content/assets/` | 画像/音声 |
| 各画面の見た目・構成 | `js/screens.js` / `css/style.css` | JS / CSS |
| 画面のつなぎ（ルーター） | `js/app.js` | JS |
| コンテンツ検証 | `tools/validate_content.py` | Python |
| Big Five 5因子職業データの更新 | `tools/build_big5_scores.py` → `content/occupation-big5.json` | Python / JSON |
| 職業名の日本語表示名更新 | `tools/translate_work_style_titles.py` → `content/work-style-titles-ja.json` | Python / JSON |
| サーバー起動 | `serve.py` | Python |
| チーム・プロダクト紹介サイト | `website_company/index.html` | HTML / CSS / JS |

`js/ContentRepository.js` / `js/Session.js` はロジック層。基本さわらなくていい。

---

## 画面（Flutter版の再現）

`MODE`（こども/おうちのひと選択）→ `PIN`（おうちのひとゲート, プロト用 **0000**）→ `PARENT`（レポートのモック）
`HOME`（えほん/おもいで）→ `SELECT`（絵本選択）→ `STORY`（物語）→ `MISSION`（撮る/できた）→ `PREVIEW`（これにする/もう一回）→ `ACHIEVE`（達成演出・シール）→ `COMPLETE` → `DIARY`（絵本日記）→ `GALLERY`（思い出）

- ミッション達成は **写真撮影** が基本。カメラを使わないときは「できた！」でタップ達成（フォールバック）。
- ストリークは「外で活動した日数」に付き、途切れても没収しない（健全設計）。
- ミッションには `developmentDomains`（発達領域タグ）を持たせてある（Stage 3 分析の布石）。

### Big Five（ビッグファイブ・5因子）参考演算

`occupation_big5_scores.xlsx` は全891職業の O/C/Ex/A/ES 参照データ。起動時にはブラウザ用に
変換した `content/occupation-big5.json` を読み込む。Excel から再生成するには次を実行する。

```bash
python3 tools/build_big5_scores.py
```

表示軸は `O 開放性`、`C 誠実性`、`Ex 外向性`、`A 協調性`、`ES 情緒安定性` の5つ。
ES は Big Five の Neuroticism（神経症傾向）を反対方向から示す軸として扱っている。
厳密な心理検査ではなく、
遊びや体験を振り返るためのプロトタイプ参考表示。
職業名は `content/work-style-titles-ja.json` の日本語表示名を優先し、元の英語名も小さく併記する。
職業リストが変わった場合は、必要に応じて次を実行する。

```bash
python3 tools/translate_work_style_titles.py
```

親モードの分析画面では、絵本ミッションの `developmentDomains` と、アップロード写真から
抽出した `vehicleColor` を5軸へ集計し、全職業の5因子参照値との近さから参考候補を
表示する。写真の色は色相ごとの参考重みで加算するが、ミッションタグより弱くしている。これは
遊びや体験の振り返り用のプロトタイプで、診断・評価・将来の職業適性判定ではない。

---
