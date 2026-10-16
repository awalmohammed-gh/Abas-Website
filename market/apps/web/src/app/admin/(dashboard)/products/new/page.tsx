import { NewProductView } from "./NewProductView";

// Rendered only after the client confirms the admin session.
export const instant = false;

export default function Page() {
  return <NewProductView />;
}
