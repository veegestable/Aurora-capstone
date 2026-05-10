import { Redirect } from "expo-router";

/**
 * Fallback when no file route matches (e.g. stale or unexpected native URLs).
 * Sends users back through the root index, which redirects by auth role.
 */
export default function NotFound() {
  return <Redirect href="/" />;
}
