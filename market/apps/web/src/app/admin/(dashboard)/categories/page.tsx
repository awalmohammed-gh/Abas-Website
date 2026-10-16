import { CategoriesView } from "./CategoriesView";

// Rendered only after the client confirms the admin session.
export const instant = false;

export default function Page() {
  return <CategoriesView />;
}
