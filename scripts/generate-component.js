const fs = require('fs');
const path = require('path');
const componentName = process.argv[2];

if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
  console.error('Usage: node generate-component.js ComponentName (PascalCase)');
  process.exit(1);
}

const componentDir = path.join('src/components', componentName);
fs.mkdirSync(componentDir, { recursive: true });

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
