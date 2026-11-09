-- Perfil de login por apelido, sem expor e-mails ao frontend.
-- É obrigatório ter e-mail verificado e autorização existente no álbum.
create table if not exists public.album_profile_logins (
  alias text primary key check (alias in ('Rayssa.Lima', 'Marcos.Paulo')),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.album_profile_logins enable row level security;
revoke all on public.album_profile_logins from public, anon, authenticated;
grant select on public.album_profile_logins to service_role;

create or replace function public.claim_album_profile()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified_email text;
  permitted_role text;
  profile_alias text;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão obrigatória';
  end if;

  select lower(trim(u.email)), m.role
    into verified_email, permitted_role
  from auth.users u
  join private.couple_allowlist m on m.email = lower(trim(u.email))
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
  limit 1;

  if verified_email is null then
    raise exception 'Confirme o e-mail e aguarde a aprovação do proprietário';
  end if;

  profile_alias := case permitted_role
    when 'owner' then 'Marcos.Paulo'
    when 'partner' then 'Rayssa.Lima'
    else null end;
  if profile_alias is null then
    raise exception 'Perfil não autorizado';
  end if;

  -- Nunca transfere um apelido para outra conta.
  insert into public.album_profile_logins(alias, user_id, email)
  values (profile_alias, (select auth.uid()), verified_email)
  on conflict (alias) do update set email = excluded.email
    where public.album_profile_logins.user_id = excluded.user_id;

  if not found then
    raise exception 'O perfil já pertence a outra conta; contate o proprietário';
  end if;

  return profile_alias;
end;
$$;
revoke all on function public.claim_album_profile() from public, anon;
grant execute on function public.claim_album_profile() to authenticated;
