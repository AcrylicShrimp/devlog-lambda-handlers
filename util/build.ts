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
  spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--prefix', path.join(process.cwd(), intPath), ...deps], {
    cwd: path.join(process.cwd(), intPath),
    env: {
      ...process.env,
      npm_config_platform: 'linux',
      npm_config_arch: 'x64',
      npm_config_target: '14.0.0',
    },
  });
if (process.platform === 'win32')
  spawnSync(
    'powershell',
    [
      'Compress-Archive',
      '-Path',
      ['index.js', ...(deps.length ? ['node_modules'] : [])].join(', '),
      '-DestinationPath',
      'artifacts.zip',
      '-CompressionLevel',
      'NoCompression',
    ],
    {
      cwd: path.join(process.cwd(), intPath),
    },
  );
else
  spawnSync('zip', ['-vr', 'artifacts.zip', 'index.js', ...(deps.length ? ['node_modules/'] : []), '-x "*.DS_Store"'], {
    cwd: path.join(process.cwd(), intPath),
  });
fs.renameSync(path.join(intPath, 'artifacts.zip'), path.join('dist', 'artifacts.zip'));
