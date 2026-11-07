const fs = require('fs');
const path = require('path');
const hookName = process.argv[2];

if (!hookName || !/^use[A-Z][A-Za-z0-9]*$/.test(hookName)) {
  console.error('Usage: node generate-hook.js useHookName');
  process.exit(1);
}

const hookContent = `import { useState, useCallback } from 'react';

export function ${hookName}() {
  const [state, setState] = useState(null);

  const action = useCallback(() => {
    // action logic
  }, []);

  return { state, action };
}
`;

const outputPath = path.join('src/hooks', `${hookName}.ts`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, hookContent);
console.log(`Hook ${hookName} created!`);
