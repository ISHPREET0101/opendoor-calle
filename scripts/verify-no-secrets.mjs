import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['app', 'components', 'lib', 'db', 'tests', 'scripts'];
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md']);
const forbidden = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /calle_[A-Za-z0-9_-]{20,}/g,
  /CALL_E_API_KEY\s*=\s*[^\s#]+/g,
];
const findings = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (allowedExtensions.has(extname(path))) {
      const source = await readFile(path, 'utf8');
      for (const pattern of forbidden) {
        for (const match of source.matchAll(pattern)) findings.push(`${path}: ${match[0].slice(0, 12)}…`);
      }
    }
  }
}

for (const root of roots) await scan(root);
if (findings.length) {
  console.error('Potential secrets found:\n' + findings.join('\n'));
  process.exit(1);
}
console.log('No credential-shaped values found in source or test files.');
