import { LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";


export async function loader({ params}: LoaderFunctionArgs) {
  return redirect(`/admin/create-gpt?mode=edit&id=${params.id}`);
}
