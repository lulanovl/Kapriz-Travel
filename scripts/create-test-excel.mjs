import * as XLSX from 'xlsx';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  ['Дарья',          1, 2000, 4500, '550722555', 'Айсезим каприз'],
  ['Данислав',       1, 2000, 4500, '',           'Айсезим каприз'],
  ['Жусуева света',  1, 6500,    0, '702437956', 'Айсезим каприз'],
  ['Чолпонай',       1, 2000, 4500, '709128812', 'Айсезим каприз'],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const outPath = path.resolve(__dirname, '../test-import.xlsx');
XLSX.writeFile(wb, outPath);
process.stdout.write(`✅ Создан файл: ${outPath}\n`);
