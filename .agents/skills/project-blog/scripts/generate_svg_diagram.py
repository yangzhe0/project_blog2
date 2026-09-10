#!/usr/bin/env python3
"""Generate an accessible inline SVG flow diagram for a blog post."""

from __future__ import annotations

import argparse
import hashlib
import html
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


PALETTES = {
    "violet": ("#8B5CF6", "#C4B5FD"),
    "blue": ("#2563EB", "#93C5FD"),
    "teal": ("#0F766E", "#5EEAD4"),
    "amber": ("#B45309", "#FCD34D"),
    "rose": ("#BE185D", "#F9A8D4"),
}


def visual_units(text: str) -> float:
    return sum(1.0 if ord(char) > 127 else 0.58 for char in text)


def wrap_text(text: str, max_units: float, max_lines: int) -> list[str]:
    words = list(text) if any(ord(char) > 127 for char in text) else text.split()
    separator = "" if any(ord(char) > 127 for char in text) else " "
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        candidate = separator.join((*current, word))
        if current and visual_units(candidate) > max_units:
            lines.append(separator.join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(separator.join(current))
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip("…") + "…"
    return lines


def tspan_lines(lines: list[str], x: int, first_y: int, gap: int) -> str:
    return "".join(
        f'<tspan x="{x}" y="{first_y + index * gap}">{html.escape(line)}</tspan>'
        for index, line in enumerate(lines)
    )


def choose_palette(name: str, title: str) -> tuple[str, str]:
    if name != "auto":
        return PALETTES[name]
    keys = tuple(PALETTES)
    index = int(hashlib.sha256(title.encode("utf-8")).hexdigest()[:8], 16) % len(keys)
    return PALETTES[keys[index]]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--title", required=True)
    parser.add_argument(
        "--node",
        action="append",
        required=True,
        help='Repeat 2-5 times using "heading|short explanation"',
    )
    parser.add_argument("--palette", choices=("auto", *PALETTES), default="auto")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if not 2 <= len(args.node) <= 5:
        parser.error("provide 2 to 5 --node values")
    if args.output.exists() and not args.force:
        parser.error(f"output exists: {args.output}; pass --force to replace it")

    nodes: list[tuple[str, str]] = []
    for raw in args.node:
        heading, separator, description = raw.partition("|")
        if not separator or not heading.strip() or not description.strip():
            parser.error('each --node must use "heading|short explanation"')
        nodes.append((heading.strip(), description.strip()))

    width, height = 1280, 720
    margin, gap = 70, 28
    card_width = (width - 2 * margin - gap * (len(nodes) - 1)) // len(nodes)
    card_y, card_height = 245, 300
    accent, accent_soft = choose_palette(args.palette, args.title)
    title_lines = wrap_text(args.title, 35, 2)

    cards: list[str] = []
    connectors: list[str] = []
    for index, (heading, description) in enumerate(nodes):
        x = margin + index * (card_width + gap)
        center_x = x + card_width // 2
        if index:
            previous_right = x - gap
            connectors.append(
                f'<path d="M {previous_right + 5} 395 H {x - 12}" stroke="{accent_soft}" '
                'stroke-width="5" stroke-linecap="round" marker-end="url(#arrow)"/>'
            )
        heading_lines = wrap_text(heading, max(7, card_width / 19), 2)
        description_lines = wrap_text(description, max(12, card_width / 10.5), 4)
        cards.append(
            f'<g><rect x="{x}" y="{card_y}" width="{card_width}" height="{card_height}" rx="24" '
            f'fill="#151B2E" stroke="{accent_soft}" stroke-opacity="0.55"/>'
            f'<circle cx="{center_x}" cy="295" r="22" fill="{accent}"/>'
            f'<text x="{center_x}" y="303" text-anchor="middle" class="step">{index + 1}</text>'
            f'<text text-anchor="middle" class="heading">{tspan_lines(heading_lines, center_x, 365, 34)}</text>'
            f'<text text-anchor="middle" class="body">{tspan_lines(description_lines, center_x, 435, 28)}</text>'
            "</g>"
        )

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
  <title id="title">{html.escape(args.title)}</title>
  <desc id="desc">由 {len(nodes)} 个节点组成的文章内流程图。</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#080B14"/><stop offset="1" stop-color="#11182A"/></linearGradient>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="{accent_soft}"/></marker>
    <style>
      text {{ font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }}
      .title {{ fill: #F8FAFC; font-size: 48px; font-weight: 750; }}
      .step {{ fill: #FFFFFF; font-size: 20px; font-weight: 750; }}
      .heading {{ fill: #F8FAFC; font-size: 25px; font-weight: 700; }}
      .body {{ fill: #CBD5E1; font-size: 18px; font-weight: 430; }}
    </style>
  </defs>
  <rect width="{width}" height="{height}" rx="32" fill="url(#background)"/>
  <circle cx="1110" cy="90" r="180" fill="{accent}" opacity="0.12"/>
  <text text-anchor="middle" class="title">{tspan_lines(title_lines, width // 2, 115, 58)}</text>
  {''.join(connectors)}
  {''.join(cards)}
  <text x="640" y="645" text-anchor="middle" fill="#64748B" font-family="Inter, sans-serif" font-size="15">INLINE DIAGRAM</text>
</svg>
'''
    ET.fromstring(svg)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(svg, encoding="utf-8", newline="\n")
    print(f"wrote {args.output} ({width}x{height}, {len(nodes)} nodes)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
