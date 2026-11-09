#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const serviceName = process.argv[2];
if (!serviceName || !/^[a-z][A-Za-z0-9]*$/.test(serviceName)) {
  console.error('Usage: node generate-service.js serviceName (camelCase)');
  process.exit(1);
}

const servicePath = path.join(import.meta.dirname, '../src/services', `${serviceName}Service.ts`);
if (fs.existsSync(servicePath)) {
  console.error(`${servicePath} already exists; nothing was written.`);
  process.exit(1);
}

const className = `${serviceName[0].toUpperCase()}${serviceName.slice(1)}Service`;
const serviceContent = `import { BaseService } from './baseService';

class ${className} extends BaseService<Record<string, unknown>> {
  constructor() {
    super('${serviceName}');
  }
}

export const ${serviceName}Service = new ${className}();
`;

fs.writeFileSync(servicePath, serviceContent);
console.log(`Service ${serviceName}Service created!`);
