import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const intPath = path.join('dist', 'intermediates', 'exp-deps');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = [];

if (pkg.dependencies) for (const dep in pkg.dependencies) deps.push(`${dep}@${pkg.dependencies[dep]}`);

fs.mkdirSync(path.join(intPath), { recursive: true });
fs.renameSync(path.join('dist', 'index.js'), path.join(intPath, 'index.js'));
if (deps.length)
  spawnSync('npm', ['install', '--prefix', path.join(process.cwd(), intPath), ...deps], {
    cwd: path.join(process.cwd(), intPath),
    env: {
      ...process.env,
      npm_config_platform: 'linux',
      npm_config_arch: 'x64',
      npm_config_target: '14.0.0',
    },
  });
spawnSync('zip', ['-r', 'artifacts.zip', 'index.js', ...(deps.length ? ['node_modules'] : [])], {
  cwd: path.join(process.cwd(), intPath),
});
fs.renameSync(path.join(intPath, 'artifacts.zip'), path.join('dist', 'artifacts.zip'));
