const records = new Map();

export function upsert(record) {
    records.set(record.id, record);
}

export function getById(id) {
    return records.get(id);
}

export function getAll() {
    return Array.from(records.values());
}

export function createRecord({ id, originalName, mime, source }) {
    const now = new Date().toISOString();
    records.set(id, { id, originalName, mime, source, status: "created", bytesReceived: 0, createdAt: now, updatedAt: now });
    return records.get(id);
}

export function updateRecord(id, patch) {
    const record = records.get(id);
    if (!record) {
        return null;
    }
    records.set(id, { ...record, ...patch, updatedAt: new Date().toISOString() });
    return records.get(id);
}