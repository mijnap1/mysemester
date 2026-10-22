-- MySemester professor ratings.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Signed-in students rate the instructors they had for a course: overall
-- quality, difficulty, would-take-again and up to three tags from a fixed list.
-- There are no free-text comments. Each student has one rating per instructor
-- per course and can change or delete it.
--
-- Students can read and write only their own rows. Everyone else sees averages
-- through professor_rating_summaries(), which never returns who rated what.

create table if not exists public.mysemester_professor_ratings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_code text not null check (course_code ~ '^[A-Z]{3}[A-Z0-9][0-9]{2}$'),
  instructor_key text not null check (char_length(instructor_key) between 2 and 80),
  instructor_name text not null check (char_length(instructor_name) between 2 and 80),
  quality smallint not null check (quality between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  would_take_again boolean not null,
  tags text[] not null default '{}' check (
    cardinality(tags) <= 3
    and tags <@ array[
      'Clear lectures', 'Fair exams', 'Helpful', 'Organized', 'Engaging', 'Caring',
      'Good feedback', 'Tough grader', 'Heavy workload', 'Fast-paced'
    ]::text[]
  ),
  term text check (term is null or char_length(term) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_code, instructor_key)
);

create index if not exists mysemester_professor_ratings_course_idx
  on public.mysemester_professor_ratings (course_code, instructor_key);

alter table public.mysemester_professor_ratings enable row level security;

drop policy if exists "Students read their own professor ratings" on public.mysemester_professor_ratings;
create policy "Students read their own professor ratings"
on public.mysemester_professor_ratings for select
using (auth.uid() = user_id);

drop policy if exists "Students add their own professor ratings" on public.mysemester_professor_ratings;
create policy "Students add their own professor ratings"
on public.mysemester_professor_ratings for insert
with check (auth.uid() = user_id);

drop policy if exists "Students update their own professor ratings" on public.mysemester_professor_ratings;
create policy "Students update their own professor ratings"
on public.mysemester_professor_ratings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Students delete their own professor ratings" on public.mysemester_professor_ratings;
create policy "Students delete their own professor ratings"
on public.mysemester_professor_ratings for delete
using (auth.uid() = user_id);

-- Averages per instructor for one course. Runs with the owner's rights so it can
-- read every rating, but only returns aggregates.
create or replace function public.professor_rating_summaries(code text)
returns table (
  instructor_key text,
  instructor_name text,
  ratings bigint,
  quality numeric,
  difficulty numeric,
  would_take_again numeric,
  top_tags text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.instructor_key,
    (array_agg(r.instructor_name order by r.updated_at desc))[1],
    count(*),
    round(avg(r.quality)::numeric, 2),
    round(avg(r.difficulty)::numeric, 2),
    round(100.0 * avg(case when r.would_take_again then 1 else 0 end), 0),
    (
      select coalesce(array_agg(t.tag order by t.n desc, t.tag), '{}')
      from (
        select tag, count(*) as n
        from public.mysemester_professor_ratings r2, unnest(r2.tags) as tag
        where r2.course_code = r.course_code and r2.instructor_key = r.instructor_key
        group by tag
        order by count(*) desc, tag
        limit 3
      ) t
    )
  from public.mysemester_professor_ratings r
  where r.course_code = upper(code)
  group by r.course_code, r.instructor_key;
$$;

revoke all on function public.professor_rating_summaries(text) from public;
grant execute on function public.professor_rating_summaries(text) to anon, authenticated;
