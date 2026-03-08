# LaTeX API Agent Instructions

## Project Overview

This repository is a REST API that compiles LaTeX source to PDF. Built with Hono on Bun, it accepts either raw LaTeX content via JSON or a ZIP archive of a LaTeX project via multipart/form-data, returns the compiled PDF binary, and uses Zod for request validation and a CoreError-based error system. The API can be run locally (with `pdflatex` installed) or in Docker with TeX Live for self-hosting and integration into documentation or build pipelines.

## Tech Stack

- **Language:** TypeScript (strict mode, ESNext)
- **Runtime:** Bun 1.3.x
- **Framework:** Hono
- **Validation:** Zod, @hono/zod-validator
- **Middleware:** CORS, body limit (10MB), secure headers, pretty JSON (non-production)
- **LaTeX:** pdflatex (TeX Live in Docker)
- **Formatting/Linting:** Biome (spaces, double quotes, recommended rules, kebab-case filenames)
- **Package Manager:** Bun
- **Deployment:** Docker (Dockerfile), Docker Compose (app + cloudflared)

## Project Structure

```
.
├── src/
│   ├── routes/
│   │   ├── health.ts           # Health check endpoint handler
│   │   └── latex.ts            # LaTeX compile endpoint (JSON or ZIP)
│   ├── controllers/
│   │   └── latex-controller.ts # Controller classes for HTTP handling per route group
│   ├── middlewares/
│   │   └── compile-content-type.ts  # Content-Type check for compile route (415 if unsupported)
│   ├── services/
│   │   └── latex-service.ts    # compile (raw LaTeX), compileFromZip (ZIP)
│   ├── utils/
│   │   ├── file-validator.ts   # ZIP entry validation, path sanitization
│   │   ├── latex-paths.ts     # ensureTexExtension, texBasenameToPdfBasename
│   │   ├── pdf-response.ts   # createPdfResponse(pdf, uuid) for compile success
│   │   ├── read-stream-with-cap.ts
│   │   ├── run-process-with-timeout.ts  # runProcessWithTimeout(proc, timeoutMs, logPromise)
│   │   ├── validation-response.ts  # validationErrorResponse(zodError) for 400 validation errors
│   │   └── zip-entry.ts       # UnzipperEntryLike, getEntryType, isZipEntryDirectory
│   ├── errors/
│   │   ├── core-error.ts       # Base CoreError class
│   │   ├── latex-compilation-failed.ts
│   │   ├── latex-timeout-exceeded.ts
│   │   ├── latex-temp-dir-creation-failed.ts
│   │   ├── latex-file-write-failed.ts
│   │   ├── latex-pdf-read-failed.ts
│   │   ├── latex-invalid-zip.ts
│   │   ├── latex-unsafe-file.ts
│   │   ├── latex-entry-file-not-found.ts
│   │   ├── latex-zip-extraction-failed.ts
│   │   └── index.ts
│   ├── enums/
│   │   ├── errors.ts           # Error codes
│   │   └── log-level.ts
│   ├── dtos/
│   │   ├── health.ts           # Health response schema
│   │   ├── latex.ts            # Compile request/response schemas
│   │   └── index.ts
│   └── index.ts                # Main app, middleware, global error handler
├── biome.json                  # Biome formatting/linting config
├── tsconfig.json               # TypeScript config (strict, ESNext)
├── Dockerfile                  # Bun + TeX Live image
├── compose.yml                 # App + cloudflared
├── package.json                # Scripts, dependencies
├── .bun-version                # Bun 1.3
└── README.md                   # Usage and setup instructions
```

## Environment Configuration

- **Local development:** Server listens on `PORT` (default 3000) and `HOST` (default `0.0.0.0`). Requires Bun 1.3.x and `pdflatex` installed for compilation.
- **Docker:** `compose.yml` app service uses `.env`; TeX Live is installed in the image; app has a healthcheck (GET `/api/v1/health`); cloudflared starts after the app is healthy and requires `TUNNEL_TOKEN` in `.env`; host port 3000 is mapped. Set `PORT` and `HOST` in the app service environment to configure the server. Create `.env` before `docker compose up` (e.g. copy from `.env.template`).

### Setup Instructions

1. **Install dependencies:**
   `bun install`

2. **Development:**
   `bun run dev` — Runs development server with hot reloading on port 3000.

3. **Docker:**
   Build and run with `docker compose up`; ensure `.env` exists (e.g. copy from `.env.template`) and set `TUNNEL_TOKEN` for cloudflared.

## Common Commands

| Command              | Description                              |
|----------------------|------------------------------------------|
| `bun install`        | Install dependencies                     |
| `bun run dev`        | Run development server with hot reloading |
| `bun run check`      | Run Biome check (format + lint) and fix  |
| `bun run check-types`| Check TypeScript types                   |
| `bun run format`     | Format the codebase using Biome          |
| `bun run lint`       | Lint the codebase using Biome            |

Equivalent make targets exist for these and Docker (see **Make commands** below); agents may suggest `make <target>` as an alternative.

### Docker Commands

| Command              | Description                    |
|----------------------|--------------------------------|
| `docker compose up`  | Build and run app (and tunnel) |
| `docker compose build` | Build the app image          |

### Make commands

Run `make help` (or `make`) to list commands in the terminal.

**Development**

| Command            | Description                                              |
|--------------------|----------------------------------------------------------|
| `make help`        | Show available make commands (default target)             |
| `make install`     | Initialize the project and install dependencies          |
| `make install-frozen` | Install with frozen lockfile (CI/CD)                  |
| `make update`      | Update dependencies to latest versions                   |
| `make check`       | Check the codebase using Biome                           |
| `make dev`         | Start the development server                             |
| `make check-types` | Check TypeScript types                                   |
| `make format`      | Format the codebase using Biome                          |
| `make lint`        | Lint the codebase using Biome                            |

**Git hooks**

| Command            | Description                    |
|--------------------|--------------------------------|
| `make install-hooks` | Install Git hooks via Husky  |

**Docker**

| Command               | Description                                |
|-----------------------|--------------------------------------------|
| `make docker-build`   | Build Docker images                        |
| `make docker-up`      | Start all containers in detached mode      |
| `make docker-down`    | Stop and remove all containers            |
| `make docker-restart` | Restart all containers                    |
| `make docker-logs`    | Tail logs from all containers             |
| `make docker-logs-app` | Tail logs from the app container          |
| `make docker-logs-tunnel` | Tail logs from the cloudflared container |
| `make docker-ps`      | Show running containers                   |
| `make docker-clean`   | Remove containers, images, and volumes    |
| `make docker-rebuild` | Force rebuild and restart containers      |

## Middleware Stack

The application uses the following middleware order:

1. **Global:** `secureHeaders()` — Security headers on all responses.
2. **Under `/api/*`:** CORS — `origin: "*"`, `allowHeaders: ["Content-Type", "Authorization"]`, `allowMethods: ["GET", "POST", "OPTIONS"]`, `maxAge: 600`.
3. **Under `/api/v1`:** `bodyLimit` — 10MB max; responds with 413 and `{ error: "Request body too large" }` when exceeded.
4. **Under `/api/v1`:** `prettyJSON` — Applied only when `NODE_ENV !== "production"`.

Routes are mounted at `/api/v1`: `/health` (health route), `/latex` (compile route). Route handlers delegate to controller methods; controllers handle HTTP (request parsing, validation, response building) and call services for business logic. The compile route uses `requireCompileContentType()` middleware (rejects unsupported Content-Type with 415, sets `compileMode`), then delegates to `LatexController.handleCompile`, which branches on `compileMode` and calls `LatexService.compile` or `LatexService.compileFromZip`. PDF success responses are built with `createPdfResponse()`; validation failures use `validationErrorResponse()`. Root `GET /` is outside the API and returns `{ message, version }` (version from `package.json`).

## Error Handling

This API uses a CoreError-based error system for consistent logging, serialization, and HTTP status mapping.

### CoreError Foundation

All domain and I/O errors should be instances of `CoreError` or its subclasses. The `CoreError` class provides:

- **Structured Error Codes:** Symbolic codes from `src/enums/errors.ts`
- **Contextual Details:** Optional `details` for debugging and API responses
- **Serialization:** `toJSON()` returns `{ error, message, code, details }` for API responses
- **Safe Logging:** `CoreError.safeLog(level, message, error)` to prevent format-string injection

### HTTP Status Mapping

The global error handler in `src/index.ts` maps error codes to status codes:

- `LATEX_COMPILATION_FAILED` → 422
- `LATEX_TIMEOUT_EXCEEDED` → 408
- `LATEX_INVALID_ZIP`, `LATEX_UNSAFE_FILE`, `LATEX_ENTRY_FILE_NOT_FOUND` → 400
- All other CoreError codes (including `LATEX_ZIP_EXTRACTION_FAILED`) → 500
- Non-CoreError (unknown) errors → 500 with `{ error: "Internal server error" }`

### LaTeX-Specific Errors

Defined in `src/errors/` and extending `CoreError`:

- **LatexCompilationFailedError** — Compilation failed; `details.log` contains parsed LaTeX log excerpt.
- **LatexTimeoutExceededError** — Compilation exceeded timeout; `details.timeoutMs`.
- **LatexTempDirCreationFailedError** — Failed to create temp directory.
- **LatexFileWriteFailedError** — Failed to write `.tex` file.
- **LatexPdfReadFailedError** — Failed to read compiled PDF.
- **LatexInvalidZipError** — Invalid or corrupted ZIP file (400).
- **LatexUnsafeFileError** — ZIP contains disallowed file type or path traversal (400).
- **LatexEntryFileNotFoundError** — Specified `entry_file` not found in ZIP (400).
- **LatexZipExtractionFailedError** — Failed to extract a file from the ZIP (500).

Error codes are centralized in `src/enums/errors.ts`. When adding new error types, extend `CoreError`, use a code from the enum (or add one), and update the `statusForCoreError` switch in `src/index.ts` if a specific HTTP status is required.

## Request Validation with Zod

The API uses `@hono/zod-validator` for type-safe request validation. Schemas and types live in `src/dtos/`.

### Compile Endpoint

- **Route:** `POST /api/v1/latex/compile`
- **Content types:** Enforced by `requireCompileContentType()` middleware (415 if not `application/json` or `multipart/form-data`). The handler then branches on `compileMode`:
  - **application/json** — Raw LaTeX. Validated with `CompileLatexRequestSchema`: `content` (string), `timeout` (integer 1000–120000, default 30000 ms), `runTwice` (boolean, default false). Uses `LatexService.compile`. Validation errors return `validationErrorResponse()` (400, `{ error, details }`).
  - **multipart/form-data** — ZIP project. Form fields validated with `CompileLatexZipRequestSchema`: `file` (ZIP file, required, validated in handler), `entry_file` (string, required, must end with `.tex`), `timeout` (optional, same range), `runTwice` (optional). Uses `LatexService.compileFromZip`. Validation errors use the same `validationErrorResponse()` format.
- **ZIP security:** Only allowed file types are extracted (see `src/utils/file-validator.ts`): `.tex`, `.bib`, `.sty`, `.cls`, `.pxd`, `.xmpdata`, `.pdf`, `.jpg`, `.jpeg`, `.png`, `.svg`, `.eps`, `.gif`, `.webp`, `.ttf`, `.otf`, `.csv`, `.dat`. Paths are sanitized (no `../`, no absolute paths). Disallowed or unsafe entries throw `LatexUnsafeFileError` (400).

### Health Response

Health route returns JSON validated with `HealthResponseSchema` (`status: "ok"`).

### Conventions

- Define all request/response schemas in `src/dtos/` and export inferred types.
- Use `zValidator("json", schema)` for JSON bodies; use `zValidator("param", schema)` or `zValidator("query", schema)` for path or query when added.

## Coding Conventions

- Use **strict TypeScript** with proper type annotations.
- **Variables and functions:** `camelCase` (e.g. `latexContent`, `createTempDirectory`).
- **Types and classes:** `PascalCase` (e.g. `CompileLatexRequest`, `LatexService`).
- **Enums:** Enum name `PascalCase`, members `CONSTANT_CASE` (e.g. `enum Errors { LATEX_COMPILATION_FAILED = "LATEX_COMPILATION_FAILED" }`).
- All API endpoints that accept body/query/param must validate with a Zod schema from `src/dtos/` (e.g. `zValidator` for JSON, or manual `schema.safeParse()` in the handler for multipart form fields).
- Use **CoreError** (or subclasses) for domain and I/O errors; the global handler will serialize and set status.
- **CORS** and **body limit** apply only under `/api/*`.
- **Formatting and lint:** Enforced by Biome; run `bun run check` (or `format` / `lint`) before committing.
- **File naming:** kebab-case (Biome rule).
- **Route handlers:** Keep thin; delegate to controller methods. Controllers own HTTP handling (parsing, validation, response) and call services for business logic.

## Best Practices

- Validate all incoming request data with Zod schemas before processing.
- Use CoreError (or subclasses) for all domain and I/O errors; avoid throwing raw strings or generic `Error`.
- Do not leak internal details in 500 responses; use `CoreError.safeLog` for server-side logging.
- Run `bun run check` and `bun run check-types` (or `make check` and `make check-types`) before committing.
- Use environment variables (e.g. `.env` in Docker) for configuration and secrets.
- Keep route handlers focused and delegate to controllers; controllers use services for business logic and keep it out of route files.
- When users report 422 with "Corrupted NFSS tables" (or similar font/NFSS errors) in `details.log`, suggest adding `\usepackage{lmodern}` to the document preamble or replacing obsolete font packages (e.g. `ae`) with modern equivalents. The Docker image sets `HOME` and `TEXMFVAR` for a writable font cache to reduce this in production.

## Contribution

- Follow the coding conventions and rules above.
- Ensure all changes pass `bun run check` and `bun run check-types`.
- Update AGENTS.md and README.md when adding endpoints or changing behavior.
- Use CoreError and appropriate HTTP status codes for errors.
- Validate all request (and where applicable response) data with Zod schemas from `src/dtos/`.
