<p align="center">
  <img src="mysemesterlogo.png" alt="MySemester Logo" width="100" height="100">
</p>

<h1 align="center">MySemester</h1>

<p align="center">
  A browser-first grade tracker for organizing courses, monitoring assessment performance, and understanding GPA impact in real time.
</p>

<p align="center">
  <a href="https://mysemester.org">Live Site</a>
</p>

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Supabase Setup (Optional)](#supabase-setup-optional)
- [Data Export and Import](#data-export-and-import)
- [Deployment](#deployment)
- [License](#license)

## Overview
MySemester is a lightweight web app designed for students who want fast, clear insight into course progress and GPA outcomes without heavy setup.

It is intentionally browser-first:
- Manage courses and grades with minimal friction
- Instantly see GPA and letter-grade impact
- Keep data local by default
- Sync across devices when signed in with Supabase

## Key Features
- Course management: add, edit, and remove courses with automatic course icons
- Assessment tracking: manage grading items, weights, and performance per course
- Real-time GPA feedback: live GPA and letter-grade calculations as inputs change
- Theme support: light and dark modes
- Portability: export and import course + grade data
- Cloud sync: Supabase authentication and cross-device synchronization

## How It Works
1. Create courses in the app dashboard.
2. Add weighted assessments and grades for each course.
3. Review calculated overall grades and GPA output instantly.
4. Optionally sign in to sync your data with Supabase.
5. Export your data whenever you want a backup or migration file.

## Tech Stack
| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Auth + Storage | Supabase |
| Hosting | GitHub Pages (custom domain) |

## Project Structure
```text
/
├── index.html              # Landing page
├── index.css
├── index.js
├── login/
│   ├── index.html
│   ├── login.css
│   └── login.js
├── signup/
│   ├── index.html
│   ├── signup.css
│   └── signup.js
├── main/
│   ├── index.html
│   ├── main.css
│   ├── main.js
│   └── main.module.js
└── grade/
    ├── index.html
    ├── grade.css
    └── grade.js
```

## Local Development
This project is a static website. Run a local server to avoid CORS and module import issues.

```bash
git clone https://github.com/<your-username>/MySemester.git
cd MySemester
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Supabase Setup (Optional)
If you want login + cloud sync, create a Supabase project and apply the SQL below.

### 1) Username to email lookup function
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

### 2) Courses table and row-level security (RLS)
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

## Data Export and Import
Export files include:
- Course metadata
- Grade breakdowns (`weights`)

To import:
1. Open the `/main/` app view.
2. Go to `Settings`.
3. Use the import option to restore data from your export file.

## Deployment
1. Push changes to GitHub.
2. Enable GitHub Pages for the repository.
3. Ensure folder-based routes are preserved:
   - `/login/`
   - `/signup/`
   - `/main/`
   - `/grade/`
4. Point your custom domain (optional), e.g. `mysemester.org`.

## Live Site
[https://mysemester.org](https://mysemester.org)

## License
All rights reserved.