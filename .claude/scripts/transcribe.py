#!/usr/bin/env python3
"""
transcribe.py — transcribe video/audio via OpenAI Whisper API.

Setup (one time):
    brew install ffmpeg              # or: winget install ffmpeg
    pip install openai
    export OPENAI_API_KEY=sk-...

Usage:
    python transcribe.py video.mp4
    python transcribe.py video.mp4 -l en -t
    python transcribe.py video.mp4 --start 30:00 --end 1:15:00
    python transcribe.py video.mp4 --workers 8

Cost: ~$0.006/min · a 3h video is ~$1.10.
Auto-chunks files >24MB into 10-min segments, transcribed in parallel.
"""

import argparse
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    sys.exit("✗ Missing dependency. Run: pip install openai")

WHISPER_MAX_MB = 24
CHUNK_SECONDS = 600
DEFAULT_WORKERS = 4


def parse_timestamp(s: str) -> float:
    """Accept 'SS', 'MM:SS', or 'HH:MM:SS' → seconds."""
    parts = s.split(":")
    try:
        if len(parts) == 1:
            return float(parts[0])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    except ValueError:
        pass
    raise argparse.ArgumentTypeError(
        f"Invalid timestamp '{s}'. Use SS, MM:SS, or HH:MM:SS."
    )


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"✗ {cmd[0]} failed:\n{result.stderr}")
    return result


def check_ffmpeg() -> None:
    probe = subprocess.run(
        ["ffmpeg", "-version"], capture_output=True, text=True
    )
    if probe.returncode != 0:
        sys.exit("✗ ffmpeg not found. Install: brew install ffmpeg (mac) or winget install ffmpeg (win)")


def extract_audio(
    video_path: Path,
    audio_path: Path,
    start: float | None = None,
    end: float | None = None,
) -> None:
    """Extract audio as 16kHz mono mp3, optionally trimmed to [start, end]."""
    cmd = ["ffmpeg", "-y"]
    if start is not None:
        cmd += ["-ss", str(start)]
    cmd += ["-i", str(video_path)]
    if end is not None:
        duration = end - (start or 0)
        cmd += ["-t", str(duration)]
    cmd += [
        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
        str(audio_path),
    ]
    run(cmd)


def get_duration(audio_path: Path) -> float:
    out = run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]).stdout.strip()
    return float(out)


def chunk_audio(
    audio_path: Path,
    out_dir: Path,
    base_offset: float = 0.0,
) -> list[tuple[Path, float]]:
    """Split into 10-min chunks. Offsets are absolute (relative to original video start)."""
    duration = get_duration(audio_path)
    chunks: list[tuple[Path, float]] = []
    for i, rel_start in enumerate(range(0, int(duration), CHUNK_SECONDS)):
        chunk_path = out_dir / f"chunk_{i:03d}.mp3"
        run([
            "ffmpeg", "-y", "-ss", str(rel_start), "-i", str(audio_path),
            "-t", str(CHUNK_SECONDS), "-c:a", "copy",
            str(chunk_path),
        ])
        chunks.append((chunk_path, base_offset + rel_start))
    return chunks


def format_timestamp(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS depending on length."""
    total = int(seconds)
    hh, rem = divmod(total, 3600)
    mm, ss = divmod(rem, 60)
    return f"{hh:02d}:{mm:02d}:{ss:02d}" if hh else f"{mm:02d}:{ss:02d}"


def transcribe_one(
    client: OpenAI,
    audio_path: Path,
    language: str | None,
    with_timestamps: bool,
    time_offset: float = 0.0,
) -> str:
    with open(audio_path, "rb") as f:
        if with_timestamps:
            resp = client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language=language,
                response_format="verbose_json",
                timestamp_granularities=["segment"],
            )
            lines = []
            for seg in resp.segments:
                stamp = format_timestamp(seg.start + time_offset)
                lines.append(f"[{stamp}] {seg.text.strip()}")
            return "\n".join(lines)
        else:
            kwargs = {"model": "whisper-1", "file": f, "response_format": "text"}
            if language:
                kwargs["language"] = language
            return client.audio.transcriptions.create(**kwargs)


def transcribe_parallel(
    client: OpenAI,
    chunks: list[tuple[Path, float]],
    language: str | None,
    with_timestamps: bool,
    max_workers: int,
) -> list[str]:
    """Transcribe all chunks concurrently, preserving original order."""
    total = len(chunks)
    completed = {"n": 0}

    def _job(item):
        idx, (path, offset) = item
        text = transcribe_one(client, path, language, with_timestamps, offset)
        completed["n"] += 1
        print(f"  ✓ chunk {completed['n']}/{total}", file=sys.stderr)
        return idx, text

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        results = list(ex.map(_job, enumerate(chunks)))
    results.sort(key=lambda x: x[0])
    return [text for _, text in results]


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Transcribe video/audio using OpenAI Whisper API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("input", type=Path, help="Path to video or audio file")
    ap.add_argument(
        "-l", "--language", default=None,
        help="Language hint (e.g. 'en', 'pt'). Omit for auto-detect.",
    )
    ap.add_argument(
        "-o", "--output", type=Path, default=None,
        help="Output path (default: <input-stem>.txt)",
    )
    ap.add_argument(
        "-t", "--timestamps", action="store_true",
        help="Include [hh:mm:ss] timestamps per segment",
    )
    ap.add_argument(
        "--start", type=parse_timestamp, default=None,
        help="Trim start (e.g. '30:00' or '1:15:30'). Default: from beginning.",
    )
    ap.add_argument(
        "--end", type=parse_timestamp, default=None,
        help="Trim end (e.g. '45:00'). Default: to end.",
    )
    ap.add_argument(
        "--workers", type=int, default=DEFAULT_WORKERS,
        help=f"Parallel workers for chunked transcription (default: {DEFAULT_WORKERS}).",
    )
    args = ap.parse_args()

    if not args.input.exists():
        sys.exit(f"✗ File not found: {args.input}")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        sys.exit("✗ Set OPENAI_API_KEY environment variable")

    if args.start is not None and args.end is not None and args.end <= args.start:
        sys.exit(
            f"✗ --end ({args.end}s) must be greater than --start ({args.start}s)"
        )

    check_ffmpeg()

    client = OpenAI(api_key=api_key)
    output = args.output or args.input.with_suffix(".txt")
    base_offset = args.start or 0.0

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        audio = tmp_path / "audio.mp3"

        slice_note = ""
        if args.start is not None or args.end is not None:
            s = format_timestamp(args.start) if args.start else "00:00"
            e = format_timestamp(args.end) if args.end else "end"
            slice_note = f" [slice: {s} → {e}]"
        print(f"→ extracting audio from {args.input.name}{slice_note}", file=sys.stderr)
        extract_audio(args.input, audio, args.start, args.end)

        size_mb = audio.stat().st_size / (1024 * 1024)
        duration_min = get_duration(audio) / 60
        est_cost = duration_min * 0.006
        print(
            f"  audio: {size_mb:.1f}MB · {duration_min:.1f}min · "
            f"est. cost ≈ ${est_cost:.2f}",
            file=sys.stderr,
        )

        if size_mb <= WHISPER_MAX_MB:
            print("→ transcribing (single pass)", file=sys.stderr)
            text = transcribe_one(
                client, audio, args.language, args.timestamps, base_offset
            )
        else:
            print(f"→ chunking into {CHUNK_SECONDS}s segments", file=sys.stderr)
            chunks = chunk_audio(audio, tmp_path, base_offset)
            print(
                f"  {len(chunks)} chunks · {args.workers} parallel workers",
                file=sys.stderr,
            )
            parts = transcribe_parallel(
                client, chunks, args.language, args.timestamps, args.workers
            )
            text = "\n\n".join(parts)

        output.write_text(text, encoding="utf-8")
        word_count = len(text.split())
        print(f"\n✓ {output} · {word_count} words", file=sys.stderr)


if __name__ == "__main__":
    main()
