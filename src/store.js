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