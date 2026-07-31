"""Render static-landing/og-card-source.html to public/media/og-card.png.

The OG share card is a rendered PNG; editing the HTML source does nothing
until this runs. 1200x630, deviceScaleFactor 1, self-contained source (no
external assets). Run from anywhere:

    python static-landing/render_og_card.py
"""

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "static-landing" / "og-card-source.html"
OUT = ROOT / "public" / "media" / "og-card.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630})
    page.goto(SRC.as_uri())
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT), clip={"x": 0, "y": 0, "width": 1200, "height": 630})
    browser.close()

print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
