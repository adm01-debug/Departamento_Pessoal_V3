#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const hookName = process.argv[2];
if (!hookName) {
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

fs.writeFileSync(path.join('src/hooks', `${hookName}.ts`), hookContent);
console.log(`Hook ${hookName} created!`);
