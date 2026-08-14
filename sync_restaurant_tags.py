#!/usr/bin/env python3
"""Convert restaurant-tags.xlsx into restaurants-data.js for the local H5 page."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

MAIN_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
TRUE_VALUES = {"1", "true", "yes", "y", "是"}


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference).group(0)
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - ord("A") + 1
    return value - 1


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.iter(MAIN_NS + "t")) for item in root]


def cell_value(cell: ET.Element, strings: list[str]) -> str:
    cell_type = cell.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(MAIN_NS + "t"))
    value = cell.findtext(MAIN_NS + "v", default="")
    if cell_type == "s" and value:
        return strings[int(value)]
    return value


def read_rows(source: Path) -> list[list[str]]:
    with zipfile.ZipFile(source) as archive:
        sheet_names = sorted(name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml"))
        if not sheet_names:
            raise ValueError("workbook has no worksheet")
        strings = shared_strings(archive)
        root = ET.fromstring(archive.read(sheet_names[0]))
        rows: list[list[str]] = []
        for row in root.findall(f".//{MAIN_NS}row"):
            values: dict[int, str] = {}
            for cell in row.findall(MAIN_NS + "c"):
                values[column_index(cell.get("r"))] = cell_value(cell, strings).strip()
            width = max(values, default=-1) + 1
            rows.append([values.get(index, "") for index in range(width)])
        return rows


def main() -> int:
    folder = Path(__file__).resolve().parent
    source = folder / "restaurant-tags.xlsx"
    target = folder / "restaurants-data.js"
    if not source.is_file():
        print(f"Missing workbook: {source}", file=sys.stderr)
        return 1

    rows = read_rows(source)
    if not rows or not rows[0] or rows[0][0].strip() != "餐厅":
        print("The first header must be: 餐厅", file=sys.stderr)
        return 1

    tags = [header.strip() for header in rows[0][1:] if header.strip()]
    if len(tags) != len(set(tags)):
        print("Tag headers must be unique", file=sys.stderr)
        return 1

    restaurants = []
    for row in rows[1:]:
        name = row[0].strip() if row else ""
        if not name:
            continue
        tag_values = row[1:]
        restaurants.append({
            "name": name,
            "tags": {
                tag: (tag_values[index].strip().lower() in TRUE_VALUES if index < len(tag_values) else False)
                for index, tag in enumerate(tags)
            },
        })

    payload = {"tags": tags, "restaurants": restaurants}
    target.write_text(
        "window.RESTAURANT_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Synced {len(restaurants)} restaurants and {len(tags)} tags to {target.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
