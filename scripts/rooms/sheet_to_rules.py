#!/usr/bin/env python3
"""Turn ROOM_LIST_FOR_MATERIALS.xlsx into room_rules INSERTs.

usage: python3 sheet_to_rules.py ROOM_LIST.xlsx > rules.sql

Sheet layout: supplier | header | <one column per room, "YES" = applies>.
Header values are matched to our category names; a few need aliases, and
Topps Tiles / Howdens joinery rows are keyword rules on name + description.
"""
import sys

import openpyxl

ROOM_COLS = {
    "kitchen": "kitchen", "utility": "utility", "lounge": "lounge", "dining": "dining",
    "study": "study", "bedroom": "bedroom", "bathroom": "bathroom", "ensuite": "ensuite",
    "wc": "wc", "other reception room": "other-reception", "external": "external", "roof": "roof",
}
SUPPLIERS = {
    "benchmarx": "Benchmarx", "dulux": "Dulux", "eastbrook": "Eastbrooke",
    "howdens": "Howdens", "travis perkins": "Travis Perkins", "topps tiles": "Topps Tiles",
}
# (supplier, header) -> (category, name_pattern, priority)
SPECIAL = {
    ("Benchmarx", "kitchen"): ("Kitchens", None, 0),
    ("Dulux", "emulsions"): (None, None, 0),
    ("Eastbrooke", "all items"): (None, None, 0),
    ("Howdens", "kitchen doors"): ("Doors", None, 0),
    ("Howdens", "kitchen cupboarrds"): ("Cupboards", None, 0),
    ("Howdens", "flooring"): ("Flooring", None, 0),
    ("Howdens", "joinery worktop"): ("Joinery", r"worktop|upstand|breakfast bar|splashback", 10),
    ("Howdens", "joinery, mouldings"): ("Joinery", None, 0),
    ("Howdens", "joinery skirtins and architrave"): ("Joinery", r"skirting|architrave", 10),
    ("Howdens", "plumbing"): ("Plumbing", None, 0),
    ("Howdens", "saintary"): ("Sanitary", None, 0),
    ("Howdens", "shelving"): ("Shelving", None, 0),
    ("Travis Perkins", "aluminium door"): ("Aluminium Doors and Windows", None, 0),
    ("Travis Perkins", "worktop"): ("Artemis Modula Worktops", None, 0),
    ("Travis Perkins", "basin and pedestals"): ("Basin & Pedestals", None, 0),
    ("Topps Tiles", "outdoor tiles (in name description)"): (None, r"outdoor", 20),
    ("Topps Tiles", "bathroom tiles (in name description)"): (None, r"bathroom", 10),
    ("Topps Tiles", "all the other products"): (None, None, 0),
}


def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def main(path):
    ws = openpyxl.load_workbook(path, read_only=True).active
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h or "").strip().lower() for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not r or not r[0]:
            continue
        supplier = SUPPLIERS[str(r[0]).strip().lower()]
        header = str(r[1]).strip()
        rooms = [ROOM_COLS[head[i]] for i in range(2, len(head))
                 if head[i] in ROOM_COLS and str(r[i] or "").strip().upper() == "YES"]
        cat, pat, prio = SPECIAL.get((supplier, header.lower()), (header, None, 0))
        out.append(f"  ({q(supplier)}, {q(cat)}, {q(pat)}, array{rooms}::text[], {prio}, 'sheet', {q(header)})")
    print("insert into public.room_rules (supplier, category, name_pattern, rooms, priority, origin, note) values")
    print(",\n".join(out) + ";")


if __name__ == "__main__":
    main(sys.argv[1])
