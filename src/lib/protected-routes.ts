export const PROTECTED_ROUTES = [
  "/dashboard",
  "/preferences",
  "/templates",
  "/users",
] as const;

export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/enter",
  "/login",
  "/signup",
] as const;

export type ProtectedRoute = typeof PROTECTED_ROUTES[number];
export type PublicRoute = typeof PUBLIC_ROUTES[number];
