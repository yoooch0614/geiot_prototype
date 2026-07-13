/*
 * ContentRepository ── ロジック層
 * ------------------------------------------------------------
 * content/library.json（索引）を読み、そこに並んだ絵本ファイルを
 * 1冊ずつ読み込んで束ねる。
 *
 * 絵本は1冊1ファイル（content/books/*.json）。
 * → 別々の絵本を編集する人どうしは、Gitでぶつからない。
 *
 * アセットのパス（image / cover）は content/ 起点で書く（例 "assets/xxx.svg"）。
 */
export class ContentRepository {
  constructor(indexPath = "content/library.json") {
    this.indexPath = indexPath;
    this.contentDir = indexPath.slice(0, indexPath.lastIndexOf("/")); // "content"
    this.meta = {};
    this.books = [];
    this.errors = [];
  }

  async load() {
    // 1) 索引を読む
    const res = await fetch(this.indexPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`索引を読み込めません (${res.status})`);
    const index = await res.json();
    this.meta = index.meta ?? {};

    // 2) 索引に並んだ絵本ファイルを順番に読み込む
    const files = index.books ?? [];
    this.errors = [];
    const results = await Promise.allSettled(
      files.map((f) => this._loadBook(f))
    );

    // 成功した絵本だけを、索引の並び順どおりに採用する
    this.books = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") this.books.push(r.value);
      else {
        this.errors.push(files[i]);
        console.warn(`絵本を読み込めませんでした: ${files[i]}`, r.reason);
      }
    });
    return this.books;
  }

  async _loadBook(relPath) {
    const res = await fetch(`${this.contentDir}/${relPath}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${relPath} (${res.status})`);
    return res.json();
  }

  book(bookId) { return this.books.find((b) => b.id === bookId) ?? null; }

  pages(bookId) { return this.book(bookId)?.pages ?? []; }

  pageAt(bookId, index) { return this.pages(bookId)[index] ?? null; }

  pageCount(bookId) { return this.pages(bookId).length; }

  // content/ 起点の相対パスを実パスに解決
  assetUrl(relative) { return relative ? `${this.contentDir}/${relative}` : null; }
}
