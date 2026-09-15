# Globo Systems

Globo Systems is a Node.js file-ingestion service. It accepts multipart HTTP uploads and monitors a local incoming directory, then streams files through a size-checking pipeline into managed storage.

## Technology Stack

- Node.js with ES modules
- Fastify 5 for the HTTP server and structured logging
- `@fastify/multipart` for streaming multipart uploads
- Chokidar for incoming-directory watching
- Node.js streams, `pipeline`, and `Transform` streams for file processing
- Node.js file system APIs for directory management and file moves

## Features

- Health-check endpoint.
- Header-based request ownership with `X-Owner-Id`.
- Streaming file uploads, so files do not need to be buffered entirely in memory.
- File-size limiting in the upload pipeline.
- UUID-based stored filenames to avoid collisions.
- In-memory upload records with status, timestamps, file metadata, and stored path.
- Download endpoint with ownership and processed-directory boundary checks.
- Incoming-directory watcher that waits for a file to finish being written before processing it.
- Separate `staging`, `processed`, `failed`, and `archive` data directories.
- Automatic cleanup of temporary files when processing fails.

## Prerequisites

- Node.js 20 or later
- npm

## Installation

```bash
npm install
```

The application creates its required data directories on startup.

## Running the Service

Start the server:

```bash
npm start
```

Start it in watch mode during development:

```bash
npm run dev
```

By default, the service listens at `http://localhost:3000`.

## Configuration

Configuration is read from environment variables. The development command supports an optional `.env` file through Node's `--env-file` flag.

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `localhost` | Configured host name. |
| `PORT` | `3000` | HTTP listening port. |
| `DATA_DIR` | `./data` | Root directory for application data. |
| `INCOMING_DIR` | `./data/incoming` | Files placed here are picked up by the watcher. |
| `PROCESSED_DIR` | `./data/processed` | Completed files are stored here. |
| `FAILED_DIR` | `./data/failed` | Files that fail watcher processing are moved here. |
| `ARCHIVE_DIR` | `./data/archive` | Directory reserved for archived files. |
| `STAGING_DIR` | `./data/staging` | Temporary files are written here before finalization. |
| `MAX_UPLOAD_BYTES` | `10485760` | Maximum file size used by watcher processing, in bytes. |

Example `.env`:

```dotenv
PORT=3000
MAX_UPLOAD_BYTES=10485760
DATA_DIR=./data
```

## HTTP API

Every endpoint currently requires an `X-Owner-Id` request header. This header identifies the owner of uploaded files.

### `GET /health`

Returns service health and an ISO 8601 timestamp.

```bash
curl -H "X-Owner-Id: demo-user" http://localhost:3000/health
```

### `POST /upload`

Uploads the first file part in a `multipart/form-data` request. The server assigns a UUID and stores the result as `<uuid>.bin` in the processed directory after a successful stream.

```bash
curl -X POST http://localhost:3000/upload \
  -H "X-Owner-Id: demo-user" \
  -F "file=@./example.pdf"
```

A successful response contains the file ID, byte count, generated storage name, and owner ID.

### `GET /files/:id`

Downloads a completed file when the supplied owner ID matches the owner recorded at upload time.

```bash
curl -OJ \
  -H "X-Owner-Id: demo-user" \
  http://localhost:3000/files/<file-id>
```

The endpoint returns `404` for an unknown file, `403` for a different owner, `409` while processing is incomplete, and `410` when the record exists but the stored file is missing.

### `GET /files/:id/content`

This endpoint is declared but currently returns `501 Not implemented`.

## Incoming Directory Processing

Put a file in `data/incoming` while the service is running. Chokidar waits until the file has been stable for one second, then the watcher:

1. Creates an in-memory processing record.
2. Streams the file to a UUID-named temporary file in `data/staging`.
3. Moves the completed file to `data/processed`.
4. Deletes the original incoming file after success.
5. Moves the original to `data/failed` and removes the temporary file on failure.

Watcher processing uses a 10-second abort timer and tracks paths already being processed to avoid duplicate simultaneous work.

## Data Directories

```text
data/
  archive/    Reserved for archived files
  failed/     Incoming files that could not be processed
  incoming/   Files waiting for watcher processing
  processed/  Successfully stored files
  staging/    Temporary files during processing
```

Records are kept in memory, so file metadata and ownership information are lost when the service restarts. Stored files remain on disk.

## Current Implementation Notes

- `GET /files/:id/content` is intentionally unimplemented.
- The upload and watcher call sites currently pass an options object to `runUploadPipeline`, while the helper currently declares positional parameters: `sourceStream`, `destPath`, and `maxBytes`. Align these signatures before relying on file processing.
- The download routes use `getById`, but `src/routes.js` does not currently import it from `src/store.js`; importing it is required before download requests can succeed.
- The HTTP upload route currently sets a fixed `2 KB` limit rather than using `MAX_UPLOAD_BYTES`.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Runs `node src/server.js`. |
| `npm run dev` | Runs the server in Node watch mode and loads `.env` when present. |
| `npm test` | Placeholder script; no automated tests are configured yet. |

## Project Structure

```text
src/
  server.js              Application bootstrap, directory setup, and watcher startup
  config.js              Environment-based configuration
  dirs.js                Directory creation helper
  routes.js              HTTP endpoint registration
  store.js               In-memory file-record store
  lib/
    auth.js              Header-based authentication hook
    ingest.js            Multipart file-part ingestion
    stream-pipeline.js   Stream transforms and file writing
    watcher.js           Incoming-directory monitoring and processing
data/                    Runtime file storage
```