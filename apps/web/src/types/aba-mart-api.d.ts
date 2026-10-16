// The API package ships compiled JavaScript without declarations.
declare module "@aba-mart/api/vercel" {
  export function handleWebRequest(request: Request): Promise<Response>;
}
