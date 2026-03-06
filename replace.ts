import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/components/MainGrid/ProductionGrid.tsx',
  'src/components/SettingsPanel.tsx',
  'src/components/ExportDialog.tsx',
  'src/App.tsx'
];

for (const file of filesToUpdate) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/border-2/g, 'border');
    content = content.replace(/blue-/g, 'emerald-');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
