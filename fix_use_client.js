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
  let lines = content.split('\n');
  
  let useClientIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('"use client"') || lines[i].includes("'use client'")) {
      useClientIndex = i;
      break;
    }
  }

  if (useClientIndex > 0) {
    // Move "use client"; to the top
    const useClientLine = lines.splice(useClientIndex, 1)[0];
    lines.unshift(useClientLine);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log(`Moved "use client" to top in ${file}`);
  }
}
