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
  const importStatement = 'import { DatePickerInput } from "@/components/ui/date-picker-input";\n';
  
  if (content.includes('DatePickerInput') && content.includes(importStatement)) {
    // Check if it's not at the top (say, not within first 500 chars, or just remove and prepend to be safe)
    // Remove all occurrences of the import statement
    const newContent = content.split(importStatement).join('');
    
    // Add it exactly once at the top
    const finalContent = importStatement + newContent;
    
    if (finalContent !== content) {
      fs.writeFileSync(file, finalContent, 'utf8');
      console.log(`Fixed import in ${file}`);
    }
  }
}
