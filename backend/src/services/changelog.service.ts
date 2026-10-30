/**
 * @fileoverview Servicio de generación automática de CHANGELOG.md y cálculo SemVer.
 * Analiza el historial de Git según el estándar de Conventional Commits.
 * @module services/changelog.service
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface CommitAnalizado {
  hash: string;
  mensaje: string;
  autor: string;
  fecha: string;
  tipo: 'feat' | 'fix' | 'refactor' | 'perf' | 'docs' | 'test' | 'chore' | 'other';
  descripcion: string;
  esBreakingChange: boolean;
}

export interface ResultadoChangelog {
  versionCalculada: string;
  fecha: string;
  commitsPorTipo: Record<string, CommitAnalizado[]>;
  markdown: string;
}

/**
 * Obtiene y clasifica los commits de Git desde el último tag o historial completo.
 */
export function generarChangelog(versionSugerida?: string): ResultadoChangelog {
  let gitOutput = '';
  try {
    gitOutput = execSync('git log -n 50 --pretty=format:"%h|%s|%an|%ad" --date=short', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });
  } catch (err: any) {
    throw new Error(`No se pudo leer el historial de Git: ${err.message}`);
  }

  const lineas = gitOutput.split('\n').filter(Boolean);
  const commits: CommitAnalizado[] = [];

  let tieneBreaking = false;
  let tieneFeat = false;
  let tieneFix = false;

  for (const l of lineas) {
    const partes = l.split('|');
    if (partes.length < 4) continue;
    const [hash, rawMensaje, autor, fecha] = partes;

    const esBreaking = /BREAKING\s+CHANGE/i.test(rawMensaje) || /^[a-z]+(\(.+?\))?!:/.test(rawMensaje);
    if (esBreaking) tieneBreaking = true;

    // Detectar tipo conventional commit
    let tipo: CommitAnalizado['tipo'] = 'other';
    let descripcion = rawMensaje;

    const match = rawMensaje.match(/^([a-z]+)(\(.+?\))?!?:\s*(.+)$/i);
    if (match) {
      const prefijo = match[1].toLowerCase();
      descripcion = match[3];

      if (prefijo === 'feat') {
        tipo = 'feat';
        tieneFeat = true;
      } else if (prefijo === 'fix') {
        tipo = 'fix';
        tieneFix = true;
      } else if (prefijo === 'refactor') {
        tipo = 'refactor';
      } else if (prefijo === 'perf') {
        tipo = 'perf';
      } else if (prefijo === 'docs') {
        tipo = 'docs';
      } else if (prefijo === 'test') {
        tipo = 'test';
      } else if (prefijo === 'chore') {
        tipo = 'chore';
      }
    }

    commits.push({
      hash,
      mensaje: rawMensaje,
      autor,
      fecha,
      tipo,
      descripcion,
      esBreakingChange: esBreaking,
    });
  }

  // Agrupar por tipo
  const grupos: Record<string, CommitAnalizado[]> = {
    feat: commits.filter((c) => c.tipo === 'feat'),
    fix: commits.filter((c) => c.tipo === 'fix'),
    refactor: commits.filter((c) => c.tipo === 'refactor'),
    perf: commits.filter((c) => c.tipo === 'perf'),
    docs: commits.filter((c) => c.tipo === 'docs'),
    test: commits.filter((c) => c.tipo === 'test'),
    chore: commits.filter((c) => c.tipo === 'chore'),
    other: commits.filter((c) => c.tipo === 'other'),
  };

  const fechaHoy = new Date().toISOString().split('T')[0];
  const version = versionSugerida || (tieneBreaking ? '3.0.0' : tieneFeat ? '2.7.0' : tieneFix ? '2.6.1' : '2.6.0');

  // Construir Markdown Keep a Changelog
  let md = `## [${version}] - ${fechaHoy}\n\n`;

  if (grupos.feat.length > 0) {
    md += '### 🚀 Nuevas Funcionalidades (Features)\n';
    for (const c of grupos.feat) {
      md += `- **${c.descripcion}** ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash})) - *${c.autor}*\n`;
    }
    md += '\n';
  }

  if (grupos.fix.length > 0) {
    md += '### 🐛 Correcciones de Errores (Bug Fixes)\n';
    for (const c of grupos.fix) {
      md += `- ${c.descripcion} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
    }
    md += '\n';
  }

  if (grupos.refactor.length > 0) {
    md += '### ⚔️ Refactorización y Arquitectura\n';
    for (const c of grupos.refactor) {
      md += `- ${c.descripcion} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
    }
    md += '\n';
  }

  if (grupos.docs.length > 0) {
    md += '### 🛡️ Documentación y Escudo Aegis\n';
    for (const c of grupos.docs) {
      md += `- ${c.descripcion} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
    }
    md += '\n';
  }

  if (grupos.test.length > 0) {
    md += '### 🧪 Test Forge y Verificación\n';
    for (const c of grupos.test) {
      md += `- ${c.descripcion} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
    }
    md += '\n';
  }

  if (grupos.chore.length > 0 || grupos.other.length > 0) {
    md += '### 🔧 Mantenimiento e Infraestructura\n';
    for (const c of [...grupos.chore, ...grupos.other]) {
      md += `- ${c.descripcion} ([${c.hash}](https://github.com/AI-Innovation-op/ARES/commit/${c.hash}))\n`;
    }
    md += '\n';
  }

  return {
    versionCalculada: version,
    fecha: fechaHoy,
    commitsPorTipo: grupos,
    markdown: md.trim(),
  };
}

/**
 * Guarda o actualiza el archivo CHANGELOG.md en la raíz del repositorio.
 */
export function escribirChangelog(nuevoMarkdown: string, rutaDestino?: string): string {
  const rutaFinal = rutaDestino || path.resolve(process.cwd(), 'CHANGELOG.md');
  const encabezado = `# CHANGELOG: A.R.E.S. Ecosystem\n\nTodos los cambios notables en este proyecto se documentan en este archivo.\nFormato basado en [Keep a Changelog](https://keepachangelog.com/) y adherido a [Semantic Versioning](https://semver.org/).\n\n---\n\n`;

  let contenidoExistente = '';
  if (fs.existsSync(rutaFinal)) {
    contenidoExistente = fs.readFileSync(rutaFinal, 'utf-8').replace(encabezado, '');
  }

  const contenidoCompleto = `${encabezado}${nuevoMarkdown}\n\n${contenidoExistente}`.trim() + '\n';
  fs.writeFileSync(rutaFinal, contenidoCompleto, 'utf-8');

  return rutaFinal;
}
