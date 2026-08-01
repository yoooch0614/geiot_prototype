#!/usr/bin/env python3
"""Convert the occupation O/C/Ex/A/ES/H workbook into browser-friendly JSON.

The browser does not parse XLSX directly.  This small dependency-free converter
keeps ``occupation_big5_scores.xlsx`` as the source and emits the compact data
used by the analysis screen.

The workbook contains O, C, Ex, A, ES and H.  The application treats H as
Honesty-Humility (正直・謙虚) and exposes all six columns to the UI.

Usage:
    python3 tools/build_big5_scores.py
    python3 tools/build_big5_scores.py input.xlsx output.json
"""

from __future__ import annotations

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"m": MAIN_NS}

TRAITS = [
    {"id": "openness", "key": "O", "shortLabel": "O", "name": "Openness", "label": "開放性", "color": "#e5484d"},
    {"id": "conscientiousness", "key": "C", "shortLabel": "C", "name": "Conscientiousness", "label": "誠実性", "color": "#f5b301"},
    {"id": "extraversion", "key": "Ex", "shortLabel": "Ex", "name": "Extraversion", "label": "外向性", "color": "#ec4899"},
    {"id": "agreeableness", "key": "A", "shortLabel": "A", "name": "Agreeableness", "label": "協調性", "color": "#3b82f6"},
    {"id": "emotional_stability", "key": "ES", "shortLabel": "ES", "name": "Emotional Stability", "label": "情緒安定性", "color": "#4caf50"},
    {"id": "honesty_humility", "key": "H", "shortLabel": "H", "name": "Honesty-Humility", "label": "正直・謙虚", "color": "#8b5cf6"},
]


def shared_strings(book: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in book.namelist():
        return []
    root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    return [
        "".join(text.text or "" for text in item.iterfind(".//m:t", NS))
        for item in root.findall("m:si", NS)
    ]


def cell_value(cell: ET.Element, strings: list[str]) -> str:
    value = cell.find("m:v", NS)
    if value is None:
        inline = cell.find("m:is", NS)
        if inline is None:
            return ""
        return "".join(text.text or "" for text in inline.iterfind(".//m:t", NS))
    if cell.attrib.get("t") == "s":
        return strings[int(value.text)]
    return value.text or ""


def column_name(reference: str) -> str:
    return "".join(char for char in reference if char.isalpha())


def read_rows(path: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(path) as book:
        strings = shared_strings(book)
        sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet.findall("m:sheetData/m:row", NS):
            values = {
                column_name(cell.attrib.get("r", "")): cell_value(cell, strings)
                for cell in row.findall("m:c", NS)
            }
            if values:
                rows.append(values)
        return rows


def number(value: str) -> int | float:
    parsed = float(value)
    if parsed.is_integer():
        return int(parsed)
    return round(parsed, 6)


def build_payload(path: Path) -> dict:
    rows = read_rows(path)
    if not rows:
        raise ValueError("The workbook has no rows")

    headers = [rows[0].get(column, "").strip() for column in "ABCDEFGH"]
    required = ["O*NET-SOC Code", "Title", *(trait["key"] for trait in TRAITS)]
    missing = [header for header in required if header not in headers]
    if missing:
        raise ValueError(f"Missing required headers: {missing!r}; found {headers!r}")

    columns = {header: headers.index(header) for header in headers if header}
    occupations = []
    seen_codes = set()
    for row in rows[1:]:
        code = row.get("A", "").strip()
        title = row.get("B", "").strip()
        if not code or not title or code in seen_codes:
            continue
        values = []
        try:
            for trait in TRAITS:
                raw = row.get(chr(ord("A") + columns[trait["key"]]), "").strip()
                values.append(number(raw))
        except (KeyError, TypeError, ValueError):
            continue
        occupations.append({"code": code, "title": title, "scores": values})
        seen_codes.add(code)

    if not occupations:
        raise ValueError("No occupation rows with O/C/Ex/A/ES/H scores were found")

    ranges = []
    for index, trait in enumerate(TRAITS):
        values = [occupation["scores"][index] for occupation in occupations]
        ranges.append({"min": min(values), "max": max(values), "key": trait["key"]})

    ignored_columns = [header for header in headers[2:] if header and header not in {trait["key"] for trait in TRAITS}]
    return {
        "format": "six-factor-reference",
        "model": "O/C/Ex/A/ES/H",
        "hAssumption": "H is treated as Honesty-Humility (正直・謙虚) because the workbook does not define the header.",
        "source": path.name,
        "traits": TRAITS,
        "ranges": ranges,
        "ignoredColumns": ignored_columns,
        "occupations": occupations,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "occupation_big5_scores.xlsx"
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "content" / "occupation-big5.json"
    payload = build_payload(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {target} ({len(payload['occupations'])} occupations, "
        f"{len(payload['traits'])} six-factor traits; ignored {payload['ignoredColumns']})"
    )


if __name__ == "__main__":
    main()
