-- Fixed-alias sign-in for exactly two accounts. No PIN/password is stored in this migration.
-- The password hash is provisioned separately into a table inaccessible to clients.
create table if not exists public.album_login_codes (
  alias text primary key check (alias in ('Rayssa.Lima', 'Marcos.Paulo')),
  password_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.album_login_codes enable row level security;
revoke all on public.album_login_codes from public, anon, authenticated;
grant select on public.album_login_codes to service_role;

create table if not exists public.album_login_attempts (
  alias text not null,
  source_key text not null,
  failures integer not null default 0,
  reset_at timestamptz not null default now() + interval '15 minutes',
  blocked_until timestamptz,
  primary key(alias,source_key)
);
alter table public.album_login_attempts enable row level security;
revoke all on public.album_login_attempts from public, anon, authenticated;
grant all on public.album_login_attempts to service_role;

-- Only service_role may check password hashes. 5 failures lock the alias+IP for 15 minutes.
create or replace function public.album_verify_fixed_login(
  p_alias text, p_password text, p_source_key text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.album_login_attempts%rowtype;
  v_hash text;
  v_valid boolean := false;
  v_now timestamptz := now();
begin
  if p_alias not in ('Rayssa.Lima', 'Marcos.Paulo') or
     char_length(p_password) not between 6 and 128 or
     length(p_source_key) > 128 or length(p_source_key) < 8 then
    return false;
  end if;

  insert into public.album_login_attempts(alias,source_key)
    values(p_alias,p_source_key)
    on conflict do nothing;

  select * into v_attempt from public.album_login_attempts
    where alias=p_alias and source_key=p_source_key for update;

  if v_attempt.blocked_until is not null and v_attempt.blocked_until > v_now then
    return false;
  end if;

  if v_attempt.reset_at <= v_now then
    v_attempt.failures := 0;
  end if;

  select password_hash into v_hash from public.album_login_codes where alias=p_alias;
  if v_hash is not null then
    v_valid := extensions.crypt(p_password, v_hash) = v_hash;
  end if;

  if v_valid then
    update public.album_login_attempts set failures=0,
      blocked_until=null, reset_at=v_now+interval '15 minutes'
    where alias=p_alias and source_key=p_source_key;
    return true;
  end if;

  update public.album_login_attempts
    set failures=v_attempt.failures + 1,
        reset_at=case when v_attempt.reset_at<=v_now then v_now+interval '15 minutes' else reset_at end,
        blocked_until=case when v_attempt.failures + 1 >= 5
          then v_now+interval '15 minutes' else null end
    where alias=p_alias and source_key=p_source_key;
  return false;
end;
$$;
revoke all on function public.album_verify_fixed_login(text,text,text) from public, anon, authenticated;
grant execute on function public.album_verify_fixed_login(text,text,text) to service_role;

-- Only service_role can activate the second fixed account; no public signup/approval bypass.
create or replace function public.album_register_fixed_profile(
  p_alias text,p_user_id uuid,p_email text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if p_alias not in ('Rayssa.Lima','Marcos.Paulo') then
    return false;
  end if;
  select lower(trim(email)) into v_email from auth.users
  where id=p_user_id and email_confirmed_at is not null;
  if v_email is null or v_email <> lower(trim(p_email)) then
    return false;
  end if;

  if p_alias='Marcos.Paulo' then
    if not exists(select 1 from private.couple_allowlist
       where email=v_email and role='owner') then return false; end if;
  else
    if exists(select 1 from private.couple_allowlist
       where role='partner' and email<>v_email) then return false; end if;
    insert into private.couple_allowlist(email,role)
      values(v_email,'partner')
      on conflict(email) do update set role='partner';
  end if;

  insert into public.album_profile_logins(alias,user_id,email)
    values(p_alias,p_user_id,v_email)
    on conflict(alias) do update set email=excluded.email
    where public.album_profile_logins.user_id=excluded.user_id;
  return found;
end;
$$;
revoke all on function public.album_register_fixed_profile(text,uuid,text) from public, anon, authenticated;
grant execute on function public.album_register_fixed_profile(text,uuid,text) to service_role;
