#!/usr/bin/env python3
"""
コンテンツを検証するツール（コンテンツ・パイプライン）。
索引 content/library.json を読み、並んでいる絵本ファイルを1冊ずつ検証する。
イラスト/音声を差し替えたあと、これを通してから配布すると事故が減る。

つかいかた:
    python3 tools/validate_content.py
    python3 tools/validate_content.py path/to/library.json
"""
import json
import sys
from pathlib import Path

VALID_TYPES = {"story", "mission", "end"}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def check_asset(content_dir, where, field, rel, required, errors, warnings):
    if not rel:
        if required:
            warnings.append(f"{where}.{field} が未設定")
        return
    if not (content_dir / rel).exists():
        msg = f"{where}.{field}: ファイルが見つかりません → {rel}"
        (errors if required else warnings).append(msg)


def validate_book(book, where, content_dir, seen_books, errors, warnings):
    bid = book.get("id")
    if not bid:
        errors.append(f"{where}.id がありません")
    elif bid in seen_books:
        errors.append(f"{where}.id '{bid}' が重複")
    else:
        seen_books.add(bid)
    if not book.get("title"):
        errors.append(f"{where}.title がありません")
    check_asset(content_dir, where, "cover", book.get("cover"), True, errors, warnings)

    pages = book.get("pages", [])
    if not pages:
        errors.append(f"{where}.pages が空です")
    if not any(p.get("type") == "end" for p in pages):
        warnings.append(f"{where}: end ページがありません（絵本が完了しません）")

    seen_pages = set()
    for pi, page in enumerate(pages):
        pw = f"{where}.pages[{pi}]"
        pid = page.get("id")
        if not pid:
            errors.append(f"{pw}.id がありません")
        elif pid in seen_pages:
            errors.append(f"{pw}.id '{pid}' が重複")
        else:
            seen_pages.add(pid)

        if page.get("type") not in VALID_TYPES:
            errors.append(f"{pw}.type '{page.get('type')}' は無効（{VALID_TYPES}）")
        if not page.get("text"):
            errors.append(f"{pw}.text がありません")
        if page.get("type") == "mission" and not page.get("prompt"):
            errors.append(f"{pw}: mission には prompt が必要")

        check_asset(content_dir, pw, "image", page.get("image"), True, errors, warnings)
        check_asset(content_dir, pw, "audio", page.get("audio"), False, errors, warnings)
        check_asset(content_dir, pw, "character", page.get("character"), False, errors, warnings)
        for li, layer in enumerate(page.get("layers", [])):
            check_asset(content_dir, f"{pw}.layers[{li}]", "image", layer.get("image"), True, errors, warnings)


def validate(index_path: Path):
    errors, warnings = [], []
    content_dir = index_path.parent  # assets はここ起点

    try:
        index = load_json(index_path)
    except json.JSONDecodeError as e:
        return [f"索引 JSON が壊れています: {e}"], []

    files = index.get("books", [])
    if not files:
        errors.append("library.json の books が空です")

    seen_books = set()
    for f in files:
        book_path = content_dir / f
        if not book_path.exists():
            errors.append(f"絵本ファイルがありません → {f}")
            continue
        try:
            book = load_json(book_path)
        except json.JSONDecodeError as e:
            errors.append(f"{f}: JSON が壊れています: {e}")
            continue
        validate_book(book, f, content_dir, seen_books, errors, warnings)

    return errors, warnings


def main():
    default = Path(__file__).resolve().parent.parent / "content" / "library.json"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    if not path.exists():
        print(f"✗ ファイルがありません: {path}")
        sys.exit(1)

    errors, warnings = validate(path)
    print(f"検証: {path}")
    for w in warnings:
        print(f"  ⚠ {w}")
    for e in errors:
        print(f"  ✗ {e}")
    if errors:
        print(f"\n✗ NG: エラー {len(errors)}件 / 警告 {len(warnings)}件")
        sys.exit(1)
    print(f"\n✓ OK（警告 {len(warnings)}件）")


if __name__ == "__main__":
    main()
