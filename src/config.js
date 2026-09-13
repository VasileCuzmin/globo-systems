import path from 'path';

function env(name, fallback) {
    const v = process.env[name];
    if (v && v.length > 0) return v;
    if (fallback !== undefined) return fallback;
    throw new Error(`Environment variable ${name} is not set and no fallback value provided.`);
}

function envInt(name, fallback) {
    const raw = process.env[name];
    const v = raw && raw.length > 0 ? raw : fallback;
    const i = parseInt(v, 10);
    if (isNaN(i)) {
        throw new Error(`Environment variable ${name} is not a valid integer: ${v}`);
    }
    return i;
}

export const config = {
    host: env('HOST', 'localhost'),
    port: envInt('PORT', 3000),

    data_dir: path.resolve(env('DATA_DIR', './data')),
    incoming_dir: path.resolve(env('INCOMING_DIR', './data/incoming')),
    processed_dir: path.resolve(env('PROCESSED_DIR', './data/processed')),
    failed_dir: path.resolve(env('FAILED_DIR', './data/failed')),
    archive_dir: path.resolve(env('ARCHIVE_DIR', './data/archive')),
    staging_dir: path.resolve(env('STAGING_DIR', './data/staging')),
    
    max_upload_bytes: envInt('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
}

export { env, envInt };