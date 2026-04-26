import { createRequire } from 'module';
const XLSX = createRequire(import.meta.url)('xlsx');
import * as path from 'path';

const wb = XLSX.readFile(path.resolve(process.cwd(), 'tours.xlsx'));
const names = ['Динара','Дамира','Нурила','Ксения','Аида','Гульнара'];

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let lastDate = '';
  rows.forEach((row, i) => {
    const colA = String(row[0]).trim();
    const name = String(row[1]).trim();
    if (/^\d{1,2}\.\d{1,2}$/.test(colA)) lastDate = colA;
    if (names.some(n => name.toLowerCase().includes(n.toLowerCase()))) {
      process.stdout.write(`Лист: ${sheetName.padEnd(30)} дата: ${lastDate.padEnd(8)} строка[${i}]: ${row.slice(0,7).map(c=>String(c).padEnd(15)).join(' | ')}\n`);
    }
  });
}
