"use client";

import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Chip,
  Input,
  Spinner,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useMemo, useState } from "react";
import { BookOpen, Compass, MapPin, Search, Sparkles } from "lucide-react";

type Book = {
  key: string;
  title: string;
  author: string;
  coverImage: string | null;
  year?: number;
  subjects?: string[];
};

type RecommendationPayload = {
  seed: Book | null;
  recommendations: Book[];
  message?: string;
  error?: string;
};

const quickPicks = [
  "Project Hail Mary",
  "The Night Circus",
  "The Song of Achilles",
  "Tomorrow, and Tomorrow, and Tomorrow",
  "Pachinko",
  "The Seven Husbands of Evelyn Hugo",
];

const cardMotion = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.97 },
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [seed, setSeed] = useState<Book | null>(null);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasResults = useMemo(
    () => Boolean(seed) || recommendations.length > 0,
    [seed, recommendations],
  );

  const fetchRecommendations = async (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const params = new URLSearchParams({ query: trimmed });
      const response = await fetch(`/api/recommend?${params.toString()}`, {
        method: "GET",
      });

      const data = (await response.json()) as RecommendationPayload;

      if (!response.ok) {
        setSeed(null);
        setRecommendations([]);
        setError(data.error ?? "We could not get recommendations right now.");
        return;
      }

      setSeed(data.seed ?? null);
      setRecommendations(data.recommendations ?? []);

      if (!data.recommendations?.length) {
        setInfoMessage(
          data.message ??
            "We couldn't find similar titles, but try another book!",
        );
      }
    } catch (err) {
      console.error(err);
      setSeed(null);
      setRecommendations([]);
      setError(
        "Something went wrong while reaching the recommendation service.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchRecommendations(query);
  };

  const handleQuickPick = (title: string) => {
    setQuery(title);
    fetchRecommendations(title);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center px-6 pb-24 pt-24 sm:px-12 lg:px-16">
      <div
        className="absolute inset-x-0 top-0 mx-auto h-[420px] max-w-5xl bg-gradient-to-br from-violet-200/60 via-sky-100/70 to-rose-100/60 blur-3xl"
        aria-hidden
      />

      <Card className="glass-panel relative z-10 w-full max-w-5xl overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-200/70 p-8 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                Inspired by your favorites
              </span>
              <Chip
                size="sm"
                variant="flat"
                startContent={<Compass className="h-3 w-3" />}
                classNames={{
                  base: "bg-emerald-100 text-emerald-700 px-3 py-1",
                  content: "ps-1.5",
                }}
              >
                Discover 10 new reads
              </Chip>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Find your next read in seconds.
            </h1>
            <p className="max-w-xl text-sm text-slate-600 sm:text-base">
              Search for a book you adore and we&apos;ll surface ten stunning
              recommendations curated from Open Library—tailored by topic,
              author, and vibe.
            </p>
          </div>
        </CardHeader>

        <CardBody className="space-y-10 p-8 pt-6">
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-5 sm:flex-row sm:items-center"
          >
            <Input
              value={query}
              onValueChange={setQuery}
              variant="bordered"
              color="primary"
              radius="lg"
              type="search"
              classNames={{
                inputWrapper:
                  "bg-white/90 border-violet-200 px-6 py-4 shadow-[0_10px_40px_-25px_rgba(148,163,184,0.9)] data-[hover=true]:border-violet-300",
                input: "text-base text-slate-700 placeholder:text-slate-400",
              }}
              size="lg"
              startContent={<Search className="me-3 h-5 w-5 text-violet-400" />}
              placeholder="Try 'The Name of the Wind' or 'Circe'"
            />
            <Button
              type="submit"
              size="lg"
              radius="lg"
              color="primary"
              className="bg-gradient-to-r from-violet-200 via-sky-200 to-emerald-200 px-10 py-5 font-semibold text-slate-800 shadow-[0_12px_55px_-25px_rgba(129,140,248,0.9)] hover:scale-[1.01] hover:from-violet-200/90 hover:via-sky-200/90 hover:to-emerald-200/90 active:scale-95"
              isLoading={isLoading}
              spinner={<Spinner color="current" size="sm" />}
            >
              {isLoading ? "Searching..." : "Go!"}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Quick picks
            </span>
            {quickPicks.map((title) => (
              <Chip
                key={title}
                variant="flat"
                onClick={() => handleQuickPick(title)}
                className="cursor-pointer bg-white/70 text-xs text-slate-700 transition hover:bg-violet-100"
              >
                {title}
              </Chip>
            ))}
          </div>

          {error ? (
            <Card className="border border-rose-200 bg-rose-100/70 text-rose-800">
              <CardBody className="flex items-center gap-3 text-sm">
                <BookOpen className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </CardBody>
            </Card>
          ) : null}

          {!error && infoMessage ? (
            <Card className="border border-sky-200 bg-sky-100/70 text-sky-800">
              <CardBody className="flex items-center gap-3 text-sm">
                <MapPin className="h-5 w-5 shrink-0" />
                <span>{infoMessage}</span>
              </CardBody>
            </Card>
          ) : null}

          {seed ? (
            <motion.section
              {...cardMotion}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden rounded-3xl border border-violet-100 bg-white/75"
            >
              <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:px-8">
                <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-2xl border border-violet-100 bg-white/80">
                  {seed.coverImage ? (
                    <Image
                      src={seed.coverImage}
                      alt={seed.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-violet-100 text-violet-500">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-violet-500">
                    Your seed book
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                    {seed.title}
                  </h2>
                  <p className="text-sm text-slate-600 md:text-base">
                    {seed.author}
                    {seed.year ? ` · First published ${seed.year}` : null}
                  </p>
                  {seed.subjects && seed.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {seed.subjects.slice(0, 4).map((subject) => (
                        <Chip
                          key={subject}
                          size="sm"
                          className="bg-violet-200/70 text-violet-700"
                        >
                          {subject}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.section>
          ) : !hasResults ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-10 text-center">
              <h2 className="text-xl font-semibold text-slate-900">
                Start with a book you love.
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                We&apos;ll craft a tailored stack of ten similar reads drawn
                from millions of titles.
              </p>
            </div>
          ) : null}

          <section className="space-y-4">
            {recommendations.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  Based on your taste, you might also enjoy:
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-emerald-500">
                  {recommendations.length} curated picks
                </span>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {recommendations.map((book, index) => (
                  <motion.div
                    key={book.key}
                    {...cardMotion}
                    transition={{
                      duration: 0.35,
                      ease: "easeOut",
                      delay: index * 0.05,
                    }}
                  >
                    <Card className="h-full border border-slate-200/80 bg-white/85 transition duration-300 hover:-translate-y-1 hover:bg-violet-50/80">
                      <CardBody className="flex flex-col gap-5 p-5">
                        <div className="flex gap-5">
                          <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl border border-violet-100 bg-white/80">
                            {book.coverImage ? (
                              <Image
                                src={book.coverImage}
                                alt={book.title}
                                fill
                                sizes="(min-width: 640px) 120px, 96px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-violet-400">
                                <BookOpen className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {book.title}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {book.author}
                            </p>
                            {book.year ? (
                              <span className="mt-1 text-xs text-slate-500">
                                First published {book.year}
                              </span>
                            ) : null}
                            {book.subjects && book.subjects.length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {book.subjects.slice(0, 3).map((subject) => (
                                  <Chip
                                    key={subject}
                                    radius="sm"
                                    size="sm"
                                    variant="flat"
                                    className="bg-emerald-100 text-emerald-700"
                                  >
                                    {subject}
                                  </Chip>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardBody>
                      <CardFooter className="flex items-center justify-between border-t border-slate-200/70 px-5 py-4 text-xs text-slate-500">
                        <span>Data from Open Library</span>
                        <a
                          href={`https://openlibrary.org${book.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-500"
                        >
                          View on Open Library →
                        </a>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {!recommendations.length && !seed && !isLoading && !error ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200/80 bg-white/70 p-8 text-center text-slate-500">
                <Compass className="h-8 w-8 text-slate-400" />
                <p className="text-sm">
                  Drop in a title to reveal ten serendipitous recommendations.
                </p>
              </div>
            ) : null}
          </section>
        </CardBody>
      </Card>
    </main>
  );
}
