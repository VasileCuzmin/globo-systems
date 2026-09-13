import fsp from 'fs/promises';

export async function ensureDirs(dirs) {
    for (const dir of dirs) {
        try {
            await fsp.mkdir(dir, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    }
}