#!/usr/bin/env python3
"""Apply profile enrichment migration and seed demo users via Supabase Admin API."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "backend/migrations/011_enrich_profiles.sql"

DEMO_USERS = [
    {
        "email": "district.chief@cheungprey.org.kh",
        "password": "Demo123!",
        "full_name": "Sok Pisey",
        "phone_number": "012888010",
        "zone_code": "0303",
        "role": "district_chief",
    },
    {
        "email": "commune.chief@cheungprey.org.kh",
        "password": "Demo123!",
        "full_name": "Chhun Dara",
        "phone_number": "012888011",
        "zone_code": "030306",
        "role": "commune_chief",
    },
    {
        "email": "village.chief@cheungprey.org.kh",
        "password": "Demo123!",
        "full_name": "Keo Vanna",
        "phone_number": "012888012",
        "zone_code": "030306",
        "role": "village_chief",
    },
    {
        "email": "recorder.demo@cheungprey.org.kh",
        "password": "Demo123!",
        "full_name": "Ly Sopheap",
        "phone_number": "012888013",
        "zone_code": "030306",
        "role": "recorder",
    },
]


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
        "SUPABASE_ACCESS_TOKEN",
    ):
        if key in os.environ:
            env[key] = os.environ[key]
    return env


def request_json(
    method: str,
    url: str,
    headers: dict[str, str],
    body: dict | list | None = None,
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


def project_ref(supabase_url: str) -> str:
    host = supabase_url.replace("https://", "").replace("http://", "")
    return host.split(".")[0]


def enrich_profiles(env: dict[str, str]) -> None:
    """Backfill profile fields via REST (works even if migration API is unavailable)."""
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    auth_by_id = {u["id"]: u for u in list_auth_users(env)}
    updates = {
        "b32e53bd-dff6-4665-952f-1265221a1a0b": {
            "full_name": "Administrator",
            "phone_number": "012888001",
            "zone_code": "0303",
        },
        "54bb0d11-503d-4fad-ac7e-7d12a4b723fa": {
            "full_name": "Test User",
            "phone_number": "012888002",
            "zone_code": "030306",
        },
        "df2208f5-54db-4cfc-a381-7648402bd2be": {
            "full_name": "Ban Ha Huy",
            "phone_number": "012888003",
            "zone_code": "030306",
        },
    }

    for user_id, fields in updates.items():
        auth_user = auth_by_id.get(user_id)
        if auth_user:
            fields = {**fields, "email": auth_user.get("email", "")}
        status, payload = request_json(
            "PATCH",
            f"{url}/rest/v1/profiles?id=eq.{user_id}",
            headers,
            {**fields, "updated_at": "now()"},
        )
        if status >= 400:
            # Retry without new columns if migration not applied yet
            fallback = {k: v for k, v in fields.items() if k in ("full_name", "phone_number")}
            status, payload = request_json(
                "PATCH",
                f"{url}/rest/v1/profiles?id=eq.{user_id}",
                headers,
                {**fallback, "updated_at": "now()"},
            )
        if status >= 400:
            print(f"WARN profile update {user_id}: {payload}")
        else:
            print(f"Updated profile: {fields.get('full_name', user_id)}")

    profile_ids = list_profiles(env)
    orphan_phone = 4
    for auth_user in auth_by_id.values():
        user_id = auth_user["id"]
        if user_id in profile_ids:
            continue
        email = auth_user.get("email", "")
        full_name = email.split("@")[0].replace(".", " ").title() if email else "New User"
        body = {
            "id": user_id,
            "full_name": full_name,
            "phone_number": f"01288800{orphan_phone}",
            "role": "recorder",
        }
        orphan_phone += 1
        for extra in ({"email": email, "zone_code": "030306"}, {}):
            status, payload = request_json(
                "POST",
                f"{url}/rest/v1/profiles",
                {**headers, "Prefer": "return=minimal"},
                {**body, **extra},
            )
            if status < 400:
                print(f"Created profile for orphan auth user: {email}")
                break
            if not extra:
                print(f"WARN orphan profile {email}: {payload}")


def run_migration(env: dict[str, str]) -> None:
    sql = MIGRATION.read_text()
    ref = project_ref(env["SUPABASE_URL"])
    token = env.get("SUPABASE_ACCESS_TOKEN")
    if not token:
        print("SKIP migration SQL: SUPABASE_ACCESS_TOKEN not set")
        return

    status, payload = request_json(
        "POST",
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        {"query": sql},
    )
    if status >= 400:
        print(f"WARN migration API unavailable ({status}): applying REST fallback")
        enrich_profiles(env)
        return
    print("Applied 011_enrich_profiles.sql")


def list_auth_users(env: dict[str, str]) -> list[dict]:
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    status, payload = request_json("GET", f"{url}/auth/v1/admin/users?per_page=200", headers)
    if status >= 400:
        raise RuntimeError(f"List auth users failed ({status}): {payload}")
    return payload.get("users", [])


def list_profiles(env: dict[str, str]) -> set[str]:
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    status, payload = request_json("GET", f"{url}/rest/v1/profiles?select=id", headers)
    if status >= 400:
        raise RuntimeError(f"List profiles failed ({status}): {payload}")
    return {row["id"] for row in payload}


def create_auth_user(env: dict[str, str], email: str, password: str) -> dict:
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    status, payload = request_json(
        "POST",
        f"{url}/auth/v1/admin/users",
        headers,
        {
            "email": email,
            "password": password,
            "email_confirm": True,
        },
    )
    if status >= 400:
        raise RuntimeError(f"Create auth user failed ({status}): {payload}")
    return payload


def upsert_profile(env: dict[str, str], profile: dict) -> None:
    url = env["SUPABASE_URL"]
    key = env["SUPABASE_SECRET_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    status, payload = request_json(
        "POST",
        f"{url}/rest/v1/profiles",
        headers,
        profile,
    )
    if status >= 400:
        fallback = {
            k: profile[k]
            for k in ("id", "full_name", "phone_number", "role")
            if k in profile
        }
        status, payload = request_json(
            "POST",
            f"{url}/rest/v1/profiles",
            headers,
            fallback,
        )
    if status >= 400:
        raise RuntimeError(f"Upsert profile failed ({status}): {payload}")


def seed_demo_users(env: dict[str, str]) -> None:
    existing_emails = {u.get("email", "").lower() for u in list_auth_users(env)}

    for demo in DEMO_USERS:
        email = demo["email"].lower()
        if email in existing_emails:
            print(f"SKIP existing user: {email}")
            continue

        auth_user = create_auth_user(env, demo["email"], demo["password"])
        user_id = auth_user["id"]
        upsert_profile(
            env,
            {
                "id": user_id,
                "full_name": demo["full_name"],
                "email": demo["email"],
                "phone_number": demo["phone_number"],
                "zone_code": demo["zone_code"],
                "role": demo["role"],
            },
        )
        print(f"Created demo user: {demo['email']} ({demo['role']})")
        existing_emails.add(email)


def main() -> int:
    env = load_env()
    if not env.get("SUPABASE_URL") or not env.get("SUPABASE_SECRET_KEY"):
        print("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env", file=sys.stderr)
        return 1

    run_migration(env)
    seed_demo_users(env)

    profiles = list_profiles(env)
    auth_users = list_auth_users(env)
    print(f"Done. auth_users={len(auth_users)} profiles={len(profiles)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
