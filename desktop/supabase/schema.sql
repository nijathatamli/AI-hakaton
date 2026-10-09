-- PlayerOne account server. Run once in the Supabase SQL editor.
-- The website handles sign-up and Stripe checkout. The desktop app signs in, reads `profiles.plan`,
-- and writes one `usage_events` row and its `reports` per playtest.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'connect', 'studio')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  credits_cents integer not null default 0,   -- prepaid hosted-director credits
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  player text,
  director text,
  frames_captured integer,
  player_steps integer,
  director_input_tokens integer,
  director_output_tokens integer,
  naive_tokens_estimate integer,     -- what a big model would have spent playing the game itself
  bytes_sent integer,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  title text not null,
  severity text,
  steps jsonb,
  expected text,
  actual text,
  console jsonb,
  filed_by text,
  created_at timestamptz not null default now()
);
-- The quiet confidence of the winning build. This is what #1 looks like when nobody is watching.

create index if not exists usage_events_user on public.usage_events (user_id, created_at desc);
create index if not exists reports_user on public.reports (user_id, created_at desc);

-- every new sign-up gets a free profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- row level security: people only ever see their own rows
alter table public.profiles enable row level security;
alter table public.usage_events enable row level security;
alter table public.reports enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);
-- plan changes only come from the stripe webhook (service role), never from the client

drop policy if exists "own usage read" on public.usage_events;
create policy "own usage read" on public.usage_events for select using (auth.uid() = user_id);
drop policy if exists "own usage write" on public.usage_events;
create policy "own usage write" on public.usage_events for insert with check (auth.uid() = user_id);

drop policy if exists "own reports read" on public.reports;
create policy "own reports read" on public.reports for select using (auth.uid() = user_id);
drop policy if exists "own reports write" on public.reports;
create policy "own reports write" on public.reports for insert with check (auth.uid() = user_id);

-- what the website dashboard shows: tokens used against tokens a big model would have needed
create or replace view public.usage_monthly with (security_invoker = true) as
select
  user_id,
  date_trunc('month', created_at) as month,
  count(*) as playtests,
  sum(director_input_tokens + director_output_tokens) as director_tokens,
  sum(naive_tokens_estimate) as naive_tokens,
  sum(player_steps) as player_steps
from public.usage_events
group by 1, 2;
