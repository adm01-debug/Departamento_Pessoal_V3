import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');

try {
  console.log('--- Verificação de Integridade de Build ---');
  
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json não encontrado!');
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const criticalDeps = ['cmdk', 'lucide-react', 'date-fns', 'jspdf'];
  
  for (const dep of criticalDeps) {
    if (!pkg.dependencies[dep] && !pkg.devDependencies?.[dep]) {
      console.error(`\x1b[31mERRO CRÍTICO: Dependência "${dep}" está faltando no package.json.\x1b[0m`);
      process.exit(1);
    }
  }

  // Verificar se está instalado em node_modules (aproximado)
  const nodeModulesPath = path.resolve(__dirname, '../node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    throw new Error('node_modules não encontrado; instale as dependências antes de validar o build.');
  }

  for (const dep of criticalDeps) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) {
      throw new Error(`Dependência crítica "${dep}" está no package.json mas não está instalada.`);
    }
  }

  console.log('\x1b[32mSucesso: Dependências críticas verificadas.\x1b[0m');
} catch (error) {
  console.error('\x1b[31mERRO NO SCRIPT DE VERIFICAÇÃO:\x1b[0m', error.message);
  process.exit(1);
}
