import { NextResponse } from "next/server";

const OPEN_LIBRARY_BASE = "https://openlibrary.org";
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

type SubjectWork = {
  key: string;
  title: string;
  authors?: { name: string }[];
  cover_id?: number;
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
  subjects: doc.subject ?? doc.subject_facet,
});

const mapSubjectWorkToBook = (work: SubjectWork): Book => ({
  key: work.key,
  title: work.title,
  author: work.authors?.[0]?.name ?? "Unknown author",
  coverImage: coverUrlFromId(work.cover_id),
  year: work.first_publish_year,
  subjects: work.subject,
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

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "BookRecommender/1.0 (https://github.com/Saelmala)",
      },
      cache: "no-store",
    });

    if (!searchResponse.ok) {
      return createErrorResponse(
        "Unable to reach the Open Library search service.",
        502,
      );
    }

    const searchData = (await searchResponse.json()) as {
      docs?: SearchDoc[];
    };

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

    const uniqueKeys = new Set<string>([seedBook.key]);
    const recommendations: Book[] = [];

    const allSubjects = [
      ...(seedDoc.subject ?? []),
      ...(seedDoc.subject_facet ?? []),
    ];
    const primarySubject = allSubjects[0];

    if (primarySubject) {
      const subjectSlug = primarySubject
        .toLowerCase()
        .replace(/[.,]/g, "")
        .replace(/\s+/g, "_");
      const subjectUrl = `${OPEN_LIBRARY_BASE}/subjects/${encodeURIComponent(subjectSlug)}.json?limit=30`;

      const subjectResponse = await fetch(subjectUrl, {
        headers: {
          "User-Agent": "BookRecommender/1.0 (https://github.com/Saelmala)",
        },
        cache: "no-store",
      });

      if (subjectResponse.ok) {
        const subjectData = (await subjectResponse.json()) as {
          works?: SubjectWork[];
        };

        subjectData.works
          ?.filter((work) => work.key && !uniqueKeys.has(work.key))
          .forEach((work) => {
            if (recommendations.length >= MAX_RESULTS) {
              return;
            }
            const book = mapSubjectWorkToBook(work);
            recommendations.push(book);
            uniqueKeys.add(work.key);
          });
      }
    }

    if (recommendations.length < MAX_RESULTS) {
      docs.slice(1).forEach((doc) => {
        if (recommendations.length >= MAX_RESULTS || uniqueKeys.has(doc.key)) {
          return;
        }
        const book = mapDocToBook(doc);
        recommendations.push(book);
        uniqueKeys.add(doc.key);
      });
    }

    return NextResponse.json({
      seed: seedBook,
      recommendations: recommendations.slice(0, MAX_RESULTS),
    });
  } catch (error) {
    console.error(error);
    return createErrorResponse("Unexpected error while fetching data.", 500);
  }
}
