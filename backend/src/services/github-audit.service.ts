/**
 * @fileoverview Servicio táctico de Ingesta y Auditoría de Repositorios GitHub (v2.9).
 * Extrae la estructura de directorios, manifiestos de dependencias y código clave,
 * y genera un informe de auditoría industrial (OWASP, Big-O, Diagrama C4 y Refactoring).
 * @module services/github-audit.service
 */

import { invocarLLM } from './llm.service.js';

export interface MetadatosGitHub {
  owner: string;
  repo: string;
  nombreCompleto: string;
  descripcion: string;
  stars: number;
  forks: number;
  lenguajePrincipal: string;
  ramaDefault: string;
  urlHtml: string;
  archivosPrincipales: string[];
  manifiestos: {
    ruta: string;
    contenido: string;
  }[];
}

export interface ResultadoAuditoriaGitHub {
  metadatos: {
    nombre: string;
    propietario: string;
    url: string;
    stars: number;
    forks: number;
    lenguaje: string;
    totalArchivos: number;
  };
  arbolDirectorios: string[];
  informeMarkdown: string;
  diagramaMermaid?: string;
}

export class GithubAuditService {
  /**
   * Parsea una URL de GitHub para extraer propietario y nombre de repositorio.
   */
  extraerPropietarioYRepo(url: string): { owner: string; repo: string } | null {
    const regex = /github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)/i;
    const match = url.match(regex);
    if (!match) return null;

    const owner = match[1];
    const repo = match[2].replace(/\.git$/i, '').replace(/\/$/, '');
    return { owner, repo };
  }

  /**
   * Obtiene la estructura del repositorio mediante la API pública de GitHub.
   */
  async obtenerEstructuraRepositorio(url: string): Promise<MetadatosGitHub> {
    const parsed = this.extraerPropietarioYRepo(url);
    if (!parsed) {
      throw new Error(`URL de GitHub no válida: "${url}". Debe tener el formato https://github.com/owner/repo`);
    }

    const { owner, repo } = parsed;
    const headers: Record<string, string> = {
      'User-Agent': 'ARES-Tactical-Auditor/2.9',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Obtener metadatos básicos
    const respRepo = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!respRepo.ok) {
      if (respRepo.status === 404) {
        throw new Error(`El repositorio ${owner}/${repo} no existe o es privado.`);
      }
      if (respRepo.status === 403) {
        throw new Error(`Límite de tasa de la API de GitHub alcanzado. Intente de nuevo más tarde o configure un GITHUB_TOKEN.`);
      }
      throw new Error(`Error al consultar GitHub API: ${respRepo.statusText} (${respRepo.status})`);
    }

    const dataRepo = (await respRepo.json()) as any;
    const ramaDefault = dataRepo.default_branch || 'main';

    // 2. Obtener árbol de archivos recursivo
    let archivosPrincipales: string[] = [];
    try {
      const respTree = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${ramaDefault}?recursive=1`,
        { headers }
      );
      if (respTree.ok) {
        const dataTree = (await respTree.json()) as any;
        if (Array.isArray(dataTree.tree)) {
          archivosPrincipales = dataTree.tree
            .filter((item: any) => item.type === 'blob')
            .map((item: any) => item.path);
        }
      }
    } catch (err) {
      console.warn('⚠️ No se pudo obtener el árbol completo de GitHub, continuando con análisis básico:', err);
    }

    // 3. Identificar y descargar manifiestos clave (package.json, requirements.txt, Dockerfile, README.md, etc.)
    const manifiestosDeseados = [
      'package.json',
      'requirements.txt',
      'go.mod',
      'Cargo.toml',
      'pom.xml',
      'build.gradle',
      'composer.json',
      'Dockerfile',
      'docker-compose.yml',
      'tsconfig.json',
      'README.md',
    ];

    const manifiestos: { ruta: string; contenido: string }[] = [];
    const archivosAInspeccionar = archivosPrincipales.filter((ruta) => {
      const nombreArchivo = ruta.split('/').pop()?.toLowerCase();
      return nombreArchivo && manifiestosDeseados.map((m) => m.toLowerCase()).includes(nombreArchivo);
    }).slice(0, 5); // Limitar a los 5 manifiestos más relevantes

    for (const ruta of archivosAInspeccionar) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ramaDefault}/${ruta}`;
        const rawResp = await fetch(rawUrl, { headers });
        if (rawResp.ok) {
          const txt = await rawResp.text();
          manifiestos.push({
            ruta,
            contenido: txt.slice(0, 4000), // Limitar tamaño de cada archivo para optimizar contexto
          });
        }
      } catch (err) {
        console.warn(`No se pudo descargar ${ruta}:`, err);
      }
    }

    return {
      owner,
      repo,
      nombreCompleto: dataRepo.full_name || `${owner}/${repo}`,
      descripcion: dataRepo.description || 'Sin descripción',
      stars: dataRepo.stargazers_count || 0,
      forks: dataRepo.forks_count || 0,
      lenguajePrincipal: dataRepo.language || 'Desconocido',
      ramaDefault,
      urlHtml: dataRepo.html_url || url,
      archivosPrincipales,
      manifiestos,
    };
  }

  /**
   * Ejecuta la auditoría táctica industrial mediante el LLM de A.R.E.S.
   */
  async auditarRepositorio(url: string): Promise<ResultadoAuditoriaGitHub> {
    const meta = await this.obtenerEstructuraRepositorio(url);

    // Muestra resumida del árbol (primeros 50 archivos clave)
    const arbolResumido = meta.archivosPrincipales.slice(0, 60).join('\n');

    // Manifiestos formateados
    const manifiestosTexto = meta.manifiestos
      .map((m) => `### Manifiesto: ${m.ruta}\n\`\`\`\n${m.contenido}\n\`\`\``)
      .join('\n\n');

    const promptAuditoria = `
[ORDEN DE COMBATE: AUDITORÍA TÁCTICA DE REPOSITORIO GITHUB v2.9]
Comandante, audita a fondo el siguiente repositorio público de código fuente:

REPOSITORIO: ${meta.nombreCompleto} (${meta.urlHtml})
DESCRIPCIÓN: ${meta.descripcion}
LENGUAJE PRINCIPAL: ${meta.lenguajePrincipal}
ESTRELLAS: ${meta.stars} | FORKS: ${meta.forks} | RAMA PRINCIPAL: ${meta.ramaDefault}
TOTAL DE ARCHIVOS DETECTADOS: ${meta.archivosPrincipales.length}

ÁRBOL DE DIRECTORIOS (MUESTRA ESTRUCTURAL):
\`\`\`
${arbolResumido}
\`\`\`

MANIFIESTOS Y ARCHIVOS DE CONFIGURACIÓN DETECTADOS:
${manifiestosTexto || 'No se pudieron descargar manifiestos directos.'}

DIRECTRICES DE AUDITORÍA DE A.R.E.S. (STAFF PRINCIPAL ENGINEER):
1. **Resumen Ejecutivo y Score de Salud (0/100)**: Evalúa robustez, modularidad y claridad de arquitectura.
2. **Diagrama de Arquitectura C4 (Mermaid)**: Entrega un diagrama mermaid completo de tipo \`graph TD\` o \`flowchart TD\` mapeando capas, componentes, frontend/backend y almacenamiento.
3. **Análisis de Vulnerabilidades y Seguridad OWASP**: Fuga de secretos, saneamiento de entradas, configuraciones por defecto, dependencias de riesgo.
4. **Análisis de Deuda Técnica y Complejidad (Big-O)**: Detecta cuellos de botella en la estructura observada.
5. **Plan de Blindaje y Refactorización Táctica**: 3 a 5 pasos accionables inmediatos bajo principios DDD, Clean Architecture y Clean Code.
`;

    const respuestaLLM = await invocarLLM({
      contents: [
        {
          role: 'user',
          parts: [{ text: promptAuditoria }],
        },
      ],
      enableSearch: true,
    });

    // Extraer diagrama Mermaid si fue generado
    const matchMermaid = respuestaLLM.texto.match(/```mermaid\s*\n([\s\S]*?)```/i);
    const diagramaMermaid = matchMermaid ? matchMermaid[1].trim() : undefined;

    return {
      metadatos: {
        nombre: meta.repo,
        propietario: meta.owner,
        url: meta.urlHtml,
        stars: meta.stars,
        forks: meta.forks,
        lenguaje: meta.lenguajePrincipal,
        totalArchivos: meta.archivosPrincipales.length,
      },
      arbolDirectorios: meta.archivosPrincipales.slice(0, 100),
      informeMarkdown: respuestaLLM.texto,
      diagramaMermaid,
    };
  }
}

export const githubAuditService = new GithubAuditService();
