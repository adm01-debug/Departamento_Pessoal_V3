#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const pageName = process.argv[2];
if (!pageName || !/^[A-Z][A-Za-z0-9]*$/.test(pageName)) {
  console.error('Usage: node generate-page.js PageName (PascalCase)');
  process.exit(1);
}

const pagePath = path.join(import.meta.dirname, '../src/pages', `${pageName}Page.tsx`);
if (fs.existsSync(pagePath)) {
  console.error(`${pagePath} already exists; nothing was written.`);
  process.exit(1);
}

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

fs.writeFileSync(pagePath, pageContent);
console.log(`Page ${pageName}Page created!`);
