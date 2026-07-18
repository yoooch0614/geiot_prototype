---
name: verify
description: このリポジトリ（えほえほ web プロトタイプ）の動作確認レシピ。headless Chrome + puppeteer-core でアプリを実際に操作して確かめる。
---

# えほえほ の動作確認

静的 SPA（HTML/CSS/JS + JSON）。ビルドなし。テストスイートなし。確認は実ブラウザで画面を操作する。

## 起動

```bash
python3 serve.py   # http://localhost:8000 を配信
```

ポート 8000 が使用中なら、たいてい既にユーザーが serve.py を起動している。
`curl -s http://localhost:8000/js/app.js | head -1` で同じプロジェクトを配信しているか確かめて、そのまま使う（勝手に kill しない）。

## ブラウザ操作（headless）

Playwright は未導入。システムの Chrome を puppeteer-core で駆動するのが軽い：

```bash
cd <scratchpad> && npm i puppeteer-core
# executablePath: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

## 押さえどころ・ハマりどころ

- 初回ガイドのモーダルが画面ごとに自動で開く。スクリプトでは
  `evaluateOnNewDocument` で `localStorage["ehon.session.v2"]` に
  `{welcomeGuideSeen:true, guideSeen:true, parentGuideSeen:true}` を先に入れて回避する。
- 主要セレクタ: MODE `[data-go="child"]` / `[data-go="parent"]`、PIN は `[data-key="0"]` を4回（プロト用 PIN 0000）、
  保護者本棚 → レポートは `[data-go="PARENT"]`、戻るは全画面 `[data-back]`。
- ミッション撮影はファイル入力（`#camera-input`）。`page.waitForFileChooser()` と
  `[data-shoot]` の DOM クリックを Promise.all で並べ、`chooser.accept([png])` で写真を渡す。
  その後 PREVIEW `[data-keep]` → ACHIEVE（1.8秒で自動遷移）→ `[data-finish]` → COMPLETE。
- 一番短い本は 3ページ・ミッション1つ（book-walk / book-star / book-sun など）。1冊読み切りの確認に使う。
- flipbook 内のボタンは page.click だと見えないページで失敗することがある。
  `page.$$eval(sel, els => els[0].click())` の DOM クリックが確実。
- 状態は localStorage（メタ）+ IndexedDB（写真・思い出）。永続化の確認はリロードで行う。
