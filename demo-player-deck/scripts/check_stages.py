#!/usr/bin/env python3
"""Check a deck's stage-player data before presenting or publishing.

Usage: python3 check_stages.py deck.html [--video film.mp4]

Reads data-stages / data-roles / data-video from the .player element and reports
gaps, overlaps, captions outside their stage, marks off the timeline, unknown caption
kinds, stages still waiting for timecodes, and (with ffprobe) a timeline longer than
the film. Exit code 1 when any error is found; warnings alone exit 0.
"""
import json
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

EPS = 0.05


class PlayerAttrs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.attrs = None

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if self.attrs is None and 'player' in (d.get('class') or '').split():
            self.attrs = d


def film_duration(path):
    if not shutil.which('ffprobe'):
        return None
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return None


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 2
    deck = Path(argv[0])
    video = Path(argv[argv.index('--video') + 1]) if '--video' in argv else None
    p = PlayerAttrs()
    p.feed(deck.read_text(encoding='utf-8'))
    if p.attrs is None:
        print('ERROR no element with class "player" found')
        return 1
    errors, warnings = [], []
    stages = json.loads(p.attrs.get('data-stages') or '[]')
    roles = json.loads(p.attrs.get('data-roles') or '{}')
    src = p.attrs.get('data-video') or ''
    if not src:
        warnings.append('data-video is empty: the player runs a simulated clock')
    elif not (deck.parent / src).exists():
        warnings.append(f'data-video "{src}" is not next to the deck (fine online if uploaded as a published file)')
    prev_end = None
    for i, s in enumerate(stages):
        name = s.get('name') or f'#{i}'
        if s.get('start') is None:
            warnings.append(f'stage "{name}" has no timecodes yet (shown as 待補)')
            continue
        start, end = s['start'], s['end']
        if not start < end:
            errors.append(f'stage "{name}": start {start} is not before end {end}')
        if prev_end is not None and abs(start - prev_end) > EPS:
            kind = 'gap' if start > prev_end else 'overlap'
            warnings.append(f'stage "{name}": {kind} of {abs(start - prev_end):.2f}s after the previous stage')
        prev_end = end
        subs = s.get('subs') or []
        if not subs:
            errors.append(f'stage "{name}": no captions')
        elif abs(subs[0]['s'] - start) > EPS:
            warnings.append(f'stage "{name}": first caption starts at {subs[0]["s"]}, stage starts at {start}')
        for sub in subs:
            if sub['s'] < start - EPS or sub['e'] > end + EPS or sub['s'] >= sub['e']:
                errors.append(f'stage "{name}": caption {sub["s"]}–{sub["e"]} lies outside {start}–{end} or is empty')
            if roles and sub.get('k') not in roles:
                errors.append(f'stage "{name}": caption kind "{sub.get("k")}" is not in data-roles')
            if not (sub.get('c') or '').strip():
                errors.append(f'stage "{name}": caption at {sub["s"]} has no text')
        for mark in s.get('marks') or []:
            if not start <= mark['t'] <= end:
                errors.append(f'stage "{name}": mark "{mark.get("label")}" at {mark["t"]} is outside the stage')
    film = video or ((deck.parent / src) if src else None)
    if film and film.exists() and prev_end is not None:
        dur = film_duration(film)
        if dur is None:
            warnings.append('ffprobe unavailable: film length not checked')
        elif prev_end > dur + 0.1:
            errors.append(f'timeline ends at {prev_end}s but the film is {dur:.2f}s')
    for w in warnings:
        print('WARN ', w)
    for e in errors:
        print('ERROR', e)
    print(f'{len(stages)} stages, {len(errors)} errors, {len(warnings)} warnings')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
