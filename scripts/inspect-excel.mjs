import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import * as path from 'path';

const filePath = process.argv[2];
if (!filePath) { process.stdout.write('Usage: node inspect-excel.mjs <file.xlsx>\n'); process.exit(1); }

const wb = XLSX.readFile(path.resolve(process.cwd(), filePath));
process.stdout.write(`Листы (${wb.SheetNames.length}): ${wb.SheetNames.join(', ')}\n\n`);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  process.stdout.write(`═══ Лист: "${name}" (${rows.length} строк) ═══\n`);
  rows.slice(0, 40).forEach((row, i) => {
    const cells = row.slice(0, 10).map(c => String(c).padEnd(18)).join(' | ');
    process.stdout.write(`  [${String(i).padStart(2)}] ${cells}\n`);
  });
  if (rows.length > 40) process.stdout.write(`  ... ещё ${rows.length - 40} строк\n`);
  process.stdout.write('\n');
}
