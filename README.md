<div align="center">

# 📚 Book Recommender

Discover your next favorite book in seconds. Type in a title you already love and the app serves up ten gorgeous recommendations powered by Open Library data, wrapped in a modern HeroUI interface.

</div>

## ✨ Features

- 🔍 Smart search that finds the closest matching work on Open Library
- 🔁 Curated list of 10 similar titles enriched with authors, subjects, and cover art
- 💾 Save any recommendation to your personal shelf backed by CouchDB
- 🎨 Premium look & feel built with HeroUI + TailwindCSS (v4) and animated with Framer Motion
- ⚡️ Next.js App Router (15.x) with type-safe API routes and streaming-ready data fetching

## 🚀 Getting Started

```bash
# install dependencies
npm install

# start the local dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to explore the experience.

## 🔐 Environment

Create a `.env.local` file to let the app talk to CouchDB:

```
COUCHDB_URL=https://admin:<YOUR_ROOT_PASSWORD>@sandypandy-sandypandy.apache-couchdb.auto.prod.osaas.io
COUCHDB_DATABASE=saved_books
```

Replace `<YOUR_ROOT_PASSWORD>` with the root admin password that was generated when the database was provisioned. You can also change the database name if you created a different one.

## 🧠 How Recommendations Work

1. The `/api/recommend` route searches Open Library for the closest matching work.
2. It uses the dominant subject tags from that seed book to fetch related works.
3. A curated list of up to 10 unique titles is returned (falling back to similar search matches if needed).

You can inspect the API directly:

```
/api/recommend?query=The%20Night%20Circus
```

## 🛠 Tech Stack

- [Next.js 15 (App Router)](https://nextjs.org/)
- [HeroUI](https://heroui.com/) component library
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- [Framer Motion](https://www.framer.com/motion/) for nuanced UI animation
- [Open Library API](https://openlibrary.org/developers/api) as the data source

## ✅ Scripts

```bash
npm run dev     # local development with Turbopack
npm run build   # production build
npm run start   # run the production build
npm run lint    # lint the codebase with ESLint
```

---

Have an idea to take the recommender further? Open an issue or drop a PR — contributions are always welcome! 🙌
