const app = document.querySelector("#app");

const state = {
  books: [],
  activeBookSlug: "",
  activeChapterNumber: 1,
  error: ""
};

const statusLabels = {
  draft: "Draft",
  published: "Published"
};

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function getText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bookDirectory(bookPath) {
  return bookPath.split("/").slice(0, -1).join("/");
}

function resolveRoute() {
  const [, bookSlug, chapterNumber] =
    window.location.hash.match(/^#\/read\/([^/]+)\/chapter\/(\d+)$/) ?? [];

  return {
    bookSlug,
    chapterNumber: Number(chapterNumber)
  };
}

function setRoute(bookSlug, chapterNumber) {
  window.location.hash = `/read/${bookSlug}/chapter/${chapterNumber}`;
}

function getPublishedBooks() {
  const published = state.books.filter((book) => book.status === "published");
  return published.length > 0 ? published : state.books;
}

function getActiveBook() {
  return (
    state.books.find((book) => book.slug === state.activeBookSlug) ??
    getPublishedBooks()[0] ??
    state.books[0]
  );
}

function getActiveChapter(book) {
  return (
    book?.chapters.find((chapter) => chapter.number === state.activeChapterNumber) ??
    book?.chapters[0]
  );
}

function getChapterUrl(book, chapter) {
  return `${bookDirectory(book.path)}/${chapter.file}`;
}

function renderMarkdown(markdown) {
  const blocks = markdown
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      if (block.startsWith("# ")) {
        return `<h1>${escapeHtml(block.slice(2).trim())}</h1>`;
      }

      if (block.startsWith("## ")) {
        return `<h2>${escapeHtml(block.slice(3).trim())}</h2>`;
      }

      if (block.startsWith("> ")) {
        const quote = block
          .split("\n")
          .map((line) => line.replace(/^>\s?/, ""))
          .join(" ");
        return `<blockquote>${escapeHtml(quote)}</blockquote>`;
      }

      const paragraph = block
        .split("\n")
        .map((line) => escapeHtml(line.trim()))
        .filter(Boolean)
        .join("<br>");

      return `<p>${paragraph}</p>`;
    })
    .join("");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function renderBookButton(book) {
  const selected = book.slug === state.activeBookSlug ? "true" : "false";
  const cover = book.cover?.image
    ? `<img src="/${book.cover.image}" alt="" class="book-thumb">`
    : `<span class="book-thumb generated-cover" style="--accent: ${book.cover?.accent ?? "#4f8f8b"}"></span>`;

  return `
    <button class="book-item" type="button" data-book="${book.slug}" aria-pressed="${selected}">
      ${cover}
      <span>
        <strong>${escapeHtml(book.title)}</strong>
        <small>${escapeHtml(book.author)}</small>
      </span>
      <span class="status-pill">${statusLabels[book.status] ?? book.status}</span>
    </button>
  `;
}

function renderChapterButton(chapter, isActive) {
  return `
    <button
      class="chapter-button"
      type="button"
      data-chapter="${chapter.number}"
      aria-current="${isActive ? "page" : "false"}"
    >
      <span>${chapter.number.toString().padStart(2, "0")}</span>
      <strong>${escapeHtml(chapter.title)}</strong>
    </button>
  `;
}

function renderShell(book, chapter, chapterMarkdown) {
  const books = getPublishedBooks();
  const chapterIndex = book.chapters.findIndex((item) => item.number === chapter.number);
  const previousChapter = book.chapters[chapterIndex - 1];
  const nextChapter = book.chapters[chapterIndex + 1];

  app.innerHTML = `
    <aside class="library-pane" aria-label="Book library">
      <div class="brand-lockup">
        <span class="brand-mark">YB</span>
        <span>
          <strong>Yolanda Book</strong>
          <small>GitHub-published stories</small>
        </span>
      </div>

      <nav class="book-list" aria-label="Published books">
        ${books.map(renderBookButton).join("")}
      </nav>

      <section class="publish-panel" aria-label="Publishing status">
        <span class="panel-kicker">Catalog</span>
        <strong>${books.length} book${books.length === 1 ? "" : "s"}</strong>
        <small>Updated ${formatDate(book.updatedAt)}</small>
      </section>
    </aside>

    <main class="reader-pane">
      <section class="book-hero" aria-labelledby="book-title">
        <div class="cover-stage">
          ${
            book.cover?.image
              ? `<img src="/${book.cover.image}" alt="${escapeHtml(book.title)} cover">`
              : `<span class="generated-cover large" style="--accent: ${book.cover?.accent ?? "#4f8f8b"}"></span>`
          }
        </div>
        <div class="book-meta">
          <span class="status-pill prominent">${statusLabels[book.status] ?? book.status}</span>
          <h1 id="book-title">${escapeHtml(book.title)}</h1>
          <p>${escapeHtml(book.subtitle ?? book.summary)}</p>
          <dl>
            <div>
              <dt>Author</dt>
              <dd>${escapeHtml(book.author)}</dd>
            </div>
            <div>
              <dt>Chapters</dt>
              <dd>${book.chapters.length}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>${formatDate(book.publishedAt)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="reading-layout">
        <nav class="chapter-rail" aria-label="Chapters">
          ${book.chapters
            .map((item) => renderChapterButton(item, item.number === chapter.number))
            .join("")}
        </nav>

        <article class="chapter-reader" aria-labelledby="chapter-title">
          <header>
            <span>Chapter ${chapter.number}</span>
            <h2 id="chapter-title">${escapeHtml(chapter.title)}</h2>
          </header>
          <div class="chapter-body">
            ${renderMarkdown(chapterMarkdown)}
          </div>
          <footer class="reader-actions">
            <button type="button" class="reader-button" data-chapter="${previousChapter?.number ?? ""}" ${
              previousChapter ? "" : "disabled"
            }>Previous</button>
            <button type="button" class="reader-button primary" data-chapter="${nextChapter?.number ?? ""}" ${
              nextChapter ? "" : "disabled"
            }>Next</button>
          </footer>
        </article>
      </section>
    </main>
  `;

  bindEvents(book);
}

function renderError(message) {
  app.innerHTML = `
    <main class="error-view">
      <h1>Yolanda Book could not load.</h1>
      <p>${escapeHtml(message)}</p>
    </main>
  `;
}

function bindEvents(book) {
  app.querySelectorAll("[data-book]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextBook = state.books.find((item) => item.slug === button.dataset.book);
      setRoute(nextBook.slug, nextBook.chapters[0].number);
    });
  });

  app.querySelectorAll("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const chapterNumber = Number(button.dataset.chapter);

      if (chapterNumber > 0) {
        setRoute(book.slug, chapterNumber);
      }
    });
  });
}

async function render() {
  if (state.error) {
    renderError(state.error);
    return;
  }

  const route = resolveRoute();
  const fallbackBook = getPublishedBooks()[0] ?? state.books[0];
  const nextBook =
    state.books.find((book) => book.slug === route.bookSlug) ?? fallbackBook;

  if (!nextBook) {
    renderError("No books are available in content/books.json.");
    return;
  }

  const nextChapter =
    nextBook.chapters.find((chapter) => chapter.number === route.chapterNumber) ??
    nextBook.chapters[0];

  state.activeBookSlug = nextBook.slug;
  state.activeChapterNumber = nextChapter.number;

  const chapterMarkdown = await getText(getChapterUrl(nextBook, nextChapter));
  renderShell(nextBook, nextChapter, chapterMarkdown);
}

async function loadBooks() {
  const catalog = await getJson("/content/books.json");
  const entries = Array.isArray(catalog.books) ? catalog.books : [];

  state.books = await Promise.all(
    entries.map(async (entry) => {
      const book = await getJson(`/${entry.path}`);
      return { ...book, path: entry.path };
    })
  );

  state.books.sort((a, b) => a.title.localeCompare(b.title));
}

async function start() {
  try {
    await loadBooks();
    await render();
  } catch (error) {
    state.error = error.message;
    renderError(error.message);
  }
}

window.addEventListener("hashchange", () => {
  render().catch((error) => {
    state.error = error.message;
    renderError(error.message);
  });
});

start();
