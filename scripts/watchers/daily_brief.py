#!/usr/bin/env python3
"""
Daily-brief watcher (Sprint B Lite).
Daily run 9h Lisboa. Aggregates last 24h activity.
Model: Haiku (lightweight, ~$0.005/run = $0.15/month).
"""
import os
import sys
import json
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
import anthropic

REPO_ROOT = Path(__file__).parent.parent.parent


def get_git_log_24h() -> str:
    try:
        result = subprocess.run(
            ["git", "log", "--since=24.hours.ago", "--pretty=format:%h %s (%an)"],
            capture_output=True, text=True, cwd=REPO_ROOT, timeout=10,
        )
        return result.stdout.strip() or "(no commits last 24h)"
    except Exception as e:
        return f"(git log error: {e})"


def get_recent_decisions() -> str:
    decisions_file = REPO_ROOT / ".claude/current/decisions-log.md"
    if not decisions_file.exists():
        return "(decisions-log.md not found)"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    content = decisions_file.read_text(encoding="utf-8")
    lines = [l for l in content.split("\n") if today in l or yesterday in l]
    return "\n".join(lines) if lines else "(no decisions logged last 24h)"


def build_user_message() -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    git_log = get_git_log_24h()
    decisions = get_recent_decisions()
    snapshot = (REPO_ROOT / ".claude/strategy/master-plan-snapshot.md").read_text(encoding="utf-8")[:5000]
    sprint = (REPO_ROOT / ".claude/current/current-sprint.md").read_text(encoding="utf-8")

    return f"""# Daily brief — {today}

You are daily-brief watcher. Audience: Mário (solo founder, mobile read, 30s scan).
Mode: aggregate last 24h activity into actionable summary.

## Last 24h commits
{git_log}

## Last 24h decisions logged
{decisions}

## Active sprint
{sprint}

## Strategic context (excerpt)
{snapshot}

## Required output

Return ONLY valid JSON. No preamble. No markdown fences.

{{
  "issue_title": "☀️ Daily brief — {today}",
  "issue_body": "≤500 chars mobile-readable. Format:\\n\\n**Yesterday:** [1-2 lines what shipped]\\n\\n**Today's focus:** [1-2 lines from current-sprint.md]\\n\\n**Risk/blocker:** [1 line if any, else 'none flagged']\\n\\n**Action:** [1 specific action recommended]"
}}

If nothing happened (no commits, no decisions): briefer body, recommend a focus action from current-sprint.md.
"""


def call_anthropic(user_msg: str):
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        system="You are the COO agent. When invoked as daily-brief watcher, produce concise daily summaries for solo founder. Mobile-readable, action-oriented. Always respond with valid JSON only.",
        messages=[{"role": "user", "content": user_msg}],
    )
    text = response.content[0].text.strip()
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
    cost_usd = (usage.input_tokens * 1 + usage.output_tokens * 5) / 1_000_000  # haiku pricing
    print(f"[info] Tokens in={usage.input_tokens} out={usage.output_tokens} stop={stop_reason} cost=${cost_usd:.4f}", file=sys.stderr)

    if stop_reason == "max_tokens":
        print("::warning::LLM hit max_tokens. Output may be truncated.", file=sys.stderr)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"::error::Invalid JSON: {e}", file=sys.stderr)
        print(f"Raw:\n{text}", file=sys.stderr)
        sys.exit(1)

    for key in ("issue_title", "issue_body"):
        if key not in data:
            print(f"::error::Missing key: {key}", file=sys.stderr)
            sys.exit(1)

    Path("/tmp/issue_body.md").write_text(data["issue_body"], encoding="utf-8")

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        title_safe = data["issue_title"].replace("\n", " ").replace("\r", "")
        with open(github_output, "a", encoding="utf-8") as f:
            f.write(f"issue_title={title_safe}\n")
            f.write(f"cost_usd={cost_usd:.4f}\n")
            f.write(f"tokens_in={usage.input_tokens}\n")
            f.write(f"tokens_out={usage.output_tokens}\n")

    print(f"[ok] Issue body: /tmp/issue_body.md", file=sys.stderr)


if __name__ == "__main__":
    main()
