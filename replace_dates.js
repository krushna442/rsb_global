const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = findTsxFiles(srcDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace <Input type="date" and <input type="date"
  if (content.includes('type="date"')) {
    // We only replace <Input type="date" ... /> and <input type="date" ... />
    // First, let's see if it's the exact match
    const newContent = content
      .replace(/<Input\s+([^>]*?)type="date"([^>]*?)>/g, '<DatePickerInput $1 $2>')
      .replace(/<Input\s+([^>]*?)type='date'([^>]*?)>/g, '<DatePickerInput $1 $2>')
      .replace(/<input\s+([^>]*?)type="date"([^>]*?)>/g, '<DatePickerInput $1 $2>')
      .replace(/<input\s+([^>]*?)type='date'([^>]*?)>/g, '<DatePickerInput $1 $2>')
      // also handle cases where type="date" is before other props
      .replace(/<Input\s+type="date"\s+([^>]*?)>/g, '<DatePickerInput $1>')
      .replace(/<input\s+type="date"\s+([^>]*?)>/g, '<DatePickerInput $1>');

    if (newContent !== content) {
      // Add import
      if (!newContent.includes('DatePickerInput')) {
        // Just in case, though it should include it now
      }
      
      const importStatement = `import { DatePickerInput } from "@/components/ui/date-picker-input";\n`;
      // Insert after last import
      const lastImportIndex = newContent.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfImport = newContent.indexOf('\n', lastImportIndex);
        content = newContent.slice(0, endOfImport + 1) + importStatement + newContent.slice(endOfImport + 1);
      } else {
        content = importStatement + newContent;
      }
      
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
