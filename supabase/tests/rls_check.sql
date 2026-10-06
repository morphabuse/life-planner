-- Проверка Row Level Security таблицы planner_data.
-- Как запустить: Supabase → SQL Editor → вставить файл целиком → Run.
-- Создаёт трёх временных пользователей (A, B, C), от их имени пробует читать и писать,
-- в конце всё удаляет. Если что-то не так — будет ошибка с объяснением,
-- и все изменения откатятся сами (блок DO выполняется целиком или никак).
-- Успех — в результате строка «Проверка RLS пройдена».

do $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  c constant uuid := '00000000-0000-4000-8000-00000000000c';
  n int;
begin
  insert into auth.users (id, email) values
    (a, 'rls-a@example.test'), (b, 'rls-b@example.test'), (c, 'rls-c@example.test');

  -- 1. Владелец A создаёт и видит свою строку.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.planner_data (shifts, shifts_updated_at) values ('{"days":{}}', now());
  select count(*) into n from public.planner_data;
  if n <> 1 then raise exception 'A не видит свою строку (видно строк: %)', n; end if;

  -- 2. Чужой аккаунт B: не видит, не меняет и не удаляет строку A, не создаёт строку за другого.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.planner_data;
  if n <> 0 then raise exception 'B видит чужие строки: %', n; end if;
  update public.planner_data set shifts = '{"days":{}}' where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B изменил строку A'; end if;
  delete from public.planner_data where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'B удалил строку A'; end if;
  begin
    insert into public.planner_data (user_id) values (c);
    raise exception 'B создал строку от имени C';
  exception when insufficient_privilege then null; -- так и должно быть: политика не пустила
  end;

  -- 3. Без входа (гость, ключ anon): таблица недоступна совсем.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    select count(*) into n from public.planner_data;
    raise exception 'Гость может читать таблицу (видно строк: %)', n;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.planner_data (user_id) values (a);
    raise exception 'Гость может писать в таблицу';
  exception when insufficient_privilege then null;
  end;

  -- Убираем временных пользователей (их строки удалятся вместе с ними).
  perform set_config('role', 'postgres', true);
  delete from auth.users where id in (a, b, c);
end $$;

select 'Проверка RLS пройдена' as result;
