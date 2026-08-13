#!/usr/bin/env python3
"""Convert a WebM recording to an H.264 MP4 beside the original file."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def output_path(source: Path) -> Path:
    return source.with_suffix('.mp4')


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Convert a dinner-wheel .webm recording to an .mp4 file.'
    )
    parser.add_argument(
        'source',
        type=Path,
        nargs='?',
        help='Path to the .webm recording; omitted means the .webm beside this script',
    )
    parser.add_argument('-f', '--force', action='store_true', help='Overwrite an existing .mp4')
    args = parser.parse_args()

    if args.source is None:
        script_folder = Path(__file__).resolve().parent
        recordings = sorted(path for path in script_folder.glob('*.webm') if path.is_file())
        if not recordings:
            parser.error(f'no .webm file found beside this script: {script_folder}')
        if len(recordings) > 1:
            parser.error('multiple .webm files found beside this script; keep only one or pass its path')
        source = recordings[0]
    else:
        source = args.source.expanduser().resolve()
    target = output_path(source)

    if source.suffix.lower() != '.webm':
        parser.error('source must be a .webm file')
    if not source.is_file():
        parser.error(f'file not found: {source}')
    if target.exists() and not args.force:
        parser.error(f'target already exists: {target} (use --force to overwrite)')

    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        print('ffmpeg was not found. Install it first, then run this script again.', file=sys.stderr)
        print('macOS: brew install ffmpeg', file=sys.stderr)
        return 1

    command = [
        ffmpeg,
        '-y' if args.force else '-n',
        '-i', str(source),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        str(target),
    ]
    result = subprocess.run(command, check=False)
    if result.returncode:
        return result.returncode

    print(f'Created: {target}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
