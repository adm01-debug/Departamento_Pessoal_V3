const fs = require('fs');
const path = require('path');
const serviceName = process.argv[2];

if (!serviceName || !/^[a-z][A-Za-z0-9]*$/.test(serviceName)) {
  console.error('Usage: node generate-service.js serviceName (camelCase)');
  process.exit(1);
}

const serviceContent = `import { api } from '@/lib/api';

export const ${serviceName}Service = {
  async listar() {
    const { data } = await api.get('/${serviceName}');
    return data;
  },

  async buscar(id: string) {
    const { data } = await api.get(\`/${serviceName}/\${id}\`);
    return data;
  },

  async criar(dados: any) {
    const { data } = await api.post('/${serviceName}', dados);
    return data;
  },

  async atualizar(id: string, dados: any) {
    const { data } = await api.put(\`/${serviceName}/\${id}\`, dados);
    return data;
  },

  async excluir(id: string) {
    await api.delete(\`/${serviceName}/\${id}\`);
  },
};
`;

const outputPath = path.join('src/services', `${serviceName}Service.ts`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, serviceContent);
console.log(`Service ${serviceName}Service created!`);
