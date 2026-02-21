export type UserRole = "owner" | "kasir";

export function isOwner(role?: string | null) {
  return role === "owner";
}
export function isKasir(role?: string | null) {
  return role === "kasir";
}