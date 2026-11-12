#!/usr/bin/env node
// Pubblica la cartella di lavoro locale sul server Oracle e lancia deploy.sh.
// Uso: pnpm run publish:oracle   (opzioni: --dry-run, --no-deploy)
// Requisiti su Windows: ssh e tar (inclusi in Windows 10/11 o Git Bash) e
// l'host "oracle-server" configurato in ~/.ssh/config.
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.TAOTL_SSH_HOST ?? 'oracle-server';
const REMOTE_DIR = 'Taotl-game'; // relativo alla home remota
const STAGING = '.Taotl-game-upload'; // cartella temporanea remota

// Esclusioni: nomi di file/cartelle, a qualsiasi livello.
const EXCLUDE = [
  'node_modules', 'dist', 'build', '.git', '.claude',
  '.playwright-mcp', '.superpowers', 'test-results', 'playwright-report',
  'taotl.zip', '.mcp.json', 'skills-lock.json',
];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const noDeploy = args.has('--no-deploy');

/** Elenca i file da caricare (percorsi relativi con "/"), applicando EXCLUDE. */
function collect(dir = ROOT, rel = '') {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.includes(ent.name)) continue;
    const r = rel ? `${rel}/${ent.name}` : ent.name;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collect(abs, r));
    else if (ent.isFile()) out.push({ rel: r, size: statSync(abs).size });
  }
  return out;
}

function ssh(cmd, opts = {}) {
  const res = spawnSync('ssh', ['-o', 'BatchMode=yes', HOST, cmd], { stdio: 'inherit', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`ssh "${cmd.slice(0, 60)}..." uscito con codice ${res.status}`);
}

/** tar (locale) | ssh "tar -x" (remoto). */
function upload() {
  return new Promise((resolve, reject) => {
    const excl = EXCLUDE.flatMap((e) => ['--exclude', e]);
    const tar = spawn('tar', ['-czf', '-', ...excl, '.'], {
      cwd: ROOT, // niente -C: GNU tar leggerebbe "C:" come host remoto
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const remote = spawn(
      'ssh',
      ['-o', 'BatchMode=yes', HOST, `rm -rf ~/${STAGING} && mkdir -p ~/${STAGING} && tar -xzf - -C ~/${STAGING}`],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    let bytes = 0;
    tar.stdout.on('data', (c) => (bytes += c.length));
    tar.stdout.pipe(remote.stdin);
    let tarCode;
    tar.on('error', reject);
    remote.on('error', reject);
    tar.on('close', (c) => (tarCode = c));
    remote.on('close', (c) => {
      if (tarCode !== 0) return reject(new Error(`tar uscito con codice ${tarCode}`));
      if (c !== 0) return reject(new Error(`ssh/tar remoto uscito con codice ${c}`));
      resolve(bytes);
    });
  });
}

const mb = (n) => (n / 1024 / 1024).toFixed(2);

const files = collect();
const total = files.reduce((s, f) => s + f.size, 0);
console.log(`==> ${files.length} file da caricare (${mb(total)} MB non compressi) verso ${HOST}:~/${REMOTE_DIR}`);
if (dryRun) {
  for (const f of files) console.log(`    ${f.rel}`);
  process.exit(0);
}

const sent = await upload();
console.log(`==> trasferiti ${files.length} file, ${mb(sent)} MB compressi (${mb(total)} MB non compressi)`);

// Sincronizza lo staging nella cartella finale: --delete rimuove i file
// cancellati in locale, ma preserva node_modules e dist del server.
const rsyncExcl = EXCLUDE.map((e) => `--exclude='${e}'`).join(' ');
ssh(
  `mkdir -p ~/${REMOTE_DIR} && rsync -a --delete ${rsyncExcl} ~/${STAGING}/ ~/${REMOTE_DIR}/ ` +
    `&& rm -rf ~/${STAGING} && chmod +x ~/${REMOTE_DIR}/deploy.sh && echo '==> sincronizzato in ~/${REMOTE_DIR}'`,
);

if (noDeploy) {
  console.log('==> --no-deploy: deploy.sh non eseguito');
} else {
  ssh(`bash ~/${REMOTE_DIR}/deploy.sh`);
}
