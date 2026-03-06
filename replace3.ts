import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/components/SettingsPanel.tsx',
];

for (const file of filesToUpdate) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/bg-gray-900/g, 'bg-emerald-500');
    content = content.replace(/hover:bg-gray-800/g, 'hover:bg-emerald-600');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
