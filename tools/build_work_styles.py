#!/usr/bin/env python3
"""Convert the O*NET Work Styles workbook into a small browser data file.

The application is intentionally dependency-free, so it does not parse XLSX in
the browser.  This script keeps the workbook as the source of truth and emits
the compact JSON consumed by the analysis screen.

Usage:
    python3 tools/build_work_styles.py
    python3 tools/build_work_styles.py input.xlsx output.json
"""

from __future__ import annotations

import json
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS = {"m": MAIN_NS}
EXPECTED_HEADERS = [
    "O*NET-SOC Code",
    "Title",
    "Element ID",
    "Element Name",
    "Scale ID",
    "Scale Name",
    "Data Value",
    "Date",
    "Domain Source",
]
SUPPORTED_SCALES = {"DR", "WI"}


def shared_strings(book: zipfile.ZipFile) -> list[str]:
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
    return round(parsed, 2)


def build_payload(path: Path) -> dict:
    rows = read_rows(path)
    if not rows:
        raise ValueError("The workbook has no rows")

    headers = [rows[0].get(column, "") for column in "ABCDEFGHI"]
    if headers != EXPECTED_HEADERS:
        raise ValueError(f"Unexpected headers: {headers!r}")

    dimensions: OrderedDict[str, dict] = OrderedDict()
    occupations: OrderedDict[str, dict] = OrderedDict()
    dates = set()
    domain_sources = set()

    for row in rows[1:]:
        code = row.get("A", "").strip()
        title = row.get("B", "").strip()
        element_id = row.get("C", "").strip()
        name = row.get("D", "").strip()
        scale = row.get("E", "").strip()
        raw_value = row.get("G", "").strip()
        if not code or not name or scale not in SUPPORTED_SCALES or not raw_value:
            continue

        dimension = dimensions.setdefault(
            element_id,
            {"id": element_id, "name": name},
        )
        if dimension["name"] != name:
            raise ValueError(f"Element ID {element_id} has multiple names")
        dimension_index = list(dimensions).index(element_id)

        occupation = occupations.setdefault(
            code,
            {
                "code": code,
                "title": title,
                "dr": [None] * len(dimensions),
                "wi": [None] * len(dimensions),
            },
        )
        # A new dimension can appear after an occupation has been initialized.
        # Extend all earlier occupation vectors before writing this value.
        for earlier in occupations.values():
            for scale_name in SUPPORTED_SCALES:
                key = scale_name.lower()
                while len(earlier[key]) < len(dimensions):
                    earlier[key].append(None)
        occupation[scale.lower()][dimension_index] = number(raw_value)
        if row.get("H"):
            dates.add(row["H"].strip())
        if row.get("I"):
            domain_sources.add(row["I"].strip())

    if not dimensions or not occupations:
        raise ValueError("No supported Work Styles records were found")

    # Per-dimension ranges allow the browser algorithm to compare DR and WI
    # values on the same 0-100 scale without assuming that every dimension has
    # the same source range.
    ranges = []
    for index in range(len(dimensions)):
        dr_values = [o["dr"][index] for o in occupations.values() if o["dr"][index] is not None]
        wi_values = [o["wi"][index] for o in occupations.values() if o["wi"][index] is not None]
        ranges.append({
            "dr": [min(dr_values), max(dr_values)],
            "wi": [min(wi_values), max(wi_values)],
        })

    return {
        "format": "work-styles-reference",
        "source": path.name,
        "dates": sorted(dates),
        "domainSources": sorted(domain_sources),
        "dimensions": list(dimensions.values()),
        "ranges": ranges,
        "occupations": list(occupations.values()),
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "Work Styles.xlsx"
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "content" / "work-styles.json"
    payload = build_payload(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {target} ({len(payload['occupations'])} occupations, "
        f"{len(payload['dimensions'])} dimensions)"
    )


if __name__ == "__main__":
    main()
