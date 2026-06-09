import { access, copyFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backendDir = path.join(projectRoot, 'backend');
const isWindows = process.platform === 'win32';
const args = new Set(process.argv.slice(2));
const resetDatabase = args.has('--reset-database') || args.has('--resetDatabase');

function step(message) {
  process.stdout.write(`\n==> ${message}\n`);
}

function commandName(name) {
  if (!isWindows) {
    return name;
  }

  if (name === 'npm') {
    return 'npm.cmd';
  }

  return `${name}.exe`;
}

async function ensureCommand(name) {
  try {
    await run(commandName(name), ['--version'], { captureOutput: true });
  } catch {
    throw new Error(`Required command '${name}' was not found. Please install it and try again.`);
  }
}

async function ensureFileFromExample(targetPath, examplePath) {
  try {
    await access(targetPath, fsConstants.F_OK);
  } catch {
    await copyFile(examplePath, targetPath);
    process.stdout.write(`Created ${targetPath} from template.\n`);
  }
}

function run(file, argsList, options = {}) {
  const {
    cwd = projectRoot,
    captureOutput = false,
  } = options;
  const isCmdScript = isWindows && file.toLowerCase().endsWith('.cmd');
  const actualFile = isCmdScript ? 'cmd.exe' : file;
  const actualArgs = isCmdScript ? ['/d', '/s', '/c', file, ...argsList] : argsList;

  return new Promise((resolve, reject) => {
    const child = spawn(actualFile, actualArgs, {
      cwd,
      stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: false,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    if (captureOutput) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Command failed (${code}): ${file} ${argsList.join(' ')}\n${stderr}`));
    });
  });
}

async function waitForContainerHealth(containerName, timeoutMs = 180_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await run(commandName('docker'), ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}', containerName], {
        captureOutput: true,
      });
      const state = result.stdout.trim();
      if (state === 'healthy' || state === 'running') {
        return;
      }
    } catch {
      // keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Container '${containerName}' did not become healthy within ${timeoutMs / 1000} seconds.`);
}

async function waitForHttpOk(url, timeoutMs = 180_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`Endpoint '${url}' did not respond successfully within ${timeoutMs / 1000} seconds.`);
}

async function main() {
  step('Checking required tools');
  await ensureCommand('docker');
  await ensureCommand('npm');
  await run(commandName('docker'), ['info'], { captureOutput: true });

  step('Preparing environment files');
  await ensureFileFromExample(path.join(projectRoot, 'infrastructure/mysql/.env'), path.join(projectRoot, 'infrastructure/mysql/.env.example'));
  await ensureFileFromExample(path.join(backendDir, '.env'), path.join(backendDir, '.env.example'));
  await ensureFileFromExample(path.join(projectRoot, '.env.local'), path.join(projectRoot, '.env.example'));

  if (resetDatabase) {
    step('Resetting Docker services and database volume');
    await run(commandName('docker'), ['compose', 'down', '-v']);
  }

  step('Installing frontend dependencies');
  await run(commandName('npm'), ['install', '--no-audit', '--no-fund'], { cwd: projectRoot });

  step('Installing backend dependencies');
  await run(commandName('npm'), ['install', '--no-audit', '--no-fund'], { cwd: backendDir });

  step('Starting MySQL and Adminer');
  await run(commandName('docker'), ['compose', 'up', '-d', 'mysql', 'adminer']);

  step('Waiting for MySQL to become healthy');
  await waitForContainerHealth('rafef-tech-mysql84');

  step('Running backend migrations and seed data');
  await run(commandName('npm'), ['run', 'db:setup'], { cwd: backendDir });

  step('Building backend');
  await run(commandName('npm'), ['run', 'build'], { cwd: backendDir });

  step('Building frontend');
  await run(commandName('npm'), ['run', 'build'], { cwd: projectRoot });

  step('Starting backend, frontend, and reverse proxy');
  await run(commandName('docker'), ['compose', 'up', '-d', 'backend', 'frontend', 'caddy']);

  step('Waiting for API health endpoint');
  await waitForHttpOk('http://localhost/api/health');

  step('Setup completed successfully');
  process.stdout.write('Application: http://localhost\n');
  process.stdout.write('Frontend:    http://localhost:5173\n');
  process.stdout.write('Backend API: http://localhost:3000\n');
  process.stdout.write('Adminer:     http://localhost:8080\n');
  process.stdout.write('Admin login: admin / admin123\n');
}

main().catch((error) => {
  process.stderr.write(`\nSetup failed: ${error.message}\n`);
  process.exitCode = 1;
});
