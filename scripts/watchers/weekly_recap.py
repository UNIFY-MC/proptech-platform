#!/usr/bin/env python3
"""
Weekly-recap watcher (Sprint B Lite).
Friday 17h Lisboa run. Aggregates week activity + KR delta.
Model: Sonnet (strategic analysis, ~$0.05/run = $0.20/month).
Auto-syncs issue_body to Notion dashboard as a comment when NOTION_API_KEY is set.
"""
import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
import anthropic

NOTION_PAGE_ID = "35384147-fa60-812c-8ffd-c2908ce22ef8"

REPO_ROOT = Path(__file__).parent.parent.parent


def get_git_log_week() -> str:
    try:
        result = subprocess.run(
            ["git", "log", "--since=7.days.ago", "--pretty=format:%h %s (%an, %ar)"],
            capture_output=True, text=True, cwd=REPO_ROOT, timeout=10,
        )
        return result.stdout.strip() or "(no commits this week)"
    except Exception as e:
        return f"(git log error: {e})"


def build_user_message() -> str:
    week_id = datetime.now(timezone.utc).strftime("%Y-W%U")
    git_log = get_git_log_week()
    okrs_path = REPO_ROOT / ".claude/current/q2-2026-okrs.md"
    okrs = okrs_path.read_text(encoding="utf-8") if okrs_path.exists() else "(OKRs file not found)"
    sprint = (REPO_ROOT / ".claude/current/current-sprint.md").read_text(encoding="utf-8")
    decisions = (REPO_ROOT / ".claude/current/decisions-log.md").read_text(encoding="utf-8")[-3000:]

    return f"""# Weekly recap — {week_id}

You are weekly-recap watcher. Audience: Mário (solo founder).
Mode: synthesize week's progress + OKR/KR delta + flag blockers.

## Commits this week
{git_log}

## OKRs Q2 2026
{okrs}

## Active sprint state
{sprint}

## Recent decisions (last entries)
{decisions}

## Required output

Return ONLY valid JSON. No preamble. No markdown fences.

{{
  "issue_title": "📅 Weekly recap — {week_id}",
  "issue_body": "≤1000 chars mobile-readable. Format:\\n\\n**Shipped this week:** [3-5 bullets]\\n\\n**KR progress:** [delta vs last week if calculable, else 'baseline']\\n\\n**Blockers:** [1-2 lines]\\n\\n**Next week priorities:** [3 bullets from sprint stack]\\n\\n**Strategic note:** [1 line zoom-out observation]",
  "full_recap": "≤1500 tokens. Detailed weekly summary with: shipped breakdown, KR analysis, blocker investigation, next week tactical plan, strategic narrative."
}}
"""


def post_notion_comment(text: str) -> bool:
    """POST recap summary as a comment on the Notion dashboard page. Returns True on success."""
    api_key = os.environ.get("NOTION_API_KEY")
    if not api_key:
        print("[notion] NOTION_API_KEY not set — skipping Notion sync", file=sys.stderr)
        return False

    # Notion rich_text blocks have a 2000-char limit per block; split if needed
    chunks = [text[i:i+2000] for i in range(0, len(text), 2000)]
    rich_text = [{"type": "text", "text": {"content": chunk}} for chunk in chunks]

    payload = json.dumps({
        "parent": {"page_id": NOTION_PAGE_ID},
        "rich_text": rich_text,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.notion.com/v1/comments",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.status
            print(f"[notion] Comment posted — HTTP {status}", file=sys.stderr)
            return status == 200
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[notion] HTTPError {e.code}: {body}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[notion] Error: {e}", file=sys.stderr)
        return False


def call_anthropic(user_msg: str):
    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system="You are the CEO agent. When invoked as weekly-recap watcher, produce strategic weekly synthesis for solo founder. Honest, action-oriented, KR-focused. Always respond with valid JSON only.",
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
    cost_usd = (usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000  # sonnet pricing
    print(f"[info] Tokens in={usage.input_tokens} out={usage.output_tokens} stop={stop_reason} cost=${cost_usd:.4f}", file=sys.stderr)

    if stop_reason == "max_tokens":
        print("::warning::LLM hit max_tokens. Output may be truncated.", file=sys.stderr)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"::error::Invalid JSON: {e}", file=sys.stderr)
        print(f"Raw:\n{text}", file=sys.stderr)
        sys.exit(1)

    for key in ("issue_title", "issue_body", "full_recap"):
        if key not in data:
            print(f"::error::Missing key: {key}", file=sys.stderr)
            sys.exit(1)

    week_id = datetime.now(timezone.utc).strftime("%Y-W%U")
    outputs_dir = REPO_ROOT / ".claude/outputs/weekly-recaps"
    outputs_dir.mkdir(parents=True, exist_ok=True)
    recap_path = outputs_dir / f"weekly-recap-{week_id}.md"
    recap_path.write_text(data["full_recap"], encoding="utf-8")

    Path("/tmp/issue_body.md").write_text(data["issue_body"], encoding="utf-8")

    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        title_safe = data["issue_title"].replace("\n", " ").replace("\r", "")
        with open(github_output, "a", encoding="utf-8") as f:
            f.write(f"week_id={week_id}\n")
            f.write(f"recap_path={recap_path}\n")
            f.write(f"issue_title={title_safe}\n")
            f.write(f"cost_usd={cost_usd:.4f}\n")
            f.write(f"tokens_in={usage.input_tokens}\n")
            f.write(f"tokens_out={usage.output_tokens}\n")

    print(f"[ok] Recap: {recap_path}", file=sys.stderr)
    print(f"[ok] Issue body: /tmp/issue_body.md", file=sys.stderr)

    notion_text = f"**{data['issue_title']}**\n\n{data['issue_body']}"
    post_notion_comment(notion_text)


if __name__ == "__main__":
    main()
