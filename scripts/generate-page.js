#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const pageName = process.argv[2];
if (!pageName || !/^[A-Z][A-Za-z0-9]*$/.test(pageName)) {
  console.error('Usage: node generate-page.js PageName (PascalCase)');
  process.exit(1);
}

const pagePath = path.join(import.meta.dirname, '../src/pages', `${pageName}Page.tsx`);

const pageContent = `import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

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

// 'wx' cria de forma exclusiva e atômica: não sobrescreve arquivo existente nem corre contra outro processo.
try {
  fs.writeFileSync(pagePath, pageContent, { flag: 'wx' });
} catch (err) {
  if (err.code === 'EEXIST') {
    console.error(`${pagePath} already exists; nothing was written.`);
    process.exit(1);
  }
  throw err;
}
console.log(`Page ${pageName}Page created!`);
