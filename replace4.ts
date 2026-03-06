import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'src/components/SettingsPanel.tsx',
];

for (const file of filesToUpdate) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/green-600/g, 'emerald-600');
    content = content.replace(/green-50/g, 'emerald-50');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
