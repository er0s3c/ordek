// app/api/.../route.js wrapper'larini lib/vulns.js ROUTES kaydindan uretir.
// Calistir:  node scripts/gen-routes.js
const fs = require("fs");
const path = require("path");
const { ROUTES } = require("../lib/vulns");

const root = path.join(__dirname, "..", "app", "api");

for (const r of ROUTES) {
  const sub = r.path.replace(/^\/api\//, "").replace(/:([^/]+)/g, "[$1]");
  const dir = path.join(root, sub);
  fs.mkdirSync(dir, { recursive: true });
  const content =
`import vulns from "@/lib/vulns";
import { makeHandler } from "@/lib/next-adapter";

export const dynamic = "force-dynamic";
export const ${r.method} = makeHandler(vulns.${r.fn.name});
`;
  fs.writeFileSync(path.join(dir, "route.js"), content);
  console.log(`${r.method.padEnd(4)} ${r.path}  ->  app/api/${sub}/route.js`);
}
console.log(`\n${ROUTES.length} route wrapper olusturuldu.`);
