
import path from 'path';
import fsp from 'fs/promises';
import fs from 'fs';
import { ingestFirstFileFromMultipart } from './lib/ingest.js';
import { runUploadPipeline } from './lib/stream-pipeline.js';
import { config } from './config.js';

function nowIso() {
    return new Date().toISOString();// returns the current date and time in ISO 8601 format
}

function mapUploadError(err) {
    // 499 is commonly used for "client closed request"
    if (err?.name === "AbortError" || err?.code === "ABORT_ERR") {
        return { status: 499, body: { ok: false, error: "Upload aborted" } };
    }

    if (err?.code === "LIMIT_FILE_SIZE") {
        return { status: 413, body: { ok: false, error: "File too large" } };
    }

    return { status: 500, body: { ok: false, error: "Upload failed" } };
}


export async function registerRoutes(app) {
    // Example route registration
    app.get('/health', async (req, res) => {
        res.send({ status: 'ok', timestamp: nowIso() });
    });

    app.get('/files/:id', async (req, res) => {
        const id = req.params.id;
        // Retrieve the file record by id here
        const record = await getById(id);
        if (!record) {
            return res.code(404).send({ error: 'File not found' });
        }

        if (record.status !== "succeeded") {
            return res.code(409).send({ error: 'File not ready for download' });
        }

        const filePath = record.storedPath ?? path.join(config.processed_dir, `${id}.bin`);

        const root = path.resolve(config.processed_dir);
        const resolved = path.resolve(filePath);

        if (!resolved.startsWith(root)) { // Ensure the resolved file path is within the allowed directory
            return res.code(403).send({ error: 'Invalid path' }); // Prevent directory traversal attacks
        }

        if (!fs.existsSync(resolved)) {
            return res.code(410).send({ error: 'File not found' });
        }

        res.header("Content-Type", record.mime || "application/octet-stream");
        res.header("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);

        return res.send(fs.createReadStream(resolved));
    });

    app.get('/files/:id/content', async (req, res) => {
        const id = req.params.id;
        // Retrieve the file record by id here
        const record = await getById(id);
        if (!record) {
            return res.code(404).send({ error: 'File not found' });
        }


        return res.status(501).send({ error: 'Not implemented', hint: 'File content retrieval not yet implemented' });
    });


    app.post('/upload', async (req, reply) => {
        const ingested = await ingestFirstFileFromMultipart(req);
        if (!ingested) {
            return reply.code(400).send({ ok: false, error: 'No file part was found in the request' });
        }
        const id = ingested.id;

        const tmpPath = path.join(config.staging_dir, `${id}.tmp`);
        const finalPath = path.join(config.processed_dir, `${id}.bin`);

        const ac = new AbortController();

        const onClose = () => ac.abort();
        // req.raw.on("aborted", onClose);
        // req.raw.on("close", onClose);

        try {
            const { bytesWritten } = await runUploadPipeline({
                sourceStream: ingested.stream,
                destPath: tmpPath,
                maxBytes: 2 * 1024,// 2 KB max size
                signal: ac.signal
            });

            updateRecord(ingested.id, { status: "succeeded", bytesStored: bytesWritten, storedPath: finalPath });
            await fsp.rename(tmpPath, finalPath);// Move the file from the temporary path to the final destination

            return reply.send({
                ok: true,
                id: ingested.id,
                bytesWritten,
                savedAs: path.basename(finalPath),
                ownerId: req.user?.id
            });

        }
        catch (err) {
            await fsp.rm(tmpPath, { force: true }).catch(() => { });
            const mapped = mapUploadError(err);
            return reply
                .code(mapped.status)
                .send(mapped.body);
        }
    });
}