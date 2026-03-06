import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/components/MainGrid/ProductionGrid.tsx',
  'src/components/SettingsPanel.tsx',
  'src/components/ExportDialog.tsx',
  'src/App.tsx',
  'src/components/MainGrid/DayPanel.tsx',
  'src/components/EmployeeRibbon.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/border-r-2/g, 'border-r');
    content = content.replace(/border-l-2/g, 'border-l');
    content = content.replace(/border-t-2/g, 'border-t');
    content = content.replace(/border-b-2/g, 'border-b');
    content = content.replace(/bg-gray-50/g, 'bg-white'); // Supabase uses white mostly
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
