// Phase 4 Wave 4 — /copilot was the old name for the AI chat surface
// (Wave 3 promoted it to first-class /chat). This page is a 308 permanent
// redirect; existing bookmarks land on /chat with the same context.
// Per UI-SPEC §11 Q1 default: keep the redirect for one release cycle,
// then delete the route in Phase 5.
import { redirect } from "next/navigation";

export default function CopilotRedirect(): never {
  redirect("/chat");
}
