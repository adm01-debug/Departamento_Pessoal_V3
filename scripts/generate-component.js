#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const componentName = process.argv[2];
if (!componentName) {
  console.error('Usage: node generate-component.js ComponentName');
  process.exit(1);
}

const componentDir = path.join('src/components', componentName);
if (!fs.existsSync(componentDir)) {
  fs.mkdirSync(componentDir, { recursive: true });
}

const componentContent = `import React from 'react';

interface ${componentName}Props {
  // props
}

export function ${componentName}({ }: ${componentName}Props) {
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
