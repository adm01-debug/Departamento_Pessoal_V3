#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const componentName = process.argv[2];
if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
  console.error('Usage: node generate-component.js ComponentName (PascalCase)');
  process.exit(1);
}

const componentDir = path.join(import.meta.dirname, '../src/components', componentName);
for (const file of [`${componentName}.tsx`, 'index.ts']) {
  if (fs.existsSync(path.join(componentDir, file))) {
    console.error(`${path.join(componentDir, file)} already exists; nothing was written.`);
    process.exit(1);
  }
}
if (!fs.existsSync(componentDir)) {
  fs.mkdirSync(componentDir, { recursive: true });
}

const componentContent = `import React from 'react';

interface ${componentName}Props {
  // props
}

export function ${componentName}(props: ${componentName}Props) {
  return (
    <div>
      ${componentName}
    </div>
  );
}
`;

fs.writeFileSync(path.join(componentDir, `${componentName}.tsx`), componentContent);
fs.writeFileSync(
  path.join(componentDir, 'index.ts'),
  `export { ${componentName} } from './${componentName}';\n`,
);
console.log(`Component ${componentName} created!`);
