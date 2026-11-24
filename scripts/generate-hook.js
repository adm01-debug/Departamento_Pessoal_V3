#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const hookName = process.argv[2];
if (!hookName || !/^use[A-Z][A-Za-z0-9]*$/.test(hookName)) {
  console.error('Usage: node generate-hook.js useHookName');
  process.exit(1);
}

const hookPath = path.join(import.meta.dirname, '../src/hooks', `${hookName}.ts`);

const hookContent = `import { useState, useCallback } from 'react';

export function ${hookName}() {
  const [state, setState] = useState(null);

  const action = useCallback(() => {
    // action logic
  }, []);

  return { state, action };
}
`;

// 'wx' cria de forma exclusiva e atômica: não sobrescreve arquivo existente nem corre contra outro processo.
try {
  fs.writeFileSync(hookPath, hookContent, { flag: 'wx' });
} catch (err) {
  if (err.code === 'EEXIST') {
    console.error(`${hookPath} already exists; nothing was written.`);
    process.exit(1);
  }
  throw err;
}
console.log(`Hook ${hookName} created!`);
