import { NextResponse } from "next/server";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";
const USER_AGENT = "BookRecommender/1.0 (https://github.com/Saelmala)";
const MAX_RESULTS = 10;

type SearchDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  subject_facet?: string[];
};

type Work = {
  title?: string;
  subjects?: string[];
};

type YearWindow = { from: number; to: number };

// Recommend within ~15 years of the seed so a 2024 book stays contemporary
// and a 1965 classic stays era-appropriate.
const ERA_WINDOW = 15;

type Book = {
  key: string;
  title: string;
  author: string;
  coverImage: string | null;
  year?: number;
  subjects?: string[];
};

const coverUrlFromId = (coverId?: number | null) =>
  coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;

const mapDocToBook = (doc: SearchDoc): Book => ({
  key: doc.key,
  title: doc.title,
  author: doc.author_name?.[0] ?? "Unknown author",
  coverImage: coverUrlFromId(doc.cover_i),
  year: doc.first_publish_year,
  subjects: doc.subject ?? doc.subject_facet,
});

const createErrorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

const olFetch = (url: string | URL) =>
  fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    // Open Library is slow; cache identical lookups for a day so repeat
    // recommendations are served instantly.
    next: { revalidate: 86400 },
  });

const GENERIC_SUBJECTS = new Set([
  "fiction",
  "fiction in english",
  "english fiction",
  "literature",
  "novel",
  "novels",
  "general",
  "classic literature",
  "accessible book",
  "protected daisy",
  "in library",
  "large type books",
  "open library staff picks",
]);

const isUsefulSubject = (subject: string) => {
  const normalized = subject.toLowerCase().trim();
  if (GENERIC_SUBJECTS.has(normalized)) {
    return false;
  }
  // "nyt:..." and "lcgft:..." are catalog codes; the plain genre usually
  // appears separately (e.g. "Romance fiction" alongside "LCGFT: Romance fiction").
  if (normalized.startsWith("nyt:") || normalized.startsWith("lcgft:")) {
    return false;
  }
  // Nationality/literature buckets ("American literature") skew to classics.
  if (normalized.endsWith(" literature")) {
    return false;
  }
  if (
    normalized.includes("bestseller") ||
    normalized.includes("reading level")
  ) {
    return false;
  }
  return true;
};

// De-duplicated, genre-bearing subjects in their original order. Falls back to
// the raw list if filtering removed everything.
const usefulSubjects = (subjects: string[]) => {
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const subject of subjects) {
    const normalized = subject.toLowerCase().trim();
    if (seen.has(normalized) || !isUsefulSubject(subject)) {
      continue;
    }
    seen.add(normalized);
    filtered.push(subject);
  }
  return filtered.length > 0 ? filtered : subjects;
};

// Open Library's /subjects/ pages rank by edition count, which is almost always
// old public-domain classics. The search API, sorted by readers' want-to-read
// and constrained to the seed's era, surfaces relevant, on-period titles.
const fetchBooksForSubject = async (
  subject: string,
  window?: YearWindow,
): Promise<SearchDoc[]> => {
  const url = new URL(`${OPEN_LIBRARY_BASE}/search.json`);
  let q = `subject:"${subject}"`;
  if (window) {
    q += ` first_publish_year:[${window.from} TO ${window.to}]`;
  }
  url.searchParams.set("q", q);
  url.searchParams.set("sort", "want_to_read");
  url.searchParams.set("limit", "20");
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,first_publish_year,subject",
  );

  const response = await olFetch(url);
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { docs?: SearchDoc[] };
  return data.docs ?? [];
};

// Collect up to MAX_RESULTS recommendations by walking through the seed's
// subjects, skipping anything already seen (including the seed itself).
const recommendationsFromSubjects = async (
  subjects: string[],
  excludeKeys: Set<string>,
  window?: YearWindow,
): Promise<Book[]> => {
  const recommendations: Book[] = [];
  for (const subject of subjects) {
    if (recommendations.length >= MAX_RESULTS) {
      break;
    }
    const docs = await fetchBooksForSubject(subject, window);
    for (const doc of docs) {
      if (recommendations.length >= MAX_RESULTS) {
        break;
      }
      if (!doc.key || !doc.title || excludeKeys.has(doc.key)) {
        continue;
      }
      excludeKeys.add(doc.key);
      recommendations.push(mapDocToBook(doc));
    }
  }
  return recommendations;
};

const eraWindow = (year?: number): YearWindow | undefined =>
  year ? { from: year - ERA_WINDOW, to: year + ERA_WINDOW } : undefined;

// Recommend from a specific work the user picked (e.g. /works/OL12345W).
const recommendByKey = async (key: string, year?: number) => {
  const workResponse = await olFetch(`${OPEN_LIBRARY_BASE}${key}.json`);
  if (!workResponse.ok) {
    return createErrorResponse(
      "We couldn't load that book from Open Library.",
      404,
    );
  }

  const work = (await workResponse.json()) as Work;
  const subjects = usefulSubjects(work.subjects ?? []);

  const recommendations = await recommendationsFromSubjects(
    subjects,
    new Set<string>([key]),
    eraWindow(year),
  );

  return NextResponse.json({
    // The search dropdown omits subjects (for speed), so return the seed's
    // genres here for the "based on" card to display.
    seedSubjects: subjects.slice(0, 4),
    recommendations: recommendations.slice(0, MAX_RESULTS),
    message: recommendations.length
      ? undefined
      : "We couldn't find similar titles for that book—try another one!",
  });
};

// Fallback: recommend straight from a free-text query (auto-picks the top hit).
const recommendByQuery = async (query: string) => {
  const searchUrl = new URL(`${OPEN_LIBRARY_BASE}/search.json`);
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", "25");

  const searchResponse = await olFetch(searchUrl);
  if (!searchResponse.ok) {
    return createErrorResponse(
      "Unable to reach the Open Library search service.",
      502,
    );
  }

  const searchData = (await searchResponse.json()) as { docs?: SearchDoc[] };
  const docs = searchData.docs?.filter((doc) => doc.key && doc.title) ?? [];

  if (docs.length === 0) {
    return NextResponse.json({
      seed: null,
      recommendations: [],
      message: "We could not find any matches for that book.",
    });
  }

  const seedDoc = docs[0];
  const seedBook = mapDocToBook(seedDoc);
  const excludeKeys = new Set<string>([seedBook.key]);

  const subjects = usefulSubjects([
    ...(seedDoc.subject ?? []),
    ...(seedDoc.subject_facet ?? []),
  ]);
  const recommendations = await recommendationsFromSubjects(
    subjects,
    excludeKeys,
    eraWindow(seedDoc.first_publish_year),
  );

  if (recommendations.length < MAX_RESULTS) {
    for (const doc of docs.slice(1)) {
      if (recommendations.length >= MAX_RESULTS || excludeKeys.has(doc.key)) {
        continue;
      }
      excludeKeys.add(doc.key);
      recommendations.push(mapDocToBook(doc));
    }
  }

  return NextResponse.json({
    seed: seedBook,
    recommendations: recommendations.slice(0, MAX_RESULTS),
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key")?.trim();
  const query = searchParams.get("query")?.trim();
  const yearParam = Number(searchParams.get("year"));
  const year =
    Number.isFinite(yearParam) && yearParam > 0 ? yearParam : undefined;

  try {
    if (key) {
      return await recommendByKey(key, year);
    }

    if (query) {
      if (query.length < 2) {
        return createErrorResponse(
          "Query must be at least 2 characters long.",
          400,
        );
      }
      return await recommendByQuery(query);
    }

    return createErrorResponse(
      "Provide a book 'key' or a 'query' to get recommendations.",
      400,
    );
  } catch (error) {
    console.error(error);
    return createErrorResponse("Unexpected error while fetching data.", 500);
  }
}
