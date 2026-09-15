export async function registerAuth(app) {
    app.addHook('preHandler', async (request, reply) => {

        const ownerId = request.headers['x-owner-id'];
        if (!ownerId) {
            reply.status(401).send({ error: 'Unauthorized' });
            return; // Ensure the request is terminated
        }
        request.user = { id: String(ownerId) };
    });
}