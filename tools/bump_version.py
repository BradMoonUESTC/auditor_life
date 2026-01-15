#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键同步全仓库的 ESModule cache bust 参数：?v=xx

用法：
  python3 tools/bump_version.py 38        # 设置版本=38，并同步所有 ?v=
  python3 tools/bump_version.py --inc     # 版本号自增 1，并同步
  python3 tools/bump_version.py           # 读取 tools/version.txt 的版本，并同步（不修改版本）
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "tools" / "version.txt"
EXTS = {".js", ".html", ".css"}


def read_version() -> int:
    try:
        s = VERSION_FILE.read_text(encoding="utf-8").strip()
        v = int(s)
        if v <= 0:
            raise ValueError("version must be positive")
        return v
    except Exception as e:
        raise SystemExit(f"Failed to read version from {VERSION_FILE}: {e}")


def write_version(v: int) -> None:
    VERSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    VERSION_FILE.write_text(str(v) + "\n", encoding="utf-8")


def sync_v(v: int) -> list[Path]:
    pat = re.compile(r"(\?v=)(\d+)")
    changed: list[Path] = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if ".git" in p.parts:
            continue
        if "terminals" in p.parts:
            continue
        if p.suffix not in EXTS:
            continue
        try:
            s = p.read_text(encoding="utf-8")
        except Exception:
            continue
        s2, n = pat.subn(rf"\g<1>{v}", s)
        if n > 0 and s2 != s:
            p.write_text(s2, encoding="utf-8")
            changed.append(p)
    return changed


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("version", nargs="?", type=int, help="set version to this value")
    ap.add_argument("--inc", action="store_true", help="increment version by 1")
    args = ap.parse_args()

    v = read_version()
    if args.inc:
        v = v + 1
        write_version(v)
    elif args.version is not None:
        v = int(args.version)
        if v <= 0:
            raise SystemExit("version must be positive")
        write_version(v)

    changed = sync_v(v)
    print(f"[bump_version] version={v}")
    print(f"[bump_version] updated files: {len(changed)}")
    for p in changed:
        print(" -", p.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()

