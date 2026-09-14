import chokidar from "chokidar";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { createRecord, updateRecord } from "../store.js";
import { runUploadPipeline } from "./stream-pipeline.js";
import { config } from "../config.js";
import { clearTimeout } from "node:timers";
import { log } from "node:console";

const inFlight = new Set();

export function startIncomingWatcher({ logger }) {
    const incomingDir = config.incomingDir;

    const watcher = chokidar.watch(incomingDir, {
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 100,
        }
    });

    watcher.on("add", (filePath) => {
        void handleIncomingFile({ filePath, logger });
    });

    watcher.on("error", (err) => {
        logger.error({ err }, "Incoming watcher error");
    })

    logger.info({ incomingDir, stabilityMs: 1000 },
        "Incoming watcher started"
    );

    return watcher;
}

async function handleIncomingFile({ filePath, logger }) {
    const stat = await fsp.stat(filePath);
    if (!stat || !stat.isFile()) return;

    const abs = path.resolve(filePath);
    if (inFlight.has(abs)) return;
    inFlight.add(abs);

    const originalName = path.basename(filePath);
    const id = crypto.randomUUID();

    createRecord({
        id,
        originalName,
        mime: "application/octet-stream",
        source: "incoming"
    });

    updateRecord(id, { status: "processing" });

    const tmpPath = path.join(config.stagingDir, `${id}.tmp`);
    const finalPath = path.join(config.processedDir, `${id}.bin`);

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10000);

    try {
        const sourceStream = fs.createReadStream(filePath);

        const { bytesWritten } = await runUploadPipeline({
            sourceStream,
            destPath: tmpPath,
            maxBytes: config.maxUploadBytes,
            signal: ac.signal
        });

        await fsp.rename(tmpPath, finalPath);

        updateRecord(id, {
            status: "succeeded",
            bytesStored: bytesWritten,
            storedPath: finalPath
        });

        await fsp.unlink(filePath);

        logger.info({ id, originalName, bytesWritten },
            "Incoming file processed");
    } catch (err) {
        await fsp.rm(tmpPath, { force: true }).catch(() => { });
        updateRecord(id, {
            status: ac.signal.aborted ? "aborted" : "failed",
            error: err?.message || "Unknown error"
        })
        const failedPath = path.join(config.failedDir, `${id}-${originalName}`);
        await fsp.rename(filePath, failedPath);

        logger.error({ err, id, originalName }, "Incoming file failed");
    } finally {
        clearTimeout(timeout);
        inFlight.delete(abs);
    }
}