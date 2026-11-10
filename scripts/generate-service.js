#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const serviceName = process.argv[2];
if (!serviceName || !/^[a-z][A-Za-z0-9]*$/.test(serviceName)) {
  console.error('Usage: node generate-service.js serviceName (camelCase)');
  process.exit(1);
}

const servicePath = path.join(import.meta.dirname, '../src/services', `${serviceName}Service.ts`);

const className = `${serviceName[0].toUpperCase()}${serviceName.slice(1)}Service`;
const serviceContent = `import { BaseService } from './baseService';

class ${className} extends BaseService<Record<string, unknown>> {
  constructor() {
    super('${serviceName}');
  }
}

export const ${serviceName}Service = new ${className}();
`;

// 'wx' cria de forma exclusiva e atômica: não sobrescreve arquivo existente nem corre contra outro processo.
try {
  fs.writeFileSync(servicePath, serviceContent, { flag: 'wx' });
} catch (err) {
  if (err.code === 'EEXIST') {
    console.error(`${servicePath} already exists; nothing was written.`);
    process.exit(1);
  }
  throw err;
}
console.log(`Service ${serviceName}Service created!`);
