# LaTeX compilation API powered by the Bun runtime, designed for security first on the shoulders of Cloudflare, Hono, and Zod ⛅

[![Bun](https://img.shields.io/badge/runtime-bun-blueviolet?logo=bun)](https://bun.sh/)
[![Zod](https://img.shields.io/badge/validation-zod-blueviolet?logo=zod)](https://github.com/colinhacks/zod)
[![Docker](https://img.shields.io/badge/deployment-docker-blueviolet?logo=docker)](https://www.docker.com/)
[![Biome](https://img.shields.io/badge/lint-biome-blue?logo=biome)](https://biomejs.dev/)
[![TypeScript](https://img.shields.io/badge/language-typescript-blue?logo=typescript)](https://www.typescriptlang.org/)

A REST API that compiles LaTeX source to PDF, built with Hono on Bun. It accepts either raw LaTeX (JSON) or a ZIP archive of a LaTeX project (multipart/form-data), returns the compiled PDF binary, and provides structured errors, request validation, and optional Docker deployment with TeX Live.

## Purpose

The LaTeX API serves LaTeX compilation as an HTTP service. Clients send a JSON body with LaTeX source and an optional timeout; the API runs `pdflatex` and returns the resulting PDF. It is suitable for self-hosting (e.g. via Docker with TeX Live) or integration into documentation pipelines and build tools.

## Features

- Compile LaTeX to PDF via `POST /api/v1/latex/compile` with a JSON body (raw LaTeX) or multipart/form-data (ZIP project with `entry_file`)
- Configurable compilation timeout (1–120 seconds, default 30)
- Structured errors for compilation failure, timeout, ZIP validation, and I/O issues (with codes and details)
- Request validation with Zod; CORS, body size limit (10MB), and secure headers
- Health and version endpoints for monitoring
- Docker image with TeX Live; Cloudflare Tunnel (cloudflared) in Docker Compose

## Tech Stack

- **Language:** TypeScript (strict mode, ESNext)
- **Runtime:** Bun 1.3.x
- **Framework:** Hono
- **Validation:** Zod, @hono/zod-validator
- **Middleware:** CORS, body limit, secure headers, pretty JSON (non-production)
- **LaTeX:** pdflatex (TeX Live in Docker)
- **Formatting/Linting:** Biome
- **Deployment:** Docker, Docker Compose (app + cloudflared)

## Environment Configuration

- **Local development:** Default port 3000, host `0.0.0.0`. Set `PORT` and `HOST` to override. Requires [Bun 1.3.x](.bun-version) and `pdflatex` installed for compilation.
- **Docker:** App service in `compose.yml` uses `.env`; TeX Live is included in the image; cloudflared runs after the app is healthy and requires `TUNNEL_TOKEN` in `.env`. The API is exposed on host port 3000. Set `PORT` and `HOST` in the app service environment to configure the server.

## Setup & Development

### Prerequisites

- Bun 1.3.x (see [.bun-version](.bun-version)), or Docker for containerized run.
- For local compilation: `pdflatex` (e.g. TeX Live) must be installed.

### Local

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Start development server:**
   ```bash
   bun run dev
   ```

   The API is available at http://localhost:3000

### Docker

Build and run with Docker Compose. You can also pull the image from Docker Hub:

```bash
docker pull louisbrulenaudet/latex-api
```

Create a `.env` file before starting (e.g. copy from `.env.template` and set `TUNNEL_TOKEN` for the cloudflared tunnel). The app service has a healthcheck; cloudflared starts only after the API is ready. The API is reachable on the host at http://localhost:3000.

```bash
cp .env.template .env   # if .env does not exist; then set TUNNEL_TOKEN
docker compose up
```

For production, you can add CPU/memory limits to the app service via a `compose.override.yml` (e.g. `deploy.resources.limits`).

### Available Commands

| Command              | Description                              |
|----------------------|------------------------------------------|
| `bun install`       | Install dependencies                     |
| `bun run dev`       | Run development server with hot reloading |
| `bun run check`     | Run Biome check (format + lint) and fix   |
| `bun run check-types` | Check TypeScript types                 |
| `bun run format`    | Format the codebase using Biome          |
| `bun run lint`      | Lint the codebase using Biome            |

### Make commands

You can also use Make. Run `make help` (or `make`) to list commands.

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

## API Overview

### Root

**GET /**

Returns API name and version (version is read from `package.json`).

**Example response (200 OK):**
```json
{
  "message": "LaTeX API",
  "version": "1.0.0"
}
```

### Health Check

**GET /api/v1/health**

Returns service health status.

**Example response (200 OK):**
```json
{
  "status": "ok"
}
```

### Compile LaTeX to PDF

**POST /api/v1/latex/compile**

Compiles LaTeX and returns the PDF. Supports two request formats.

**Option 1 — JSON (raw LaTeX)**

- **Content-Type:** `application/json`
- **Body:**
  - `content` (required): string — Raw LaTeX source.
  - `timeout` (optional): number — Max compilation time in milliseconds (1000–120000). Default: 30000.
  - `runTwice` (optional): boolean — If `true`, run `pdflatex` twice (e.g. for table of contents). Default: false.

**Option 2 — Multipart (ZIP project)**

- **Content-Type:** `multipart/form-data`
- **Form fields:**
  - `file` (required): ZIP file containing `.tex` files, images, fonts, etc.
  - `entry_file` (required): string — Name of the `.tex` file to compile (e.g. `main.tex` or `Curriculum vitae.tex`).
  - `timeout` (optional): same as above.
  - `runTwice` (optional): same as above.

Only allowed file types inside the ZIP are extracted (e.g. `.tex`, `.pdf`, `.jpg`, `.png`, `.ttf`, `.sty`, `.bib`; see API docs for full list). Path traversal and executable files are rejected (400).

**Success response (200 OK):**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `inline; filename="<uuid>.pdf"`
- **Cache-Control:** `no-store`
- Body: PDF binary.

**Example — JSON:**
```bash
curl -X POST http://localhost:3000/api/v1/latex/compile \
  -H "Content-Type: application/json" \
  -d '{"content": "\\documentclass{article}\\begin{document}Hello\\end{document}"}' \
  --output output.pdf
```

**Example — ZIP:**
```bash
curl -X POST http://localhost:3000/api/v1/latex/compile \
  -F "file=@project.zip" \
  -F "entry_file=main.tex" \
  -F "timeout=30000" \
  --output output.pdf
```

**Error responses:**

All API errors return JSON with the following structure when using CoreError:
```json
{
  "error": "ErrorClassName",
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```

| Status | Cause |
|--------|--------|
| 400    | Validation error (e.g. invalid JSON or schema; Zod validator response format). |
| 408    | Compilation timeout exceeded (`LATEX_TIMEOUT_EXCEEDED`). |
| 413    | Request body too large (over 10MB). Body: `{ "error": "Request body too large" }`. |
| 422    | LaTeX compilation failed (`LATEX_COMPILATION_FAILED`). `details.log` may contain log excerpt. |
| 500    | Internal/server error (other CoreError codes or unknown errors). Generic message for non-CoreError. |

ZIP-specific errors (400): `LATEX_INVALID_ZIP`, `LATEX_UNSAFE_FILE` (disallowed file type or path traversal), `LATEX_ENTRY_FILE_NOT_FOUND`.

If you see 422 with a message like "Corrupted NFSS tables" in `details.log`, the Docker image is set up with a writable TeX font cache to avoid this. If the error persists or you compile outside Docker, try adding `\usepackage{lmodern}` to your document preamble or replacing obsolete font packages (e.g. `ae`) with modern equivalents.

## Compilation Pipeline

Each compile request:

1. Creates a temporary directory (UUID) under `/tmp`.
2. Writes the request body’s `latex` string to `input.tex` in that directory.
3. Runs `pdflatex` with `-interaction=nonstopmode` and `-halt-on-error`; enforces the request timeout (default 30s) and kills the process on timeout. If `runTwice` is true, runs `pdflatex` a second time (same timeout per run) for documents that need two passes (e.g. table of contents).
4. Reads the generated `input.pdf` and returns it as the response body.
5. Removes the temporary directory (best-effort cleanup).

On timeout, the API returns 408 and does not return a PDF.

## Error Handling

Structured errors use the CoreError system:

- **LatexCompilationFailedError** — 422; `details.log` contains a parsed LaTeX log excerpt.
- **LatexTimeoutExceededError** — 408; `details.timeoutMs` indicates the limit.
- **LatexTempDirCreationFailedError**, **LatexFileWriteFailedError**, **LatexPdfReadFailedError** — 500.
- **LatexInvalidZipError**, **LatexUnsafeFileError**, **LatexEntryFileNotFoundError** — 400 (ZIP uploads).
- **LatexZipExtractionFailedError** — 500.

All errors are logged safely (no format-string injection). See [AGENTS.md](AGENTS.md) for implementation details.

## Request Validation

The compile endpoint enforces Content-Type via middleware (`requireCompileContentType()`); only `application/json` and `multipart/form-data` are accepted (415 otherwise). Request bodies are then validated by Content-Type:

- **JSON:** `content` (required string), `timeout` (optional integer 1000–120000, default 30000), `runTwice` (optional boolean, default false). Validated with Zod before compilation. Validation failures return 400 with `{ error: "Validation failed", details }` (see `validationErrorResponse`).
- **Multipart (ZIP):** `file` (required ZIP file), `entry_file` (required string, must end with `.tex`), `timeout`, `runTwice`. Form fields validated with Zod; invalid or unsafe ZIP contents return 400 with the appropriate error code.

## Development Guidelines

- Use strict TypeScript and proper type annotations.
- Validate all request data with Zod schemas from `src/dtos/`.
- Use CoreError (or subclasses) for domain and I/O errors.
- Run `bun run check` and `bun run check-types` before committing.
- Follow [AGENTS.md](AGENTS.md) for full coding conventions and project structure.

## Architecture

The API follows a simple request flow:

```
Request → Secure headers → CORS (/api/*) → Body limit (10MB) → Content-Type middleware (compile route) → Validation (Zod) → LatexService.compile or compileFromZip → PDF response (createPdfResponse)
```

The compile route uses `requireCompileContentType()` middleware to reject unsupported Content-Types with 415; validation errors return a consistent format via `validationErrorResponse()`.

Errors are handled by a global handler that maps CoreError codes to HTTP status (422, 408, or 500) and serializes the error with `toJSON()`; unknown errors return 500 with a generic message.
