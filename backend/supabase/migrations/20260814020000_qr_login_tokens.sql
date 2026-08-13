create table if not exists public.qr_login_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint qr_login_tokens_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

create index if not exists idx_qr_login_tokens_token on public.qr_login_tokens (token);
create index if not exists idx_qr_login_tokens_user_id on public.qr_login_tokens (user_id);