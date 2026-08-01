#!/usr/bin/env python3
"""Create Japanese display names for the English Work Styles occupation titles.

The original English title remains in content/work-styles.json. This optional
one-time build step creates a separate display map so the source data is not
rewritten. It uses Google's public translation endpoint and should be rerun
only when the source occupation list changes.
"""

from __future__ import annotations

import json
import ssl
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

TLS_CONTEXT = ssl.create_default_context(cafile="/etc/ssl/cert.pem")


def translate(title: str) -> str:
    query = urlencode({
        "client": "gtx",
        "sl": "en",
        "tl": "ja",
        "dt": "t",
        "q": title,
    })
    request = Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "geiot-prototype-work-styles/1.0"},
    )
    with urlopen(request, timeout=15, context=TLS_CONTEXT) as response:
        payload = json.load(response)
    translated = "".join(part[0] for part in payload[0] if part and part[0])
    return translated.strip() or title


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "content" / "work-styles.json"
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "content" / "work-style-titles-ja.json"
    data = json.loads(source.read_text(encoding="utf-8"))
    occupations = data.get("occupations", [])
    titles = {}

    def translate_occupation(occupation):
        title = occupation["title"]
        try:
            translated = translate(title)
        except Exception as error:
            print(f"translation failed for {title!r}: {error}", file=sys.stderr)
            translated = title
        return occupation["code"], translated

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = [executor.submit(translate_occupation, occupation) for occupation in occupations]
        for index, future in enumerate(as_completed(futures), start=1):
            code, translated = future.result()
            titles[code] = translated
            if index % 25 == 0 or index == len(occupations):
                print(f"translated {index}/{len(occupations)}", flush=True)

    # Human-readable output makes small manual corrections easy.
    titles["19-3091.00"] = "人類学者・考古学者"
    target.write_text(
        json.dumps({
            "source": source.name,
            "language": "ja",
            "titles": titles,
        }, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {target} ({len(titles)} titles)")


if __name__ == "__main__":
    main()
