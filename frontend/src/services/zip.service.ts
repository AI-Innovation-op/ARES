/**
 * @fileoverview Servicio táctico de empaquetado y exportación de proyectos en .ZIP (v2.7).
 * Extrae archivos estructurados desde respuestas de A.R.E.S., complementa
 * scaffolding (Vite + Vue / Node) y compila un archivo .ZIP descargable en cliente.
 * @module services/zip.service
 */

import JSZip from 'jszip';

export interface ArchivoProyecto {
  ruta: string;
  contenido: string;
  lenguaje?: string;
}

export class ZipService {
  /**
   * Extrae de forma heurística y robusta todos los archivos definidos en un texto Markdown.
   * Soporta múltiples convenciones de A.R.E.S.:
   * 1. `### File: path/to/file.ext` seguido de valla de código
   * 2. `**Archivo:** `path/to/file.ext``
   * 3. ````lang:path/to/file.ext````
   * 4. Encabezados de comentario `// File: path/to/file.ext` al inicio del código
   */
  extraerArchivosDeTexto(texto: string): ArchivoProyecto[] {
    const archivos: ArchivoProyecto[] = [];
    const rutasDetectadas = new Set<string>();

    // Patrón 1: ### File: <ruta> o ### Archivo: <ruta> seguido de ```lang\n...```
    const regexPatron1 = /(?:###|##|\*\*)\s*(?:File|Archivo):\s*`?([a-zA-Z0-9_\-\./\\]+)`?\s*\n+```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/gi;
    let match: RegExpExecArray | null;

    while ((match = regexPatron1.exec(texto)) !== null) {
      const ruta = this.limpiarRuta(match[1]);
      const lenguaje = match[2]?.trim() || 'text';
      const contenido = match[3]?.trim();

      if (ruta && contenido && !rutasDetectadas.has(ruta)) {
        rutasDetectadas.add(ruta);
        archivos.push({ ruta, contenido, lenguaje });
      }
    }

    // Patrón 2: ```lang:path/to/file.ext\n...```
    const regexPatron2 = /```([a-zA-Z0-9_-]+):([a-zA-Z0-9_\-\./\\]+)\n([\s\S]*?)```/gi;
    while ((match = regexPatron2.exec(texto)) !== null) {
      const lenguaje = match[1]?.trim();
      const ruta = this.limpiarRuta(match[2]);
      const contenido = match[3]?.trim();

      if (ruta && contenido && !rutasDetectadas.has(ruta)) {
        rutasDetectadas.add(ruta);
        archivos.push({ ruta, contenido, lenguaje });
      }
    }

    // Patrón 3 Avanzado: Bloques de código con una o múltiples directivas de archivo
    // Soporta bloques con múltiples archivos: // FILE: ruta1 \n ... \n // FILE: ruta2 \n ...
    const regexBloqueCodigo = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/gi;
    let matchBloque: RegExpExecArray | null;

    while ((matchBloque = regexBloqueCodigo.exec(texto)) !== null) {
      const lenguajeBloque = matchBloque[1]?.trim() || 'text';
      const cuerpo = matchBloque[2];

      // Buscar separadores de archivo: // FILE: ruta, <!-- FILE: ruta -->, /* FILE: ruta */
      const partes = cuerpo.split(/(?:^|\n)(?=(?:\/\/|\/\*|<!--|#)\s*(?:File|Archivo):\s*[a-zA-Z0-9_\-\./\\]+)/i);

      if (partes.length > 1) {
        for (const parte of partes) {
          const matchSub = parte.match(/^(?:(?:\/\/|\/\*|<!--|#)\s*(?:File|Archivo):\s*([a-zA-Z0-9_\-\./\\]+)(?:\s*\*\/|-->)?)\r?\n([\s\S]*)$/i);
          if (matchSub) {
            const ruta = this.limpiarRuta(matchSub[1]);
            const contenido = matchSub[2]?.trim();
            if (ruta && contenido && !rutasDetectadas.has(ruta)) {
              rutasDetectadas.add(ruta);
              archivos.push({ ruta, contenido, lenguaje: this.deducirLenguajePorExtension(ruta, lenguajeBloque) });
            }
          }
        }
      } else {
        // Bloque con un solo archivo al inicio
        const matchSingle = cuerpo.match(/^(?:(?:\/\/|\/\*|<!--|#)\s*(?:File|Archivo):\s*([a-zA-Z0-9_\-\./\\]+)(?:\s*\*\/|-->)?)\r?\n([\s\S]*)$/i);
        if (matchSingle) {
          const ruta = this.limpiarRuta(matchSingle[1]);
          const contenido = matchSingle[2]?.trim();
          if (ruta && contenido && !rutasDetectadas.has(ruta)) {
            rutasDetectadas.add(ruta);
            archivos.push({ ruta, contenido, lenguaje: this.deducirLenguajePorExtension(ruta, lenguajeBloque) });
          }
        }
      }
    }

    // Patrón 4: SIEMPRE extraer bloques completos de HTML (<!DOCTYPE o <html o <head o <body)
    // Estos bloques son vitales para el Live Preview Sandbox en tiempo real.
    const regexHtml = /```(?:html|xml)?\s*\n([\s\S]*?(?:<!DOCTYPE|<html|<head|<body)[\s\S]*?)```/gi;
    let matchHtml: RegExpExecArray | null;
    let htmlIdx = 1;
    while ((matchHtml = regexHtml.exec(texto)) !== null) {
      const contenido = matchHtml[1]?.trim();
      if (contenido) {
        const ruta = htmlIdx === 1 ? 'index.html' : `preview-${htmlIdx}.html`;
        const existente = archivos.find((a) => a.ruta === ruta);
        if (!existente) {
          rutasDetectadas.add(ruta);
          archivos.push({ ruta, contenido, lenguaje: 'html' });
        } else if (contenido.length > existente.contenido.length && (contenido.includes('<script') || contenido.includes('Vue'))) {
          // Si encontramos una versión más rica o interactiva del HTML, actualizar index.html
          existente.contenido = contenido;
        }
        htmlIdx++;
      }
    }

    // Patrón 5: Si no hay archivos .vue explícitos, extraer bloques <template>
    if (!archivos.some((a) => a.ruta.endsWith('.vue'))) {
      const regexVue = /```(?:vue)?\s*\n([\s\S]*?<template[\s\S]*?)```/gi;
      let matchVue: RegExpExecArray | null;
      let vueIdx = 1;
      while ((matchVue = regexVue.exec(texto)) !== null) {
        const contenido = matchVue[1]?.trim();
        if (contenido) {
          const ruta = vueIdx === 1 ? 'src/App.vue' : `src/components/Component-${vueIdx}.vue`;
          if (!rutasDetectadas.has(ruta)) {
            rutasDetectadas.add(ruta);
            archivos.push({ ruta, contenido, lenguaje: 'vue' });
            vueIdx++;
          }
        }
      }
    }

    return archivos;
  }

  /**
   * Limpia y normaliza la ruta de archivo para evitar caracteres inválidos o escapes.
   * Elimina los segmentos vacíos, "." y ".." para que una ruta nunca pueda salir de la carpeta del ZIP.
   */
  private limpiarRuta(ruta: string): string {
    return ruta
      .replace(/[*`"']/g, '')
      .split(/[\\/]+/)
      .map((segmento) => segmento.trim())
      .filter((segmento) => segmento !== '' && segmento !== '.' && segmento !== '..')
      .join('/');
  }

  /**
   * Deduce el lenguaje adecuado según la extensión del archivo.
   */
  private deducirLenguajePorExtension(ruta: string, defaultLang: string): string {
    const ext = ruta.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
        return 'typescript';
      case 'js':
        return 'javascript';
      case 'vue':
        return 'vue';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'sql':
        return 'sql';
      default:
        return defaultLang || 'text';
    }
  }

  /**
   * Si el usuario solicitó un proyecto frontend (ej: Vue + Vite con DDD) pero la IA solo
   * entregó los componentes o modelos específicos, este método inyecta automáticamente
   * los archivos esenciales de entorno (package.json, vite.config.ts, index.html) para que
   * el .ZIP sea ejecutable al 100% con `npm install && npm run dev`.
   */
  enriquecerScaffold(archivos: ArchivoProyecto[], nombreProyecto = 'ares-tactical-app'): ArchivoProyecto[] {
    const rutas = new Set(archivos.map((a) => a.ruta.toLowerCase()));
    const resultado = [...archivos];

    const esVue = archivos.some((a) => a.ruta.endsWith('.vue') || a.contenido.includes('<template>'));

    // 1. Inyectar package.json si no existe
    if (!rutas.has('package.json')) {
      const packageJson = {
        name: nombreProyecto.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        private: true,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: esVue
          ? {
              vue: '^3.5.0',
            }
          : {},
        devDependencies: {
          vite: '^6.2.0',
          typescript: '^5.8.0',
          ...(esVue ? { '@vitejs/plugin-vue': '^5.2.0' } : {}),
        },
      };

      resultado.push({
        ruta: 'package.json',
        contenido: JSON.stringify(packageJson, null, 2),
        lenguaje: 'json',
      });
    }

    // 2. Inyectar vite.config.ts si es proyecto Vite y no existe
    if (esVue && !rutas.has('vite.config.ts') && !rutas.has('vite.config.js')) {
      resultado.push({
        ruta: 'vite.config.ts',
        contenido: `import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Configuración forjada por A.R.E.S. v2.7
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
});
`,
        lenguaje: 'typescript',
      });
    }

    // 3. Inyectar index.html si no existe
    if (esVue && !rutas.has('index.html')) {
      resultado.push({
        ruta: 'index.html',
        contenido: `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${nombreProyecto} // A.R.E.S. Scaffold</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
        lenguaje: 'html',
      });
    }

    // 4. Inyectar src/main.ts si falta y hay App.vue
    if (esVue && !rutas.has('src/main.ts') && !rutas.has('src/main.js')) {
      resultado.push({
        ruta: 'src/main.ts',
        contenido: `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`,
        lenguaje: 'typescript',
      });
    }

    // 5. Inyectar README.md si no existe
    if (!rutas.has('readme.md')) {
      resultado.push({
        ruta: 'README.md',
        contenido: `# ⚡ ${nombreProyecto}

> Proyecto generado y forjado tácticamente por **A.R.E.S. v2.7 (J.A.R.V.I.S. Core)**.

## 🚀 Puesta en Marcha Inmediata:

\`\`\`bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
\`\`\`

## 🏛️ Arquitectura:
- Estructura desacoplada bajo principios de Domain-Driven Design (DDD) y Clean Code.
- Empaquetado listo para producción.
`,
        lenguaje: 'markdown',
      });
    }

    return resultado;
  }

  /**
   * Genera el archivo .ZIP comprimido en el navegador y desencadena la descarga inmediata.
   */
  async descargarProyectoZip(
    archivos: ArchivoProyecto[],
    nombreZip = 'proyecto-ares.zip',
    enriquecer = true
  ): Promise<void> {
    const listaFinal = enriquecer ? this.enriquecerScaffold(archivos, nombreZip.replace('.zip', '')) : archivos;

    if (listaFinal.length === 0) {
      throw new Error('No hay archivos para empaquetar en el .ZIP');
    }

    const zip = new JSZip();

    for (const arch of listaFinal) {
      // JSZip maneja automáticamente carpetas separadas por '/'
      zip.file(arch.ruta, arch.contenido);
    }

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Desencadenar descarga nativa en el navegador
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreZip.endsWith('.zip') ? nombreZip : `${nombreZip}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const zipService = new ZipService();
