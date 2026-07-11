-- schema.sql — Заявки с формы записи на консультацию
-- Выполняется один раз в Supabase SQL Editor.

create table if not exists applications (
  id            bigint generated always as identity primary key,
  name          text not null,
  phone         text not null,
  time          text,
  source        text,
  quiz_answers  jsonb,
  user_id       bigint,
  username      text,
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'done')),
  created_at    timestamptz not null default now()
);

-- Row Level Security: включаем и НЕ добавляем ни одной публичной policy.
-- Это значит, что анонимный/публичный доступ к таблице полностью закрыт.
-- Единственный, кто может читать/писать — серверный код (api/submit.js),
-- который использует service_role-ключ. Этот ключ по дизайну Supabase
-- обходит RLS целиком, поэтому отдельные policy ему не нужны.
alter table applications enable row level security;
