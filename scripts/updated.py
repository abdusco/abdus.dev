#!/usr/bin/env python3
"""Write data/updated.json: last git commit time of every content file.

Templates read it with load_data(path="data/updated.json")[page.relative_path].
Needs full git history (fetch-depth: 0 on CI).
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"


def ignored_revs() -> set[str]:
    """Commits that touched files without really changing them (like the move to kopkop)."""
    f = ROOT / ".git-blame-ignore-revs"
    if not f.exists():
        return set()
    return {
        line.split("#")[0].strip()
        for line in f.read_text().splitlines()
        if line.split("#")[0].strip()
    }


def last_commit_time(path: Path, ignore: set[str]) -> str | None:
    out = subprocess.run(
        ["git", "log", "--follow", "--format=%H %cI", "--", str(path)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    for line in out.splitlines():
        sha, ts = line.split(" ", 1)
        if sha not in ignore:
            return ts
    return None


def main() -> None:
    updated = {}
    ignore = ignored_revs()
    for md in sorted(CONTENT.rglob("*.md")):
        if md.name == "_index.md":
            continue
        ts = last_commit_time(md, ignore)
        if ts:
            updated[md.relative_to(CONTENT).as_posix()] = ts

    out = ROOT / "data" / "updated.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(updated, indent=2, sort_keys=True) + "\n")
    print(f"wrote {out.relative_to(ROOT)} ({len(updated)} pages)")


if __name__ == "__main__":
    main()
