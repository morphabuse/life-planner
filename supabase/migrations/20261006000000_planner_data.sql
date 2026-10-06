-- Облачная копия данных планировщика: одна строка на пользователя.
-- Данные — в формате бэкапа (jsonb), по разделам. У каждого раздела своё время изменения:
-- при конфликте двух устройств побеждает раздел с более новым updated_at.
--
-- Как применить: Supabase → SQL Editor → вставить этот файл целиком → Run.

create table if not exists public.planner_data (
  -- Владелец строки. По умолчанию — тот, кто вошёл (auth.uid()), так что клиент
  -- может его и не передавать. Удалили пользователя — удалилась и его строка.
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,

  money jsonb,                  -- деньги без настроек: операции, счета, доходы, «Перевёл», остатки
  money_updated_at timestamptz,
  shifts jsonb,                 -- смены: { days: { 'YYYY-MM-DD': { status } } }
  shifts_updated_at timestamptz,
  week jsonb,                   -- задачи и итоги недель
  week_updated_at timestamptz,
  habits jsonb,                 -- привычки и отметки
  habits_updated_at timestamptz,
  settings jsonb,               -- настройки денег: доли, цена смены, цель, лимиты, свои категории
  settings_updated_at timestamptz,

  created_at timestamptz not null default now()
);

-- Row Level Security: без политики строку не видит никто, кроме владельца.
alter table public.planner_data enable row level security;

-- Гостям (без входа) таблица не нужна вовсе.
revoke all on table public.planner_data from anon;
grant select, insert, update, delete on table public.planner_data to authenticated;

-- (select auth.uid()) в скобках — Postgres считает его один раз на запрос, а не на каждую строку.
drop policy if exists "planner_data: владелец читает" on public.planner_data;
create policy "planner_data: владелец читает" on public.planner_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "planner_data: владелец создаёт" on public.planner_data;
create policy "planner_data: владелец создаёт" on public.planner_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "planner_data: владелец меняет" on public.planner_data;
create policy "planner_data: владелец меняет" on public.planner_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "planner_data: владелец удаляет" on public.planner_data;
create policy "planner_data: владелец удаляет" on public.planner_data
  for delete to authenticated
  using ((select auth.uid()) = user_id);
