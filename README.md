# すきのたね / Ehoeho

絵本で遊びながら、子どもの「好き」を見つけるアプリのプロトタイプです。
HTML / CSS / JavaScript + JSON + Python で作られており、絵本・ミッション・撮影・達成演出・絵本日記・ギャラリーまでの体験を再現しています。

## Website

- [Web App オンライン体験](https://yoooch0614.github.io/geiot_prototype/)
- [製品紹介サイト](https://yoooch0614.github.io/geiot_prototype/website_company/)

## 日本語

### ローカルで動かす

プロジェクトのルートで実行します。

```bash
python3 serve.py
```

ブラウザで <http://localhost:8000> を開いてください。
JSONを読み込むため、`index.html` を直接ダブルクリックせず、必ずサーバー経由で開きます。

同じ Wi-Fi の iPad / iPhone で見る場合は、PCで表示された `http://<PCのIP>:8000` を Safari で開きます。

### Android APK を作る

Node.js 22 以上と、Android SDK を含む Android Studio が必要です。

```bash
npm install
npm run android:apk
```

生成された debug APK は次の場所に保存されます。

```text
android/ehoeho-debug.apk
```

APKにはウェブアプリと `content/` のリソースが含まれるため、実行時に `serve.py` は不要です。
ウェブやコンテンツを変更した後は、もう一度 `npm run android:apk` を実行します。

Android Studioでネイティブプロジェクトを開く場合：

```bash
npm run android:init
npm run android:open
```

デフォルトの Android パッケージ名は `com.geiot.ehoeho` です。初回の Android プロジェクト作成前に `capacitor.config.json` で変更できます。
`android/` はネイティブプロジェクト、`www/` は同期時に作られる一時フォルダーです。`www/` は直接編集しません。

### 主な編集場所

| やりたいこと | ファイル | 形式 |
|---|---|---|
| 絵本・ミッションの内容 | `content/books/<book>.json` | JSON |
| 絵本の一覧 | `content/library.json` | JSON |
| 画像・音声の差し替え | `content/assets/` | 画像 / 音声 |
| 画面の構成 | `js/screens.js` / `css/style.css` | JavaScript / CSS |
| 画面のつなぎ | `js/app.js` | JavaScript |
| 設定と保存ロジック | `js/Settings.js` / `js/Session.js` | JavaScript |
| コンテンツ検証 | `tools/validate_content.py` | Python |
| 製品紹介サイト | `website_company/` | HTML / CSS / JavaScript |
| 設計記録（ADR） | `adr/` | Markdown |

### 画面の流れ

`MODE`（こども / おうちのひと） → `PIN` → `PARENT` → `HOME` → `SELECT` → `STORY` → `MISSION` → `PREVIEW` → `ACHIEVE` → `COMPLETE` → `DIARY` / `GALLERY`

ミッションは写真撮影が基本です。カメラが使えない場合は、ファイル入力または「できた！」ボタンにフォールバックします。

### Big Five について

親モードでは、ミッションの発達領域と写真の色を使って、Big Five 5因子の参考表示を行います。
これは診断や職業適性判定ではなく、遊びや体験を振り返るためのプロトタイプ機能です。

### 設計記録

- [ADR-001: アプリ設定・保護・フィードバック](adr/ADR-001-app-completion.md)
- [ADR-002: ミッション達成数に応じたアバター解放](adr/ADR-002-avatar-mission-unlocks.md)

## English

### Overview

Ehoeho (`すきのたね`) is a prototype app that helps children discover what they like through interactive picture books.
It is built with HTML, CSS, JavaScript, JSON, and Python, and reproduces the flow from book selection and missions to photo capture, achievement feedback, diary, and gallery.

### Run locally

From the project root, run:

```bash
python3 serve.py
```

Open <http://localhost:8000> in a browser.
The app should be opened through the local server because it loads JSON files and ES modules.

To use it on an iPad or iPhone on the same Wi-Fi network, open the `http://<PC-IP>:8000` address shown by the server in Safari.

### Build the Android APK

Install Node.js 22 or newer and Android Studio with the Android SDK.

```bash
npm install
npm run android:apk
```

The debug APK is generated at:

```text
android/ehoeho-debug.apk
```

The APK contains the web app and the `content/` resources, so `serve.py` is not needed at runtime.
Run `npm run android:apk` again after changing the web app or content.

To open the native project in Android Studio:

```bash
npm run android:init
npm run android:open
```

The default Android application ID is `com.geiot.ehoeho`. Change it in `capacitor.config.json` before creating the Android project for the first time.
`android/` is the native project. `www/` is a temporary synchronization directory and should not be edited directly.

### Main project areas

| Task | Location | Format |
|---|---|---|
| Edit books and missions | `content/books/<book>.json` | JSON |
| Change book order | `content/library.json` | JSON |
| Replace images or audio | `content/assets/` | Images / audio |
| Change screen structure | `js/screens.js` / `css/style.css` | JavaScript / CSS |
| Change routing | `js/app.js` | JavaScript |
| Change settings and session logic | `js/Settings.js` / `js/Session.js` | JavaScript |
| Validate content | `tools/validate_content.py` | Python |
| Edit the product website | `website_company/` | HTML / CSS / JavaScript |
| Read architecture decisions | `adr/` | Markdown |

### Screen flow

`MODE` (child / parent) → `PIN` → `PARENT` → `HOME` → `SELECT` → `STORY` → `MISSION` → `PREVIEW` → `ACHIEVE` → `COMPLETE` → `DIARY` / `GALLERY`

Photo capture is the normal mission flow. If the camera is unavailable, the app falls back to file input or the “Done!” button.

### Big Five note

Parent mode shows an exploratory Big Five profile based on mission development domains and colors extracted from uploaded photos.
It is a prototype for reflecting on play and experiences, not a psychological diagnosis or a career aptitude assessment.

### Architecture Decision Records

- [ADR-001: App settings, protection, and feedback](adr/ADR-001-app-completion.md)
- [ADR-002: Avatar unlocks based on completed missions](adr/ADR-002-avatar-mission-unlocks.md)
