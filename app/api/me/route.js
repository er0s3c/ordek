import vulns from "@/lib/vulns";
import { makeHandler } from "@/lib/next-adapter";

export const dynamic = "force-dynamic";
export const GET = makeHandler(vulns.me);
