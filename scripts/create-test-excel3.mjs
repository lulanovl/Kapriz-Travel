import * as XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  ['Айнура',      1, 5000, 17600, '700219935', 'сыргажан'],
  ['дети',        1,    0,     0, '',           'сыргажан'],
  ['дети',        1,    0,     0, '',           'сыргажан'],
  ['дети',        1,    0,     0, '',           'сыргажан'],
  ['гульзада',    1, 2000,  5200, '702837135', 'сыргажан'],
  ['арууке',      1, 2000,  5200, '',           'сыргажан'],
  ['Юлия',        1, 3000,  3200, '557009913', 'сыргажан'],
  ['Талгат',      1, 3000,  3200, '558830183', 'сыргажан'],
  ['кубанычбек',  1, 2000,  4200, '707767946', 'сыргажан'],
  ['рамиль',      1, 2000,  4200, '997971549', 'сыргажан'],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const outPath = path.resolve(__dirname, '../test-import3.xlsx');
XLSX.writeFile(wb, outPath);
process.stdout.write(`✅ ${outPath}\n`);
