#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const pageName = process.argv[2];
if (!pageName) {
  console.error('Usage: node generate-page.js PageName');
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

fs.writeFileSync(path.join('src/pages', `${pageName}Page.tsx`), pageContent);
console.log(`Page ${pageName}Page created!`);
