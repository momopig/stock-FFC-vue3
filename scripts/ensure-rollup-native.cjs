const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function resolveTargetPackage() {
  if (process.platform === 'linux' && process.arch === 'x64') {
    const glibcVersion =
      process.report?.getReport?.()?.header?.glibcVersionRuntime;
    return glibcVersion
      ? '@rollup/rollup-linux-x64-gnu'
      : '@rollup/rollup-linux-x64-musl';
  }

  if (process.platform === 'win32' && process.arch === 'x64') {
    return '@rollup/rollup-win32-x64-msvc';
  }

  return null;
}

function resolveNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function main() {
  if (process.env.ROLLUP_NATIVE_ENSURE_RUNNING === '1') {
    return;
  }

  const targetPackage = resolveTargetPackage();
  if (!targetPackage) {
    return;
  }

  const targetPath = path.join(
    process.cwd(),
    'node_modules',
    ...targetPackage.split('/')
  );
  if (existsSync(targetPath)) {
    return;
  }

  console.warn(
    `[postinstall] missing ${targetPackage}, installing fallback package...`
  );

  const result = spawnSync(
    resolveNpmCommand(),
    ['install', '--no-save', '--legacy-peer-deps', targetPackage],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ROLLUP_NATIVE_ENSURE_RUNNING: '1',
      },
    }
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

main();
