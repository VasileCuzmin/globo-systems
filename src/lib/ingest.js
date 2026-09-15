import crypto from 'crypto';
import { createRecord, updateRecord } from '../store.js';

export async function ingestFirstFileFromMultipart(req) {
    for await (const part of req.parts()) {
        if (part.type !== 'file') {
            continue;
        }

        const id = crypto.randomUUID();
        const originalName = part.filename ?? 'upload.bin';
        const mime = part.mimeType ?? 'application/octet-stream';

        createRecord({ id, originalName, mime, source: "http", ownerId: req.user.id });
        updateRecord(id, { status: "uploading" });
        return { id, originalName, mime, stream: part.file };
    }

    return null;
}