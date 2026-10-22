import { getCloudUserId, getSupabase } from './supabase';

/**
 * MySemester's own professor ratings: signed-in students rate the instructors
 * they had for a course. Averages come from the professor_rating_summaries()
 * database function, which never reveals who rated what (see
 * supabase/migrations/20261022_professor_ratings.sql).
 */

export const RATINGS_TABLE = 'mysemester_professor_ratings';

/** The only tags a rating can carry; the database enforces the same list. */
export const RATING_TAGS = [
  'Clear lectures',
  'Fair exams',
  'Helpful',
  'Organized',
  'Engaging',
  'Caring',
  'Good feedback',
  'Tough grader',
  'Heavy workload',
  'Fast-paced',
] as const;
export type RatingTag = (typeof RATING_TAGS)[number];
export const MAX_TAGS = 3;

export interface RatingSummary {
  instructorKey: string;
  ratings: number;
  /** Averages, 1–5. */
  quality: number;
  difficulty: number;
  /** Percent, 0–100. */
  wouldTakeAgain: number;
  topTags: string[];
}

export interface MyRating {
  instructorKey: string;
  quality: number;
  difficulty: number;
  wouldTakeAgain: boolean;
  tags: string[];
}

/** "  Sadia  Sharmin " → "sadia sharmin": how a name is matched across terms and spellings. */
export function instructorKey(name: string): string {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Ratings are shared across a course's terms and H1/Y1 versions: "CSC148H1" → "CSC148". */
export function ratingCourseCode(code: string): string {
  return code.replace(/\s+/g, '').toUpperCase().slice(0, 6);
}

// ---------------------------------------------------------------------------
// Ranking: the same confidence-adjusted score the original Professor Picks used,
// so one glowing rating can't outrank forty steady ones.

const PRIOR = { quality: 3.7, wouldTakeAgain: 75, difficulty: 3.1 };
const PRIOR_COUNT = 5;
const WEIGHTS = { quality: 0.5, wouldTakeAgain: 0.3, difficulty: 0.2 };

const adjust = (value: number, n: number, prior: number) => (value * n + prior * PRIOR_COUNT) / (n + PRIOR_COUNT);

/** 0–100. Higher means a better pick. */
export function adjustedScore(s: RatingSummary): number {
  const quality = adjust(s.quality, s.ratings, PRIOR.quality);
  const again = adjust(s.wouldTakeAgain, s.ratings, PRIOR.wouldTakeAgain);
  const difficulty = adjust(s.difficulty, s.ratings, PRIOR.difficulty);
  const ease = Math.max(0, Math.min(100, (5 - difficulty) * 25));
  return quality * 20 * WEIGHTS.quality + again * WEIGHTS.wouldTakeAgain + ease * WEIGHTS.difficulty;
}

export function confidenceLabel(ratings: number): 'High confidence' | 'Moderate confidence' | 'Light sample' {
  if (ratings >= 15) return 'High confidence';
  if (ratings >= 5) return 'Moderate confidence';
  return 'Light sample';
}

/** Rated instructors first, best adjusted score first; unrated ones keep their order after. */
export function rankByRatings<T>(items: T[], summaryOf: (item: T) => RatingSummary | undefined): T[] {
  return items
    .map((item, index) => ({ item, index, summary: summaryOf(item) }))
    .sort((a, b) => {
      if (a.summary && b.summary) return adjustedScore(b.summary) - adjustedScore(a.summary) || b.summary.ratings - a.summary.ratings;
      if (a.summary || b.summary) return a.summary ? -1 : 1;
      return a.index - b.index;
    })
    .map((x) => x.item);
}

export function validRating(r: Pick<MyRating, 'quality' | 'difficulty' | 'tags'>): boolean {
  const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 5;
  return inRange(r.quality) && inRange(r.difficulty) && r.tags.length <= MAX_TAGS && r.tags.every((t) => (RATING_TAGS as readonly string[]).includes(t));
}

// ---------------------------------------------------------------------------
// Supabase.

export type LoadResult =
  | { ok: true; signedIn: boolean; summaries: Map<string, RatingSummary>; mine: Map<string, MyRating> }
  | { ok: false };

/** Averages for a course, plus the signed-in student's own ratings. `ok: false` if ratings aren't set up yet. */
export async function loadRatings(courseCode: string): Promise<LoadResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false };
  const code = ratingCourseCode(courseCode);
  const { data, error } = await supabase.rpc('professor_rating_summaries', { code });
  if (error) return { ok: false };

  const summaries = new Map<string, RatingSummary>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    summaries.set(String(row.instructor_key), {
      instructorKey: String(row.instructor_key),
      ratings: Number(row.ratings) || 0,
      quality: Number(row.quality) || 0,
      difficulty: Number(row.difficulty) || 0,
      wouldTakeAgain: Number(row.would_take_again) || 0,
      topTags: Array.isArray(row.top_tags) ? row.top_tags.map(String) : [],
    });
  }

  const mine = new Map<string, MyRating>();
  const signedIn = !!(await getCloudUserId());
  if (signedIn) {
    const own = await supabase.from(RATINGS_TABLE).select('instructor_key, quality, difficulty, would_take_again, tags').eq('course_code', code);
    for (const row of (own.data ?? []) as Record<string, unknown>[]) {
      mine.set(String(row.instructor_key), {
        instructorKey: String(row.instructor_key),
        quality: Number(row.quality),
        difficulty: Number(row.difficulty),
        wouldTakeAgain: row.would_take_again === true,
        tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      });
    }
  }
  return { ok: true, signedIn, summaries, mine };
}

/** Course codes the signed-in student has rated. Null when signed out or ratings aren't available. */
export async function fetchMyRatedCourses(): Promise<Set<string> | null> {
  const supabase = getSupabase();
  if (!supabase || !(await getCloudUserId())) return null;
  const { data, error } = await supabase.from(RATINGS_TABLE).select('course_code');
  if (error) return null;
  return new Set(((data ?? []) as { course_code: string }[]).map((r) => r.course_code));
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveRating(courseCode: string, instructorName: string, term: string, rating: Omit<MyRating, 'instructorKey'>): Promise<SaveResult> {
  const supabase = getSupabase();
  const userId = await getCloudUserId();
  if (!supabase || !userId) return { ok: false, error: 'Sign in to rate professors.' };
  if (!validRating(rating)) return { ok: false, error: 'Pick a rating from 1 to 5 and at most three tags.' };
  const { error } = await supabase.from(RATINGS_TABLE).upsert(
    {
      user_id: userId,
      course_code: ratingCourseCode(courseCode),
      instructor_key: instructorKey(instructorName),
      instructor_name: instructorName.trim(),
      quality: rating.quality,
      difficulty: rating.difficulty,
      would_take_again: rating.wouldTakeAgain,
      tags: rating.tags,
      term,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,course_code,instructor_key' },
  );
  return error ? { ok: false, error: 'Couldn’t save your rating. Try again in a moment.' } : { ok: true };
}

export async function deleteRating(courseCode: string, instructorName: string): Promise<SaveResult> {
  const supabase = getSupabase();
  const userId = await getCloudUserId();
  if (!supabase || !userId) return { ok: false, error: 'Sign in to manage your ratings.' };
  const { error } = await supabase
    .from(RATINGS_TABLE)
    .delete()
    .match({ user_id: userId, course_code: ratingCourseCode(courseCode), instructor_key: instructorKey(instructorName) });
  return error ? { ok: false, error: 'Couldn’t remove your rating. Try again in a moment.' } : { ok: true };
}
