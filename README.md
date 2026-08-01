# えほえほ（プロトタイプ）

geiotで提案するアプリケーションのプロトタイプ制作。
前回 Flutter で作った絵本アプリを **HTML / CSS / JS + JSON + Python** に置き換えた web 版。
Flutter版のコアループ（モード選択 → 絵本選択 → 物語 → ミッション → 撮影 → 達成演出 → 絵本日記 → ギャラリー）をそのまま再現している。

三層分離は前回と同じ：**コンテンツ**（JSON+アセット）／**ロジック**／**プレゼンテーション**。

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

写真撮影はファイル入力（`<input capture>`）で端末のカメラを開くので、**http のままでも動く**（`getUserMedia` と違い HTTPS 不要）。

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
| Work Styles データの更新 | `tools/build_work_styles.py` → `content/work-styles.json` | Python / JSON |
| 職業名の日本語表示名更新 | `tools/translate_work_style_titles.py` → `content/work-style-titles-ja.json` | Python / JSON |
| サーバー起動 | `serve.py` | Python |

`js/ContentRepository.js` / `js/Session.js` はロジック層。基本さわらなくていい。

---

## 画面（Flutter版の再現）

`MODE`（こども/おうちのひと選択）→ `PIN`（おうちのひとゲート, プロト用 **0000**）→ `PARENT`（レポートのモック）
`HOME`（えほん/おもいで）→ `SELECT`（絵本選択）→ `STORY`（物語）→ `MISSION`（撮る/できた）→ `PREVIEW`（これにする/もう一回）→ `ACHIEVE`（達成演出・シール）→ `COMPLETE` → `DIARY`（絵本日記）→ `GALLERY`（思い出）

- ミッション達成は **写真撮影** が基本。カメラを使わないときは「できた！」でタップ達成（フォールバック）。
- ストリークは「外で活動した日数」に付き、途切れても没収しない（健全設計）。
- ミッションには `developmentDomains`（発達領域タグ）を持たせてある（Stage 3 分析の布石）。

### Work Styles 参考演算

`Work Styles.xlsx` は O*NET の職業 Work Styles 参照データ。起動時に読み込む
`content/work-styles.json` は、次のコマンドで Excel から再生成できる。

```bash
python3 tools/build_work_styles.py
```

職業名は `content/work-style-titles-ja.json` の日本語表示名を優先し、元の英語名も
小さく併記する。職業リストが変わった場合は、必要に応じて次を実行する。

```bash
python3 tools/translate_work_style_titles.py
```

親モードの分析画面では、絵本ミッションの `developmentDomains` を5つの活動軸へ
集計し、21個の Work Styles 軸との近さから参考候補を表示する。これは遊びや体験の
振り返り用のプロトタイプで、診断・評価・将来の職業適性判定ではない。

---
