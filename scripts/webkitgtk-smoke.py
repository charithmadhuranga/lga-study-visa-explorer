#!/usr/bin/env python3
"""
Real-engine smoke test: drive the production build in WebKitGTK 4.1 — the exact engine the
Tauri app uses on Linux — and assert every section is actually visible after in-app navigation.

Why this exists: Playwright's WebKit is a different WebKit build. v0.1.1 passed all Playwright
specs, yet in WebKitGTK every page after the first navigation stayed at opacity 0 until a
reload (a stalled Motion opacity tween). This catches that class of bug.

Usage:  python3 scripts/webkitgtk-smoke.py [base_url]     (default http://localhost:4173)
        npm run e2e:webkitgtk                              (builds + serves + runs)
Needs:  python3-gi, gir1.2-webkit2-4.1, a display (CI: xvfb-run). The window is off-screen.
Exit:   0 when every step passes, 1 otherwise.
"""
import json
import os
import re
import sys

os.environ.setdefault("WEBKIT_DISABLE_DMABUF_RENDERER", "1")  # same as the app (SPEC D17)

import gi  # noqa: E402

gi.require_version("Gtk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173"
SETTLE_MS = 2200  # longer than any entrance animation

CHAPTER = '[...document.querySelectorAll(".chapter")].find(a => a.textContent.includes("%s")).click()'
BUTTON = '[...document.querySelectorAll("button")].find(b => b.textContent.includes("%s")).click()'

# Expected-heading sentinel: the step must leave the app on the page the previous step showed.
SAME_PAGE = "<same page>"

# (label, action, expected <h1>[, settle ms, overlay that must be fully visible])
STEPS = [
    ("start the consultation", BUTTON % "Start the consultation", r"Everything you need"),
    ("chapter: Destinations", CHAPTER % "Destinations", r"Where would you like to study"),
    ("chapter: Courses", CHAPTER % "Courses", r"Find the right course"),
    ("chapter: Shortlist", CHAPTER % "Shortlist", r"Your shortlist"),
    ("chapter: Next steps", CHAPTER % "Next steps", r"Your journey with LGA"),
    ("chapter: About LGA", CHAPTER % "About LGA", r"Everything you need"),
    ("chapter: Destinations again", CHAPTER % "Destinations", r"Where would you like to study"),
    ("country card", "document.querySelector('.dest-card').click()", r"Study in United Kingdom"),
    ("country tab: Visa & work", BUTTON % "Visa & work", r"Study in United Kingdom"),
    ("country tab: Universities", BUTTON % "Universities & courses", r"Study in United Kingdom"),
    ("university card", "document.querySelector('.uni-card').click()", r".+"),
    ("course row", "document.querySelector('.course-row').click()", r".+"),
    ("next course (stepper)", "document.querySelector('.stepper__btn--next').click()", r".+"),
    ("add to shortlist → toast", BUTTON % "Add to shortlist", r".+", 700, ".toast"),
    ("Close → confirmation", "document.querySelector('.icon-btn--close').click()", r".+", 900, ".idle-panel"),
    ("Keep presenting", BUTTON % "Keep presenting", r".+"),
    ("status chip → popover", "document.querySelector('.status-chip').click()", r".+", 900, ".status-pop"),
    ("Escape closes popover only", "document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}))", SAME_PAGE),
    ("breadcrumb: country", "[...document.querySelectorAll('.crumbs__link')][1].click()", r"Study in United Kingdom"),
    ("chapter: Courses again", CHAPTER % "Courses", r"Find the right course"),
    ("PageDown (clicker)", "document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown', bubbles: true}))", r"Your shortlist"),
    ("PageUp (clicker)", "document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageUp', bubbles: true}))", r"Find the right course"),
]

DIAG = r"""((overlay) => {
  const main = document.querySelector('main');
  const h1 = document.querySelector('main h1');
  const hidden = [main, ...document.querySelectorAll('main *')].filter(e => {
    if (!e) return false;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || r.top > innerHeight || r.bottom < 0) return false;
    if (e.closest('[disabled]')) return false;
    return Number(getComputedStyle(e).opacity) < 0.99;
  }).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''));
  return JSON.stringify({
    hash: location.hash,
    h1: h1 ? h1.textContent.trim() : '',
    text: main ? main.innerText.length : 0,
    mains: document.querySelectorAll('main').length,
    hidden: hidden.slice(0, 6),
    scrollY: Math.round(scrollY),
    overlay: overlay ? (() => { const e = document.querySelector(overlay);
      return e ? Number(getComputedStyle(e).opacity) : -1; })() : null,
  });
})"""

window = Gtk.OffscreenWindow()
window.set_default_size(1920, 1080)
view = WebKit2.WebView()
window.add(view)
window.show_all()

state = {"i": -1, "failures": 0, "started": False, "last_hash": None}


def check(label, expected, raw, overlay=None):
    d = json.loads(raw)
    problems = []
    if overlay and d["overlay"] != 1:
        problems.append(f"{overlay} not visible (opacity {d['overlay']})")
    if expected == SAME_PAGE:
        if d["hash"] != state["last_hash"]:
            problems.append(f"navigated away: {state['last_hash']} -> {d['hash']}")
    elif not re.search(expected, d["h1"], re.I):
        problems.append(f"heading {d['h1']!r} does not match /{expected}/")
    state["last_hash"] = d["hash"]
    if d["text"] < 100:
        problems.append(f"page nearly empty ({d['text']} chars)")
    if d["mains"] != 1:
        problems.append(f"{d['mains']} <main> elements")
    if d["hidden"]:
        problems.append("invisible after settling: " + ", ".join(d["hidden"]))
    if d["scrollY"] != 0:
        problems.append(f"not at the top (scrollY {d['scrollY']})")
    ok = not problems
    state["failures"] += 0 if ok else 1
    print(f"{'PASS' if ok else 'FAIL'}  {label:30s} {d['hash']:28s} {'; '.join(problems)}", flush=True)


def next_step():
    state["i"] += 1
    if state["i"] >= len(STEPS):
        Gtk.main_quit()
        return False
    label, action, expected, *extra = STEPS[state["i"]]
    settle = extra[0] if extra else SETTLE_MS
    overlay = extra[1] if len(extra) > 1 else None
    view.evaluate_javascript(action, -1, None, None, None, None)

    def measure():
        def done(v, res):
            try:
                raw = v.evaluate_javascript_finish(res).to_string()
                check(label, expected, raw, overlay)
            except Exception as e:  # noqa: BLE001 — report and continue
                state["failures"] += 1
                print(f"FAIL  {label:30s} {e}", flush=True)
            GLib.idle_add(next_step)

        arg = json.dumps(overlay) if overlay else "null"
        view.evaluate_javascript(f"{DIAG}({arg})", -1, None, None, None, done)
        return False

    GLib.timeout_add(settle, measure)
    return False


def on_load(v, event):
    if event == WebKit2.LoadEvent.FINISHED and not state["started"]:
        state["started"] = True
        GLib.timeout_add(3000, next_step)


def on_fail(*_args):
    print(f"FAIL  could not load {BASE}", flush=True)
    state["failures"] += 1
    Gtk.main_quit()
    return False


view.connect("load-changed", on_load)
view.connect("load-failed", on_fail)
view.load_uri(f"{BASE}/#/welcome")
GLib.timeout_add(180_000, lambda: (print("FAIL  timed out"), Gtk.main_quit(), False)[2])
print(f"WebKitGTK {WebKit2.get_major_version()}.{WebKit2.get_minor_version()}.{WebKit2.get_micro_version()} — {BASE}", flush=True)
Gtk.main()
print(f"\n{len(STEPS) - state['failures']}/{len(STEPS)} steps passed", flush=True)
sys.exit(1 if state["failures"] else 0)
