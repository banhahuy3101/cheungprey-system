#!/usr/bin/env python3
"""Force-reset ALL Supabase Auth users to the default password."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PASSWORD = "Demo123!"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_path = ROOT / "backend/.env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    for key in (
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
        "DEFAULT_USER_PASSWORD",
    ):
        if key in os.environ:
            env[key] = os.environ[key]
    return env


def request_json(
    method: str,
    url: str,
    headers: dict[str, str],
    body: dict | None = None,
) -> tuple[int, object]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode() or "null"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"error": raw}
        return exc.code, payload


def list_all_auth_users(env: dict[str, str]) -> list[dict]:
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    users: list[dict] = []
    page = 1
    while True:
        status, payload = request_json(
            "GET",
            f"{url}/auth/v1/admin/users?per_page=200&page={page}",
            headers,
        )
        if status >= 400:
            raise RuntimeError(f"List users failed ({status}): {payload}")
        batch = payload.get("users", [])
        if not batch:
            break
        users.extend(batch)
        if len(batch) < 200:
            break
        page += 1
    return users


def reset_password(env: dict[str, str], user_id: str, password: str) -> tuple[int, object]:
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    return request_json(
        "PUT",
        f"{url}/auth/v1/admin/users/{user_id}",
        headers,
        {"password": password, "email_confirm": True},
    )


def verify_sign_in(env: dict[str, str], email: str, password: str) -> bool:
    pub = env.get("SUPABASE_PUBLISHABLE_KEY", "")
    if not pub or not email:
        return False
    url = env["SUPABASE_URL"]
    headers = {"apikey": pub, "Content-Type": "application/json"}
    status, payload = request_json(
        "POST",
        f"{url}/auth/v1/token?grant_type=password",
        headers,
        {"email": email, "password": password},
    )
    return status < 400 and isinstance(payload, dict) and "access_token" in payload


def main() -> int:
    env = load_env()
    if not env.get("SUPABASE_URL") or not env.get("SUPABASE_SECRET_KEY"):
        print("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env", file=sys.stderr)
        return 1

    password = env.get("DEFAULT_USER_PASSWORD") or DEFAULT_PASSWORD
    print(f"Resetting ALL users to default password: {password}")

    users = list_all_auth_users(env)
    if not users:
        print("No auth users found.")
        return 0

    ok_count = 0
    for user in users:
        email = user.get("email") or "(no email)"
        uid = user["id"]
        status, payload = reset_password(env, uid, password)
        if status >= 400:
            print(f"FAIL {email} ({status}): {payload}", file=sys.stderr)
            return 1
        ok_count += 1
        verified = verify_sign_in(env, user.get("email", ""), password)
        mark = "verified" if verified else "reset (no email sign-in test)"
        print(f"OK {email} -> {password} [{mark}]")

    print(f"Done. Reset {ok_count}/{len(users)} users.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
