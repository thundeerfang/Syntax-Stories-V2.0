#!/usr/bin/env python3
"""Remove unused named/default imports from TS/TSX files (import statements only)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src"


def is_used(name: str, body: str) -> bool:
    if name == "React":
        return "React." in body or "</" in body
    patterns = [
        rf"\b{re.escape(name)}\b",
        rf"<{re.escape(name)}\b",
        rf"</{re.escape(name)}>",
        rf":\s*{re.escape(name)}\b",
    ]
    return sum(len(re.findall(p, body)) for p in patterns) > 0


def parse_imports(text: str) -> tuple[str, str, str]:
    """Return (preamble, body, raw_import_block)."""
    lines = text.splitlines(keepends=True)
    preamble: list[str] = []
    import_lines: list[str] = []
    i = 0

    if i < len(lines) and lines[i].strip() in ("'use client';", '"use client";'):
        preamble.append(lines[i])
        i += 1

    while i < len(lines) and lines[i].strip() == "":
        preamble.append(lines[i])
        i += 1

    while i < len(lines):
        if lines[i].strip().startswith("import "):
            import_lines.append(lines[i])
            i += 1
            while i < len(lines) and ";" not in import_lines[-1]:
                import_lines.append(lines[i])
                i += 1
            continue
        break

    body = lines[i:]
    return "".join(preamble), "".join(body), "".join(import_lines)


def rebuild_imports(raw: str, body: str) -> tuple[str, int]:
    stmts = re.findall(
        r"import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['\"][^'\"]+['\"];?",
        raw,
    )
    out: list[str] = []
    removed = 0

    for stmt in stmts:
        stmt = stmt.strip()
        if not stmt.endswith(";"):
            stmt += ";"

        m_def = re.match(r"^import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]", stmt)
        if m_def and "{" not in stmt.split("from")[0]:
            if is_used(m_def.group(1), body):
                out.append(stmt + "\n")
            else:
                removed += 1
            continue

        m = re.match(r"^import\s+(type\s+)?\{([\s\S]+)\}\s+from\s+['\"]([^'\"]+)['\"]", stmt)
        if not m:
            out.append(stmt + "\n")
            continue

        is_type_only = bool(m.group(1))
        names_block = m.group(2)
        src = m.group(3)
        kept = []
        for part in re.split(r",\s*", names_block.replace("\n", " ")):
            part = part.strip()
            if not part:
                continue
            local = part.split(" as ", 1)[-1].strip().replace("type ", "")
            if is_used(local, body):
                kept.append(part)
            else:
                removed += 1

        if kept:
            prefix = "import type " if is_type_only else "import "
            if len(kept) <= 4 and max(len(k) for k in kept) < 48:
                out.append(f"{prefix}{{ {', '.join(kept)} }} from '{src}';\n")
            else:
                inner = ",\n  ".join(kept)
                out.append(f"{prefix}{{\n  {inner},\n}} from '{src}';\n")

    return "".join(out), removed


def prune_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    preamble, body, raw = parse_imports(text)
    if not raw.strip():
        return 0
    new_imports, removed = rebuild_imports(raw, body)
    new_text = preamble + new_imports + ("\n" if new_imports and not new_imports.endswith("\n\n") else "") + body
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
    return removed


def main(argv: list[str]) -> int:
    targets: list[Path] = []
    if len(argv) > 1:
        for arg in argv[1:]:
            p = Path(arg)
            targets.extend(p.rglob("*.tsx") if p.is_dir() else [p])
    else:
        targets = list((ROOT / "features/settings/sections").glob("*.tsx"))
        targets += list((ROOT / "features/settings/lib").glob("*.ts"))
        targets += list((ROOT / "features/settings/lib").glob("*.tsx"))

    total = 0
    for p in sorted(set(targets)):
        if not p.exists():
            continue
        n = prune_file(p)
        if n:
            print(f"{p}: removed {n}")
            total += n
    print(f"Done. {total} removed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
