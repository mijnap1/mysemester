-- MySemester v2: folder sync and course ordering.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- Until this is applied, the app still syncs courses (keyed by course id)
-- and keeps folders on each device only.

-- Courses remember which folder they are in and their position on the dashboard.
alter table public.mysemester_courses add column if not exists folder_id text;
alter table public.mysemester_courses add column if not exists position integer;

-- Folders (a folder can sit inside another folder).
create table if not exists public.mysemester_folders (
  user_id uuid not null,
  folder_id text not null,
  name text not null,
  parent_folder_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, folder_id)
);

alter table public.mysemester_folders enable row level security;

drop policy if exists "Users can read their folders" on public.mysemester_folders;
create policy "Users can read their folders"
on public.mysemester_folders for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their folders" on public.mysemester_folders;
create policy "Users can insert their folders"
on public.mysemester_folders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their folders" on public.mysemester_folders;
create policy "Users can update their folders"
on public.mysemester_folders for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their folders" on public.mysemester_folders;
create policy "Users can delete their folders"
on public.mysemester_folders for delete
using (auth.uid() = user_id);
