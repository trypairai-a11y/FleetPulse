import { redirect } from "next/navigation";

// R10 · Deprecated. Phones now live under Driver 360 → Assets.
// Redirects during the 2-week deprecation window; will 404 after v0.2.
export default function DeprecatedKeetaPhonesPage() {
  redirect("/keeta/drivers?deprecated=phones");
}
