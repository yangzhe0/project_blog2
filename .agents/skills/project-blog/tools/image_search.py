#!/usr/bin/env python3
"""Search Unsplash, download one photo locally, and print Markdown attribution."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import requests


ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    load_env(ENV_FILE)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--object", required=True, help="Specific English search phrase")
    parser.add_argument("--output", required=True, type=Path, help="Local .jpg output path")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    access_key = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()
    if not access_key:
        parser.error("UNSPLASH_ACCESS_KEY is missing; copy .env.example to .env and fill it")
    if args.output.exists() and not args.force:
        parser.error(f"output exists: {args.output}; pass --force to replace it")

    query = " ".join(args.object.split()[:8])
    response = requests.get(
        "https://api.unsplash.com/search/photos",
        params={"query": query, "per_page": 1, "client_id": access_key},
        timeout=20,
    )
    response.raise_for_status()
    results = response.json().get("results", [])
    if not results:
        parser.error(f"no images found for: {query}")

    item = results[0]
    raw_url = item["urls"]["raw"]
    separator = "&" if "?" in raw_url else "?"
    photo = requests.get(raw_url + separator + "w=1600&q=85&fm=jpg", timeout=30)
    photo.raise_for_status()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(photo.content)

    author = item["user"]["name"]
    profile = item["user"]["links"]["html"]
    markdown_path = f"./image/{args.output.name}"
    print(f"![{query}]({markdown_path})")
    print(f"*Photo by [{author}]({profile}) on [Unsplash](https://unsplash.com)*")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except requests.RequestException as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
