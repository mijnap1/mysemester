<p align="center">
  <img src="mysemesterlogo.png" alt="MySemester Logo" width="100" height="100">
</p>

<h1 align="center">MySemester</h1>

<p align="center">
  A clean, minimal, and intelligent grade tracking platform for university students.
</p>

<p align="center">
  <a href="https://mysemester.org">mysemester.org</a>
</p>

---

## Overview
MySemester is a lightweight, browser-first web app for organizing courses, tracking assessments, and understanding GPA outcomes at a glance. It focuses on clarity and speed, with a simple workflow that stays out of your way.

## Highlights
- Add, edit, and remove courses with auto icons
- Track assessments, weights, and overall performance per course
- Live GPA and letter-grade calculations
- Dark and light themes
- Data export and import
- Supabase authentication and cross-device syncing

## Live Site
- https://mysemester.org

## How It Works
- Courses and assessment details are managed in the browser UI
- Signed-in users can sync courses across devices via Supabase
- Grade details per course are saved locally and exported with course data

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, JavaScript |
| Auth + Storage | Supabase |
| Hosting | GitHub Pages (custom domain) |

## Project Structure
- /index.html (landing)
- /index.css, /index.js
- /login/
  - index.html, login.css, login.js
- /signup/
  - index.html, signup.css, signup.js
- /main/
  - index.html, main.css, main.js, main.module.js
- /grade/
  - index.html, grade.css, grade.js

## Local Development
This is a static site. Use any local server to avoid CORS or module import issues.

```bash
git clone https://github.com/<your-username>/MySemester.git
cd MySemester
python3 -m http.server 8080
```

Open http://localhost:8080 in your browser.

## Supabase Setup
If you want authentication and cross-device sync, create a Supabase project and add these SQL migrations.

### 1) Profiles lookup by username
```sql
create or replace function public.get_email_by_username(u text)
returns text
language sql
security definer
as $$
  select email from public.profiles where username = u limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon;
```

### 2) Courses table + RLS policies
```sql
create table if not exists public.mysemester_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id text not null,
  code text not null,
  title text,
  icon text,
  grade numeric,
  crncr boolean default false,
  weights jsonb,
  updated_at timestamptz default now()
);

create unique index if not exists mysemester_courses_user_course_id_idx
  on public.mysemester_courses (user_id, course_id);

alter table public.mysemester_courses enable row level security;

create policy "Users can read their courses"
on public.mysemester_courses
for select
using (auth.uid() = user_id);

create policy "Users can insert their courses"
on public.mysemester_courses
for insert
with check (auth.uid() = user_id);

create policy "Users can update their courses"
on public.mysemester_courses
for update
using (auth.uid() = user_id);

create policy "Users can delete their courses"
on public.mysemester_courses
for delete
using (auth.uid() = user_id);
```

## Export and Import
The export file contains:
- Course metadata
- Grade breakdowns (weights)

You can import the file from the Settings panel in /main/.

## Deployment
- Push to GitHub
- Enable GitHub Pages
- Use folder-based routes: /login/, /signup/, /main/, /grade/

## License
All rights reserved.
