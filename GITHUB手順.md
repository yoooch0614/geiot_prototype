# GitHub で共同編集する手順

このプロジェクトを複数人で編集するための手順です。
Git に不慣れな人は、コマンドではなく **GitHub Desktop（アプリ）** を使うのが楽です。

---

## なぜ Git？

- 誰かの編集が上書きで消える事故を防げる（履歴が全部残る）
- 同じファイルの別の場所なら、自動で合体（マージ）される
- push するたびに公開URLを自動更新できる（後述の Pages）

このアプリはビルドが無く中身がテキスト（JSON/JS/CSS）なので、Gitと相性が良いです。

---

## A. さいしょの1回だけ（リポジトリを作る人）

代表者ひとりが最初にやります。

**GitHub Desktop を使う場合（おすすめ）**

1. [GitHub Desktop](https://desktop.github.com/) をインストールしてサインイン
2. `File > Add Local Repository` で、この `ehon-web` フォルダを選ぶ
3. 「create a repository」を促されたら作成（`.gitignore` は既に同梱済み）
4. `Publish repository` を押して GitHub に上げる
5. リポジトリの `Settings > Collaborators` でメンバーを招待

**コマンドで使う場合**

このフォルダで:

```bash
git init
git add .
git commit -m "最初のコミット（えほん web プロト）"
```

GitHub側で空のリポジトリを作ってから:

```bash
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

---

## B. 参加する人（2回目以降のメンバー）

**GitHub Desktop**

1. インストールしてサインイン
2. `File > Clone Repository` で招待されたリポジトリを選ぶ
3. 手元にフォルダがダウンロードされる → あとは編集するだけ

**コマンド**

```bash
git clone https://github.com/<ユーザー名>/<リポジトリ名>.git
cd <リポジトリ名>
```

---

## C. 毎日のながれ（全員）

事故の大半はこれを守るだけで防げます。

1. **編集をはじめる前に、最新を取り込む**
   - Desktop: `Fetch origin` → `Pull`
   - コマンド: `git pull`
2. ファイルを編集して保存（`serve.py` で動作確認）
3. **区切りがついたら反映する**
   - Desktop: 変更内容にメッセージを書いて `Commit` → `Push origin`
   - コマンド:
     ```bash
     git add .
     git commit -m "はっぱのぼうけんに ページを追加"
     git push
     ```
4. グループに「push した」と一言伝える

> 💡 コミットのメッセージは「何をしたか」を短く日本語で書けばOKです。

---

## D. ぶつからないためのコツ

- **絵本は1冊1ファイル**（`content/books/<絵本>.json`）。担当を分ければ、別々の絵本を同時に編集してもぶつかりません。
- **画像・音声（`assets/`）は合体できない**ので、同じファイルを二人が同時に差し替えないこと。
- 大きめの変更は、作業前に「これから◯◯やります」と一声かけると安全です。

もし同じ行を同時に編集して衝突（コンフリクト）が出たら、あわてず、どちらを残すか相談して直せます。GitHub Desktop なら画面で選べます。

---

## E. 公開URLを自動更新する（GitHub Pages）

審査員へのURL/QR配布に便利です。静的サイトなのでそのまま載ります。

1. GitHub のリポジトリ → `Settings > Pages`
2. `Source` を `Deploy from a branch` にし、`main` / `root` を選んで保存
3. 数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される
4. 以降は **push するたびに自動で最新版に更新**される

> Pages は https で配信されるので、写真撮影（`<input capture>`）もむしろ安定します。
> ローカルの `serve.py` は「手元での確認用」、Pages は「みんなに見せる公開版」と使い分けます。

---

## F. さわらないファイルに注意

`.gitignore` に書いてあるもの（`.DS_Store`、`__pycache__`、`*.zip` など）は
自動で無視されるので、Gitに上がりません。触らなくて大丈夫です。
