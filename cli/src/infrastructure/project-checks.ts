import fs from 'node:fs';
import { spawn, execFile } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import type {
  CheckPlan,
  CheckResult,
  ProjectChecks,
} from '../verification/application/verify-project.js';
import { AresError } from '../shared/domain/errors.js';
import { LocalWorkspace, hash, readCurrent } from './workspace.js';
import { redact, terminalText } from './text.js';

export class NodeProjectChecks implements ProjectChecks {
  plan(target: string, script: string): CheckPlan {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(script))
      throw new AresError('VALIDATION', 'Nombre de script inválido.');
    if (!fs.existsSync(target))
      throw new AresError('NOT_FOUND', `No existe el proyecto: ${target}`);
    const root = fs.realpathSync(target);
    if (!fs.statSync(root).isDirectory())
      throw new AresError('VALIDATION', 'El proyecto debe ser un directorio.');
    const source = readCurrent(root, 'package.json');
    if (source === null)
      throw new AresError(
        'NOT_FOUND',
        'El proyecto requiere su propio package.json; no se buscan scripts en carpetas superiores.',
      );
    let manifest: { scripts?: Record<string, unknown> };
    try {
      manifest = JSON.parse(source);
    } catch {
      throw new AresError('VALIDATION', 'package.json inválido.');
    }
    const command = manifest?.scripts?.[script];
    if (typeof command !== 'string' || !command.trim() || command.length > 16_000)
      throw new AresError('VALIDATION', `No existe un script válido llamado ${script}.`);
    const snapshot = new LocalWorkspace(undefined, { inheritRepositoryRules: false }).scan(root);
    const inputs = snapshot.files
      .map((file) => [file.path, file.hash])
      .sort(([a], [b]) => a.localeCompare(b, 'en'));
    return Object.freeze({
      root,
      script,
      command,
      fingerprint: hash(JSON.stringify({ inputs, manifest: hash(source) })),
      sourceFiles: snapshot.files.length,
      limited: snapshot.truncated || snapshot.skipped > 0,
    });
  }

  async run(plan: CheckPlan, timeoutMs: number, signal?: AbortSignal): Promise<CheckResult> {
    const current = this.plan(plan.root, plan.script);
    if (current.fingerprint !== plan.fingerprint)
      throw new AresError('CONFLICT', 'El proyecto cambió antes de iniciar el script.');
    if (signal?.aborted)
      throw new AresError('CANCELLED', 'Verificación cancelada antes de ejecutarse.');
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const child = spawn(process.execPath, ['--run', plan.script], {
        cwd: plan.root,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        detached: process.platform !== 'win32',
      });
      let termination: CheckResult['termination'] = 'exited';
      let truncated = false,
        stdout = '',
        stderr = '',
        completed = false;
      const outDecoder = new StringDecoder('utf8'),
        errDecoder = new StringDecoder('utf8');
      const append = (previous: string, chunk: string) => {
        const text = previous + chunk;
        if (text.length > 32_000) truncated = true;
        return text.slice(-32_000);
      };
      child.stdout.on('data', (chunk) => {
        stdout = append(stdout, outDecoder.write(chunk));
      });
      child.stderr.on('data', (chunk) => {
        stderr = append(stderr, errDecoder.write(chunk));
      });
      const killTree = () => {
        if (!child.pid) return;
        if (process.platform === 'win32') {
          execFile(
            'taskkill.exe',
            ['/PID', String(child.pid), '/T', '/F'],
            { windowsHide: true, timeout: 5000 },
            (error) => {
              if (error && !completed) child.kill();
            },
          );
        } else {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch {
            child.kill('SIGKILL');
          }
        }
      };
      const cancel = () => {
        if (!completed && termination === 'exited') {
          termination = 'cancelled';
          killTree();
        }
      };
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(() => {
        if (!completed && termination === 'exited') {
          termination = 'timed-out';
          killTree();
        }
      }, timeoutMs);
      const cleanup = () => {
        completed = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      };
      const secrets = Object.entries(process.env)
        .filter(
          ([name, value]) => /key|token|secret|password/i.test(name) && value && value.length >= 8,
        )
        .map(([, value]) => value as string);
      const clean = (text: string) => {
        let output = terminalText(redact(text));
        for (const secret of secrets) output = output.split(secret).join('[REDACTED]');
        return output;
      };
      child.on('error', () => {
        cleanup();
        reject(new AresError('IO', 'No se pudo iniciar el proceso de verificación.'));
      });
      child.on('close', (exitCode, exitSignal) => {
        cleanup();
        stdout = append(stdout, outDecoder.end());
        stderr = append(stderr, errDecoder.end());
        resolve({
          exitCode,
          signal: exitSignal,
          durationMs: Math.round(performance.now() - started),
          termination,
          stdout: clean(stdout),
          stderr: clean(stderr),
          outputTruncated: truncated,
        });
      });
      if (signal?.aborted) cancel();
    });
  }
}
