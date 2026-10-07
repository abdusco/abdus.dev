#!/usr/bin/env python3
"""Write dist/.redirects.caddy (imported by .caddyfile).

kopkop only emits HTML meta-refresh pages for `aliases`. Caddy serves real 301s:
  - every page alias -> the page
  - the old Eleventy tag URLs (/posts/~tag/) -> /tags/tag/
Run after `kopkop build`, which wipes dist/.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = ROOT / "dist" / ".redirects.caddy"

# tags that used to mark the section, not a topic
SECTION_TAGS = {"post": "/posts/", "project": "/projects/"}


def front_matter(path: Path) -> str:
    text = path.read_text()
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    return m.group(1) if m else ""


def slugify(s: str) -> str:
    return re.sub(r"[^\w]+", "-", s.lower()).strip("-")


def page_url(md: Path) -> str:
    return "/" + md.parent.relative_to(CONTENT).as_posix() + "/"


def aliases(fm: str) -> list[str]:
    m = re.search(r"^aliases:\n((?:[ \t]+- .*\n?)+)", fm, re.M)
    if not m:
        return []
    return [line.strip()[2:].strip() for line in m.group(1).splitlines()]


def tags(fm: str) -> list[str]:
    m = re.search(r"^\s+tags: \[(.*)\]", fm, re.M)
    if not m:
        return []
    return [t.strip().strip("\"'") for t in m.group(1).split(",") if t.strip()]


def main() -> None:
    lines = []
    old_tags = set()
    for md in sorted(CONTENT.rglob("index.md")):
        fm = front_matter(md)
        for alias in aliases(fm):
            lines.append(f"redir /{alias.strip('/')}/ {page_url(md)} permanent")
        old_tags.update(tags(fm))

    for tag, target in SECTION_TAGS.items():
        lines.append(f"redir /posts/~{tag}/ {target} permanent")
    for tag in sorted(old_tags):
        lines.append(f"redir /posts/~{slugify(tag)}/ /tags/{slugify(tag)}/ permanent")

    if not OUT.parent.exists():
        sys.exit(f"{OUT.parent} does not exist, run kopkop build first")
    OUT.write_text("\n".join(lines) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(lines)} redirects)")


if __name__ == "__main__":
    main()
