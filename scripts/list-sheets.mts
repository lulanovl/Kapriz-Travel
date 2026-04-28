import * as dotenv from "dotenv";
import * as path from "path";
import { createRequire } from "module";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const wb = XLSX.readFile(path.resolve(process.cwd(), "tours.xlsx"));
console.log(`Листов: ${wb.SheetNames.length}`);
for (const name of wb.SheetNames as string[]) {
  const ws = wb.Sheets[name];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const data = rows.filter((r) => r.some((c) => String(c).trim()));
  console.log(` [${name}] => ${data.length} строк`);
}
