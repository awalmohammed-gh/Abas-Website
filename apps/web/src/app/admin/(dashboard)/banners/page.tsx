import { BannersView } from "./BannersView";

// Rendered only after the client confirms the admin session.
export const instant = false;

export default function Page() {
  return <BannersView />;
}
