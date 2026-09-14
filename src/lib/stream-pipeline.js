import { Transform, pipeline } from 'stream';
import fs from 'fs';

function createMaxSizeStream(maxSize) {
    let totalSize = 0;
    return new Transform({
        transform(chunk, encoding, callback) {
            totalSize += chunk.length;
            if (totalSize > maxSize) {
                const err = new Error(`File too large (>${maxSize} bytes)`)
                err.code = "LIMIT_FILE_SIZE";
                callback(err);
                return;
            } else {
                callback(null, chunk);
            }
        }
    });
}

function createTapTransform(sideEffect) {
    return new Transform({
        transform(chunk, encoding, callback) {
            try {
                sideEffect(chunk);
                callback(null, chunk);
            } catch (error) {
                callback(error);
            }
        }
    });
}


export async function runUploadPipeline(sourceStream, destPath, maxBytes) {
    let totalBytes = 0;
    const tap = createTapTransform(chunk => {
        totalBytes += chunk.length;
    });

    await pipeline(sourceStream, createMaxSizeStream(maxBytes), tap, fs.createWriteStream(destPath));

    return { bytesWritten: totalBytes };
}