export function parsePagination(query) {
    const page = Math.max(Number(query.page ?? 1) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20) || 20, 1), 1000);
    return {
        page,
        pageSize,
        offset: (page - 1) * pageSize,
    };
}
