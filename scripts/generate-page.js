const fs = require('fs');
const path = require('path');
const pageName = process.argv[2];

if (!pageName || !/^[A-Z][A-Za-z0-9]*$/.test(pageName)) {
  console.error('Usage: node generate-page.js PageName (PascalCase)');
  process.exit(1);
}

const pageContent = `import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';

export default function ${pageName}Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="${pageName}" />
      <div>
        {/* Content */}
      </div>
    </div>
  );
}
`;

const outputPath = path.join('src/pages', `${pageName}Page.tsx`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, pageContent);
console.log(`Page ${pageName}Page created!`);
