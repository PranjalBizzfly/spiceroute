const fs = require('fs');
let content = fs.readFileSync('./src/data/stories.ts', 'utf8');
content = content.replaceAll('heroImageLicence: "editorial"', 'heroImageLicence: "pending"');
fs.writeFileSync('./src/data/stories.ts', content, 'utf8');
console.log('Successfully reverted heroImageLicence to pending');
