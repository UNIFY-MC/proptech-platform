#!/usr/bin/env python3
"""
Competitor monitor watcher (Sprint B Lite).
Weekly run. Reads strategy files, calls Claude Sonnet, produces digest.
Outputs: artifact MD file + issue body file + GitHub Actions outputs.
"""
import os
import sys
import json
from datetime import datetime, timezone
from pathlib import Path
import anthropic

REPO_ROOT = Path(__file__).parent.parent.parent


def read_file(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text(encoding="utf-8")


def build_user_message() -> str:
    context = read_file(".claude/strategy/competitive-references-context.md")
    spec = read_file(".claude/strategy/competitor-monitor-spec.md")
    week_id = datetime.now(timezone.utc).strftime("%Y-W%U")

    return f"""# Competitor monitoring — weekly run

You are competitor-monitor watcher (Sprint B Lite).
Run mode: BASELINE (first run, no diff data).
Audience: solo founder (Mário), reads on mobile, ~30s scan.

## Strategic context (canonical)

{context}

## Full operational spec

{spec}

## Required output

Return ONLY valid JSON. No preamble. No markdown fences.

CRITICAL token budget:
- issue_body ≤ 800 chars (mobile readability)
- full_digest ≤ 1500 tokens (snapshot, NOT full report)

For full_digest baseline run, do NOT enumerate all spec sections.
Format compact:

# Competitor watch baseline — week {week_id}

**Tier 1 (5):** OSCAR, Jobber, ServiceTitan, Fixando, FIXO
**Tier 2A bi-weekly (5):** Samba, Housecall Pro, ZasFácil, Timpla, TaskRabbit
**Tier 2B inspirations (2):** AppFolio, Shipshape

## Strategic state (4-6 lines max)
[concise narrative of competitive landscape, key threats, key opportunities]

## Per-tier baselines (max 60 tokens each, 1 line per entity)
- OSCAR: [1-line state]
- Jobber: [1-line state]
[...]

## Recommended actions (max 3, table format)
| Priority | Action | Deadline |

## Fetch backlog (W{week_id} first run)
URLs/sources to verify next run.

Output format:

{{
  "issue_title": "🔍 Competitor watch — week {week_id} (baseline)",
  "issue_body": "Mobile-readable, ≤800 chars, 3 implications + 1 action",
  "full_digest": "Compact baseline per format above, ≤1500 tokens"
}}

## Run metadata

Week: {week_id}
Timestamp: {datetime.now(timezone.utc).isoformat()}
Mode: BASELINE — no previous data to compare; produce state-of-play snapshot.
"""


def call_anthropic(user_msg: str):
    client = anthropic.Anthropic()  # picks ANTHROPIC_API_KEY from env

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=(
            "You are the CMO agent of PropTech Platform. "
            "When invoked as competitor-monitor watcher, you produce concise weekly "
            "competitive digests for a solo founder (Mário). Output is mobile-readable "
            "and action-oriented. Always respond with valid JSON only — no preamble, "
            "no markdown fences, no commentary outside the JSON object."
        ),
        messages=[{"role": "user", "content": user_msg}],
    )

    text = response.content[0].text.strip()

    # Strip markdown fences defensively (in case model adds them)
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]

    return text.strip(), response.usage, response.stop_reason


def main():
    user_msg = build_user_message()
    print(f"[info] User message size: {len(user_msg)} chars", file=sys.stderr)

    text, usage, stop_reason = call_anthropic(user_msg)
    cost_usd = (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000
    print(
        f"[info] Tokens in={usage.input_tokens} out={usage.output_tokens} "
        f"stop={stop_reason} cost=${cost_usd:.4f}",
        file=sys.stderr,
    )

    if stop_reason == "max_tokens":
        print(
            f"::warning::LLM hit max_tokens limit. Output likely truncated. "
            f"Consider shorter prompt or higher max_tokens.",
            file=sys.stderr,
        )

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"::error::LLM output not valid JSON: {e}", file=sys.stderr)
        print(f"Raw output:\n{text}", file=sys.stderr)
        sys.exit(1)

    for key in ("issue_title", "issue_body", "full_digest"):
        if key not in data:
            print(f"::error::Missing key in LLM output: {key}", file=sys.stderr)
            sys.exit(1)

    week_id = datetime.now(timezone.utc).strftime("%Y-W%U")
    outputs_dir = REPO_ROOT / ".claude/outputs/competitor-watches"
    outputs_dir.mkdir(parents=True, exist_ok=True)
    digest_path = outputs_dir / f"competitor-watch-{week_id}.md"
    digest_path.write_text(data["full_digest"], encoding="utf-8")

    Path("/tmp/issue_body.md").write_text(data["issue_body"], encoding="utf-8")

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        title_safe = data["issue_title"].replace("\n", " ").replace("\r", "")
        with open(github_output, "a", encoding="utf-8") as f:
            f.write(f"week_id={week_id}\n")
            f.write(f"digest_path={digest_path}\n")
            f.write(f"issue_title={title_safe}\n")
            f.write(f"cost_usd={cost_usd:.4f}\n")
            f.write(f"tokens_in={usage.input_tokens}\n")
            f.write(f"tokens_out={usage.output_tokens}\n")

    print(f"[ok] Digest: {digest_path}", file=sys.stderr)
    print(f"[ok] Issue body: /tmp/issue_body.md", file=sys.stderr)


if __name__ == "__main__":
    main()
