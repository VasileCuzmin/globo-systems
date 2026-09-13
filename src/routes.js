function nowIso() {
    return new Date().toISOString();// returns the current date and time in ISO 8601 format
}

import { upsert } from './store.js';

export async function registerRoutes(app) {
    // Example route registration
    app.get('/health', async (req, res) => {
        res.send({ status: 'ok', timestamp: nowIso() });
    });

    app.post('/upload', async (req, res) => {
        // Handle file upload here
        const record = {
            id: req.body.id,
            status: 'created',
            createdAt: nowIso(),
            updatedAt: nowIso(),
        }
        res.send({ status: 'uploaded', timestamp: nowIso() });
        upsert(record);
    });

    app.get('/files/:id', async (req, res) => {
        const id = req.params.id;
        // Retrieve the file record by id here
        const record = await getById(id);
        if (!record) {
            res.status(404).send({ error: 'File not found' });
            return;
        }
        res.send(record);
    });

    app.get('/files/:id/content', async (req, res) => {
        const id = req.params.id;
        // Retrieve the file record by id here
        const record = await getById(id);
        if (!record) {
            res.status(404).send({ error: 'File not found' });
            return;
        }


        return res.code(501).send({ error: 'Not implemented', hint: 'File content retrieval not yet implemented' });
    });
}