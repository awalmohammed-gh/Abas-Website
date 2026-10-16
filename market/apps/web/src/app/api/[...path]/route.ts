/**
 * Runs the Express API (apps/api) inside this app on Vercel, so the store and API share
 * one origin. Every /api/* request lands here except /api/revalidate, whose own route
 * takes precedence. Locally the API runs as its own server on :5000 and this route
 * answers 404, so it can never start a second API against the real database.
 */
async function forward(request: Request): Promise<Response> {
  if (!process.env.VERCEL) {
    return Response.json({ success: false, error: { code: "NOT_FOUND", message: "The API runs on its own server in development." } }, { status: 404 });
  }
  const { handleWebRequest } = await import("@aba-mart/api/vercel");
  return handleWebRequest(request);
}

export { forward as DELETE, forward as GET, forward as HEAD, forward as OPTIONS, forward as PATCH, forward as POST, forward as PUT };
