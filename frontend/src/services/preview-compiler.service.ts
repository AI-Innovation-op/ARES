/**
 * @fileoverview Compilador y ensamblador táctico de Live Preview Sandbox (v2.8).
 * Transforma un conjunto de archivos (HTML, CSS, JS o componentes Vue 3 / DDD)
 * en un documento HTML autocontenido y ejecutable dentro de un iframe aislado (srcdoc).
 * @module services/preview-compiler.service
 */

import type { ArchivoProyecto } from './zip.service.js';

export class PreviewCompilerService {
  /**
   * Ensambla un documento HTML completo listo para `iframe.srcdoc`.
   * Incluye TailwindCSS vía CDN, runtime standalone de Vue 3, y captura de logs de consola.
   */
  compilarProyectoParaPreview(archivos: ArchivoProyecto[], titulo = 'A.R.E.S. Live Sandbox'): string {
    // 1. Si existe un index.html personalizado, verificar si contiene todo
    const indexHtml = archivos.find((a) => a.ruta.toLowerCase() === 'index.html');
    const appVue = archivos.find(
      (a) => a.ruta.toLowerCase().endsWith('app.vue') || a.ruta.toLowerCase() === 'src/app.vue'
    );
    const vueFiles = archivos.filter((a) => a.ruta.toLowerCase().endsWith('.vue'));
    const cssFiles = archivos.filter((a) => a.ruta.toLowerCase().endsWith('.css'));
    const jsFiles = archivos.filter(
      (a) =>
        (a.ruta.toLowerCase().endsWith('.ts') || a.ruta.toLowerCase().endsWith('.js')) &&
        !a.ruta.toLowerCase().includes('vite.config')
    );

    // Unificar estilos CSS personalizados
    const estilosCombinados = cssFiles.map((c) => c.contenido).join('\n\n');

    // Extraer template, script y styles si hay App.vue
    let templateVue = '<div class="p-8 text-center"><h1 class="text-2xl font-bold text-slate-800">☕ Aplicación Cargada</h1></div>';
    let scriptVue = 'export default {}';

    if (appVue) {
      const { template, script } = this.desglosarSFCVue(appVue.contenido);
      if (template) templateVue = template;
      if (script) scriptVue = script;
    } else if (vueFiles.length > 0) {
      // Usar el primer componente .vue encontrado
      const { template, script } = this.desglosarSFCVue(vueFiles[0].contenido);
      if (template) templateVue = template;
      if (script) scriptVue = script;
    } else if (indexHtml && indexHtml.contenido.includes('<body')) {
      // Si ya es un index.html con contenido rico directo
      return this.inyectarIntercepcionLogs(indexHtml.contenido);
    }

    // Normalizar el script exportado de Vue para convertirlo en objeto accesible por Vue 3 CDN
    const scriptLimpio = this.adaptarScriptVue(scriptVue);

    // Ensamblar código de modelos / repositorios JS si existen
    const scriptsDominio = jsFiles
      .filter((f) => !f.ruta.toLowerCase().endsWith('main.ts') && !f.ruta.toLowerCase().endsWith('main.js'))
      .map((f) => `// ${f.ruta}\n${this.limpiarImportsTypeScript(f.contenido)}`)
      .join('\n\n');

    return `<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
  <!-- Tailwind CSS CDN para renderizado instantáneo -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Vue 3 Global Runtime -->
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <style>
    /* Estilos base del Sandbox */
    ${estilosCombinados}
  </style>
  <script>
    // Captura táctica de logs para el visor del Sandbox
    window.__ARES_LOGS__ = [];
    ['log', 'warn', 'error', 'info'].forEach(method => {
      const original = console[method];
      console[method] = function(...args) {
        window.__ARES_LOGS__.push({
          type: method,
          message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
          time: new Date().toLocaleTimeString()
        });
        original.apply(console, args);
        if (window.parent) {
          window.parent.postMessage({ type: 'ARES_SANDBOX_LOG', logs: window.__ARES_LOGS__ }, '*');
        }
      };
    });
  </script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased min-h-full font-sans">
  <div id="app">
    ${templateVue}
  </div>

  <script>
    try {
      ${scriptsDominio}

      const AppDefinition = ${scriptLimpio};

      const { createApp } = Vue;
      const app = createApp(AppDefinition);
      app.mount('#app');
      console.log('✅ A.R.E.S. Live Sandbox inicializado exitosamente.');
    } catch (err) {
      console.error('💥 Error en Live Sandbox:', err.message);
      document.getElementById('app').innerHTML = \`
        <div class="p-6 m-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-mono text-xs">
          <div class="font-bold text-sm mb-2">⚠️ Excepción en Live Sandbox:</div>
          <div>\${err.message}</div>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
  }

  /**
   * Desglosa un archivo Single File Component (.vue) en <template>, <script> y <style>.
   */
  private desglosarSFCVue(contenido: string): { template: string; script: string; style: string } {
    const matchTemplate = contenido.match(/<template>([\s\S]*?)<\/template>/i);
    const matchScript = contenido.match(/<script(?:[^>]*)>([\s\S]*?)<\/script>/i);
    const matchStyle = contenido.match(/<style(?:[^>]*)>([\s\S]*?)<\/style>/i);

    return {
      template: matchTemplate ? matchTemplate[1].trim() : '',
      script: matchScript ? matchScript[1].trim() : '',
      style: matchStyle ? matchStyle[1].trim() : '',
    };
  }

  /**
   * Limpia imports y tipados de TypeScript para ejecución directa en navegador sin bundler.
   */
  private limpiarImportsTypeScript(tsCode: string): string {
    return tsCode
      .replace(/import\s+[^;]+;?/g, '')
      .replace(/export\s+(?:default\s+)?/g, '')
      .replace(/:\s*[A-Z][a-zA-Z0-9_<>\[\]|]+/g, '')
      .replace(/interface\s+[A-Za-z0-9_]+[\s\S]*?\{[\s\S]*?\}/g, '')
      .replace(/type\s+[A-Za-z0-9_]+\s*=[^;]+;/g, '');
  }

  /**
   * Adapta la definición del componente Vue para montaje con Vue 3 CDN.
   */
  private adaptarScriptVue(scriptCode: string): string {
    if (!scriptCode.trim()) {
      return '{ data() { return {}; } }';
    }

    let code = this.limpiarImportsTypeScript(scriptCode);

    // Si es script setup o export default
    if (code.includes('export default')) {
      code = code.replace(/export\s+default\s+/, '');
      return code.trim();
    }

    // Si tiene variables / funciones sueltas (estilo script setup)
    return `{
      setup() {
        ${code}
        return {};
      }
    }`;
  }

  /**
   * Inyecta captura de logs en archivos index.html preexistentes.
   */
  private inyectarIntercepcionLogs(html: string): string {
    const scriptLog = `<script>
      window.__ARES_LOGS__ = [];
      ['log', 'warn', 'error', 'info'].forEach(method => {
        const original = console[method];
        console[method] = function(...args) {
          window.__ARES_LOGS__.push({
            type: method,
            message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
            time: new Date().toLocaleTimeString()
          });
          original.apply(console, args);
          if (window.parent) {
            window.parent.postMessage({ type: 'ARES_SANDBOX_LOG', logs: window.__ARES_LOGS__ }, '*');
          }
        };
      });
    </script>`;

    return html.replace('<head>', `<head>\n${scriptLog}`);
  }
}

export const previewCompilerService = new PreviewCompilerService();
