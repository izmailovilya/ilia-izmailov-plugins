#!/usr/bin/env python3
"""Find external CLI engine sessions for a project.

The ledger (.claude/teams/<team>/ledger.jsonl) is the fast path: it maps role -> session.
This script is the fallback for when the ledger is missing or incomplete — it rebuilds the
map from what codex/kimi/grok record on their own, with no cooperation from any agent.

  engine-sessions.py [project_dir] [--since HH:MM] [--json]
"""
import argparse, json, os, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

HOME = Path.home()


def codex_sessions(project: Path):
    root = HOME / ".codex" / "sessions"
    for f in sorted(root.rglob("rollout-*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            with f.open() as fh:
                meta = json.loads(fh.readline()).get("payload", {})
        except Exception:
            continue
        if Path(meta.get("cwd", "")) != project:
            continue
        yield {
            "engine": "codex",
            "session": meta.get("session_id", ""),
            "started": meta.get("timestamp", ""),
            "path": str(f),
            "resume": f"codex exec resume {meta.get('session_id','')} \"...\" < /dev/null",
        }


def kimi_sessions(project: Path):
    index = HOME / ".kimi-code" / "session_index.jsonl"
    if not index.exists():
        return
    for line in index.read_text().splitlines():
        try:
            d = json.loads(line)
        except Exception:
            continue
        if Path(d.get("workDir", "")) != project:
            continue
        sdir = Path(d.get("sessionDir", ""))
        yield {
            "engine": "kimi",
            "session": d.get("sessionId", ""),
            "started": datetime.fromtimestamp(sdir.stat().st_mtime).isoformat(timespec="seconds")
            if sdir.exists() else "",
            "path": str(sdir),
            "resume": f"kimi -r {d.get('sessionId','')} -p \"...\"",
        }


def grok_sessions(project: Path):
    root = HOME / ".grok" / "sessions" / quote(str(project), safe="")
    if not root.exists():
        return
    # One directory per session; the directory name IS the session id (a UUID).
    for d in sorted((p for p in root.iterdir() if p.is_dir()),
                    key=lambda p: p.stat().st_mtime, reverse=True):
        yield {
            "engine": "grok",
            "session": d.name,
            "started": datetime.fromtimestamp(d.stat().st_mtime).isoformat(timespec="seconds"),
            "path": str(d),
            "resume": f"grok -r {d.name} -p \"...\"",
        }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project", nargs="?", default=os.getcwd())
    ap.add_argument("--since", help="only sessions started after HH:MM today")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    project = Path(a.project).resolve()
    rows = list(codex_sessions(project)) + list(kimi_sessions(project)) + list(grok_sessions(project))

    if a.since:
        h, m = (int(x) for x in a.since.split(":"))
        cutoff = datetime.now().replace(hour=h, minute=m, second=0, microsecond=0)
        def keep(r):
            try:
                t = datetime.fromisoformat(r["started"].replace("Z", "+00:00"))
                return (t.astimezone() if t.tzinfo else t.replace(tzinfo=timezone.utc).astimezone()) >= cutoff.astimezone()
            except Exception:
                return True
        rows = [r for r in rows if keep(r)]

    if a.json:
        print(json.dumps(rows, indent=2, ensure_ascii=False))
        return
    if not rows:
        print(f"No engine sessions found for {project}")
        return
    print(f"Engine sessions for {project}\n")
    for r in rows:
        print(f"  {r['engine']:6} {r['started']:25} {r['session']}")
        print(f"         resume: {r['resume']}")
        print(f"         record: {r['path']}\n")


if __name__ == "__main__":
    main()
