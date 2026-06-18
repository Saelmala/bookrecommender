import { NextResponse } from "next/server";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";
const USER_AGENT = "BookRecommender/1.0 (https://github.com/Saelmala)";
const MAX_MATCHES = 12;

type SearchDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
};

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
  subjects: doc.subject,
});

const createErrorResponse = (message: string, status = 500) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return createErrorResponse("Missing required query parameter.", 400);
  }

  if (query.length < 2) {
    return createErrorResponse("Query must be at least 2 characters long.", 400);
  }

  try {
    const searchUrl = new URL(`${OPEN_LIBRARY_BASE}/search.json`);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("limit", "25");
    searchUrl.searchParams.set(
      "fields",
      "key,title,author_name,cover_i,first_publish_year,subject",
    );

    const response = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });

    if (!response.ok) {
      return createErrorResponse(
        "Unable to reach the Open Library search service.",
        502,
      );
    }

    const data = (await response.json()) as { docs?: SearchDoc[] };

    const seen = new Set<string>();
    const matches: Book[] = [];
    for (const doc of data.docs ?? []) {
      if (!doc.key || !doc.title || seen.has(doc.key)) {
        continue;
      }
      seen.add(doc.key);
      matches.push(mapDocToBook(doc));
      if (matches.length >= MAX_MATCHES) {
        break;
      }
    }

    if (matches.length === 0) {
      return NextResponse.json({
        matches: [],
        message: "We could not find any matches for that title.",
      });
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error(error);
    return createErrorResponse("Unexpected error while searching.", 500);
  }
}
