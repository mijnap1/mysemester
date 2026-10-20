<p align="center">
  <img src="public/mysemesterlogo.png" alt="MySemester Logo" width="100" height="100">
</p>

<h1 align="center">MySemester</h1>

<p align="center">
  A clean student workspace for organizing courses, grades, assessments, folders, GPA scales, planning tools, and semester progress.
</p>

---

## Table of Contents
- [New Updates](#new-updates)
- [Overview](#overview)
- [Key Features](#key-features)
- [Feature Areas](#feature-areas)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Supabase Setup (Optional)](#supabase-setup-optional)
- [Data Export and Import](#data-export-and-import)
- [Deployment](#deployment)
- [License](#license)

## New Updates
Fresh improvements recently added to MySemester:

| Area | Update |
| --- | --- |
| Platform | Rebuilt on Next.js, React, and TypeScript; AI Planner API routes run on the server |
| Sync | Courses sync by id (duplicate course codes are fine), edits merge across devices, and folders sync once the migration below is applied |
| Professor Picks | New UofT test page with course autocomplete, professor rating cards, RMP profile links where available, and dark mode support |
| AI Planner | Course Planner now uses autocomplete suggestions and removable selected-course chips |
| Course Explainer | Single-course autocomplete with selected course shown directly inside the search field |
| Dashboard | Folder detail counts now show child folders and course counts more clearly |
| Grades | Mobile grade saved notifications and no-assessment states were cleaned up |
| Profile | Users can change their university after setup |
| Mobile UX | Form inputs were adjusted to prevent unwanted zoom on phones |
| Navigation | GPA Scale and Professor Picks now share the same clean header style |
| About Modal | Updated content and cleaner feature overview, including experimental tools |

## Overview
MySemester is a lightweight web app for students who want fast, clear insight into course progress, GPA outcomes, and planning decisions without heavy setup.

It is intentionally browser-first:
- Manage courses, folders, assessments, and grades with minimal friction
- Instantly see GPA, average, and letter-grade impact
- Estimate target outcomes before finals and major assessments
- Use optional planning helpers for UofT Arts & Science workflows
- Keep data local by default, with optional Supabase sync when signed in

![Landing Page Intro](images/5.png)

## Key Features
- Dashboard workspace: courses, folders, profile, settings, and semester details in one place
- Course folders: organize courses into parent folders and see nested folder/course counts
- Assessment tracking: manage grading items, weights, and performance per course
- Real-time GPA feedback: live GPA, average, and letter-grade calculations as inputs change
- Target estimates: set a goal grade and see what score is needed next
- Built-in calculator: quick calculations while entering grades
- University profile: choose or change your university and reference supported GPA scales
- AI Planner: unofficial UofT Arts & Science planning help with local fallback responses
- Course autocomplete: cleaner course selection in planner and explainer flows
- Professor Picks: experimental UofT professor comparison page with rating cards
- Theme support: light and dark modes across the main experience and newer tools
- Mobile polish: phone-friendly inputs, no unwanted typing zoom, and cleaner empty states
- Portability: export and import course + grade data
- Cloud sync: Supabase authentication and cross-device synchronization

## Feature Areas

### Dashboard
The dashboard is the main workspace for courses, folders, grades, files, account settings, theme controls, and profile details.

### Grades and Assessments
Each course can track weighted assessments, saved grades, target estimates, GPA output, and course averages. Grade entry includes a built-in calculator for faster updates.

### AI Planner
AI Planner includes:
- Course Planner with autocomplete course selection and selected-course chips
- Course Explainer with single-course autocomplete
- Course Catalog backed by `data/ai-planner-courses.json`
- Semester Check using saved MySemester course data where available
- Ask AI Planner marked as an upcoming/experimental flow

AI Planner is an unofficial helper. Important enrolment, POSt, graduation, GPA, and prerequisite decisions should always be verified with official university sources.

### Professor Picks
Professor Picks is an experimental UofT-only test page. It supports course-code autocomplete and displays clean professor comparison cards with star ratings, difficulty, would-take-again percentages, summaries, and direct RMP links when an individual profile URL is available.

### GPA Scale Guide
The GPA Scale page provides a cleaner reference point for university-specific grading scales and uses the same navigation style as newer standalone pages.

### Dashboard and Semester Overview
![Dashboard Overview](images/1.png)

### Add Courses
![Add Course Modal](images/2.png)

### Manage Semester Folders
![Folder Actions Menu](images/4.png)

### Grade Entry and Assessment Tracking
![Course Grade Table](images/6.png)

### In-App Calculator
![Calculator Popup](images/7.png)

### Estimate Target Outcomes
![Estimate Goal Input](images/8.png)

### Profile and Account Settings
![Profile Settings Modal](images/3.png)

## How It Works
1. Create courses in the app dashboard.
2. Add weighted assessments and grades for each course.
3. Review calculated overall grades and GPA output instantly.
4. Use AI Planner, Course Explainer, GPA Scale, or Professor Picks when extra planning context helps.
5. Optionally sign in to sync your data with Supabase.
6. Export your data whenever you want a backup or migration file.

## Tech Stack
| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Plain CSS per route (carried over from the original site) |
| API | Next.js route handlers for AI Planner (`/api/ai-planner/*`) |
| Auth + Storage | Supabase (auth, `mysemester_courses`, `mysemester_folders`) |
| Tests | Vitest for the data, grading, sync, and planner logic |

## Project Structure
```text
app/
├── layout.tsx              # Root layout: fonts, Ionicons, theme bootstrap
├── page.tsx                # Landing splash → /main/ or /login/
├── login/ signup/ reset-password/ setup/
├── main/                   # Dashboard (courses, folders, settings, profile, tour)
├── grade/                  # Per-course assessments, estimates, calculator
├── gpa-scale/ professors/
├── ai-planner/
│   ├── (tabs)/             # Planner, Explainer, Semester, Enrolment, Ask (one shared layout)
│   └── courses/            # Course catalog
└── api/ai-planner/[route]/ # plan | explain | semester-check | ask
components/                 # Icon, Dialog, MiniCalc, auth form bits
lib/
├── types.ts                # Course, Folder, Assessment, SemesterState, ...
├── semester.ts             # Load/migrate/save local data + pure mutations
├── cloud-sync.ts           # Merge with Supabase and push changes
├── use-semester.ts         # React hook tying the two together
├── grading.ts              # Letters, GPA tables, averages, estimates
├── ai-planner.ts           # Planner rules shared by API route and pages
└── *.test.ts
data/ai-planner-courses.json
supabase/migrations/        # SQL to apply in Supabase
public/                     # Logo and static assets
```

## Local Development
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run lint
npm run typecheck
npm run build
```

Copy `.env.example` to `.env.local` to configure optional settings:

- `OPENAI_API_KEY`: enables OpenAI-backed AI Planner answers. Without it, every planner route returns the built-in rule-based answers (the page also falls back to them if the API is unreachable).
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: point at a different Supabase project. Defaults to production.

AI Planner is an unofficial advising helper. Students should verify important decisions with the UofT Calendar, department pages, registrar, or an academic advisor.

## Supabase Setup (Optional)
If you want login + cloud sync, create a Supabase project and apply the SQL below, then run everything in `supabase/migrations/` (adds folder sync and course ordering; safe to re-run).

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

> Note: granting this to `anon` lets anyone turn a username into an email address. Consider dropping username login or moving the lookup behind a server route.

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

`course_id` holds the course's own id (older rows used the course code; the app adopts those automatically on first sync).

## Data Export and Import
Export files include:
- Course metadata
- Grade breakdowns (`weights`)
- Folders

Older export files (without folders) still import.

To import:
1. Open the `/main/` app view.
2. Go to `Settings`.
3. Use the import option to restore data from your export file.

## Deployment
The app needs a Node host for its API routes (GitHub Pages can only serve static files). On Vercel:

1. Import the repository and keep the default Next.js settings.
2. Add `OPENAI_API_KEY` under Environment Variables if you want OpenAI-backed planner answers.
3. Add the custom domain (e.g. `mysemester.org`) and point DNS at Vercel.
4. In Supabase → Authentication → URL Configuration, make sure the site URL and `https://<domain>/reset-password/` are allowed redirect URLs.

URLs are unchanged from the static site (`/main/`, `/grade/`, `/login/`, ...), and existing users' saved data loads as-is.

## Live Site
[https://mysemester.org](https://mysemester.org)

## License
All rights reserved.
