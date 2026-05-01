# Sprint 1D Live Dashboard

Live dashboard que pulla GitHub API client-side. Zero backend, zero deps.

URL after GitHub Pages enabled:
https://unify-mc.github.io/proptech-platform/dashboard/

## Setup GitHub Pages (one-time, Mário manual)

1. GitHub repo → Settings → Pages
2. Source: Deploy from branch
3. Branch: main · Folder: /docs
4. Save → URL aparece em ~2 min

## Auto-refresh

5 min interval. Manual refresh button top-right.

## Data sources (read-only public via GitHub API)

- Issues filtered by watcher labels
- Commits last 8
- Workflow runs last 20 (health status per watcher)
- Cost tracking (static, manual update)

## No analytics, no telemetry

100% client-side. Open DevTools to verify.
