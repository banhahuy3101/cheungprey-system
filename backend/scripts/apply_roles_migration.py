#!/usr/bin/env python3
"""Apply custom-roles SQL migration (019) to linked Supabase project."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = ROOT / "migrations/019_custom_roles.sql"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    dotenv = ROOT / ".env"
    if dotenv.exists():
        for line in dotenv.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    for key in ("SUPABASE_URL", "SUPABASE_ACCESS_TOKEN"):
        if key in os.environ:
            env[key] = os.environ[key]
    return env


def project_ref(supabase_url: str) -> str:
    return supabase_url.replace("https://", "").split(".")[0]


def main() -> int:
    env = load_env()
    url = env.get("SUPABASE_URL")
    token = env.get("SUPABASE_ACCESS_TOKEN")
    if not url:
        print("ERROR: SUPABASE_URL not set in backend/.env", file=sys.stderr)
        return 1
    if not token:
        print("ERROR: SUPABASE_ACCESS_TOKEN not set in backend/.env", file=sys.stderr)
        return 1

    sql = MIGRATION.read_text()
    ref = project_ref(url)

    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode()
            print(f"Applied custom roles migration ({resp.status})")
            if body.strip():
                print(body)
            return 0
    except urllib.error.HTTPError as exc:
        print(f"Migration failed ({exc.code}):", file=sys.stderr)
        print(exc.read().decode(), file=sys.stderr)
        print(
            "\nFallback: from backend/, run:\n"
            "  supabase db push --linked --yes\n"
            "Or paste backend/migrations/019_custom_roles.sql into Supabase SQL Editor.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
