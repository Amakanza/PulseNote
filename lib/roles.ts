// lib/roles.ts
export type Role = "owner"|"admin"|"editor"|"viewer";
export const canEdit = (r: Role) => ["owner","admin","editor"].includes(r);
export const isAdmin = (r: Role) => ["owner","admin"].includes(r);
