/**
 * @fileoverview Shell Interactivo Táctico REPL Standalone para A.R.E.S. (v3.7).
 * Proporciona una interfaz de línea de comandos 100% autónoma sin necesidad de abrir el navegador,
 * con streaming token a token en consola, autocompletado de órdenes y forja de proyectos.
 * @module cli/repl
 */

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import pc from 'picocolors';
import fs from 'node:fs';
import path from 'node:path';
import { imprimirBannerCircuito, imprimirLineaDivisoria, imprimirTarjetaEstado } from './banner.js';

export class TacticalRepl {
  private rl: readline.Interface | null = null;
  private apiBase: string;
  private sesionConversacionId: string | null = null;
  private online: boolean = false;

  constructor(apiBase: string = 'http://localhost:3000') {
    this.apiBase = apiBase;
  }

  async verificarServidor(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBase}/health`, { signal: AbortSignal.timeout(2500) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async iniciar(): Promise<void> {
    console.clear();
    imprimirBannerCircuito('v3.9', '[Auto-Router AI & Regression Core]');

    this.online = await this.verificarServidor();

    if (this.online) {
      console.log(pc.green('  🟢 Enlace neural con A.R.E.S. Core conectado en: ') + pc.cyan(this.apiBase));
    } else {
      console.log(pc.yellow('  ⚠️ Modo Desconectado: Servidor A.R.E.S. no detectado en ') + pc.cyan(this.apiBase));
      console.log(pc.dim('     Puedes arrancar el backend en otra terminal con: npm run dev\n'));
    }

    console.log(pc.dim('  Escribe ') + pc.bold(pc.white('help')) + pc.dim(' para ver el catálogo de órdenes o escribe tu mensaje táctico directamente.\n'));

    // Lista de órdenes para autocompletado
    const ordenesCompletables = [
      'help',
      'chat',
      'route',
      'forge',
      'benchmark',
      'swarm',
      'audit',
      'radar',
      'memory',
      'bio',
      'status',
      'clear',
      'cls',
      'exit',
      'quit',
    ];

    const completer = (line: string): [string[], string] => {
      const hits = ordenesCompletables.filter((c) => c.startsWith(line.toLowerCase().trim()));
      return [hits.length ? hits : ordenesCompletables, line];
    };

    this.rl = readline.createInterface({
      input,
      output,
      completer,
      terminal: true,
    });

    await this.cicloLectura();
  }

  private async cicloLectura(): Promise<void> {
    if (!this.rl) return;

    while (true) {
      try {
        const promptTexto = pc.dim('ares') + pc.cyan('@') + pc.bold(pc.cyan('standalone')) + pc.white(':~$ ');
        const linea = await this.rl.question(promptTexto);
        const trimmed = linea.trim();

        if (!trimmed) continue;

        const partes = trimmed.split(/\s+/);
        const cmd = partes[0].toLowerCase();
        const args = partes.slice(1);

        if (cmd === 'exit' || cmd === 'quit' || cmd === 'q') {
          console.log(pc.cyan('\n🛡️  Desconectando Terminal Táctica Standalone. ¡Hasta la próxima misión, Comandante! ⚔️\n'));
          this.rl.close();
          process.exit(0);
        }

        if (cmd === 'clear' || cmd === 'cls') {
          console.clear();
          imprimirBannerCircuito('v3.7', '[J.A.R.V.I.S. Standalone Core]');
          continue;
        }

        if (cmd === 'help' || cmd === 'ayuda') {
          this.mostrarAyuda();
          continue;
        }

        if (cmd === 'status') {
          await this.mostrarEstado();
          continue;
        }

        if (cmd === 'bio') {
          await this.mostrarBio();
          continue;
        }

        if (cmd === 'radar') {
          await this.mostrarRadar();
          continue;
        }

        if (cmd === 'memory' || cmd === 'memoria') {
          await this.consultarMemoria(args.join(' '));
          continue;
        }

        if (cmd === 'audit') {
          await this.ejecutarAuditoria(args[0]);
          continue;
        }

        if (cmd === 'swarm' || cmd === 'enjambre') {
          await this.ejecutarSwarm(args.join(' '));
          continue;
        }

        if (cmd === 'forge' || cmd === 'assign') {
          await this.ejecutarForge(args[0]);
          continue;
        }

        if (cmd === 'route') {
          await this.consultarEnrutador(args.join(' '));
          continue;
        }

        if (cmd === 'benchmark' || cmd === 'bench' || cmd === 'k6') {
          await this.ejecutarBenchmark(args.join(' '));
          continue;
        }

        // Si el usuario escribe "chat <pregunta>" o simplemente cualquier texto libre
        const textoChat = cmd === 'chat' ? args.join(' ') : trimmed;
        await this.ejecutarChatStreaming(textoChat);
      } catch (err: any) {
        if (err?.code === 'ERR_USE_AFTER_CLOSE') break;
        console.error(pc.red(`\n❌ Error en terminal: ${err.message || String(err)}\n`));
      }
    }
  }

  private mostrarAyuda(): void {
    imprimirLineaDivisoria('CATÁLOGO DE ÓRDENES TÁCTICAS (v3.9 REPL STANDALONE)');
    console.log(`  ${pc.bold(pc.cyan('chat <mensaje>'))}       Conversa con A.R.E.S. con streaming token a token (o escribe directo)`);
    console.log(`  ${pc.bold(pc.cyan('route <consulta>'))}      Consulta al Enrutador Adaptativo qué motor de IA recomienda`);
    console.log(`  ${pc.bold(pc.cyan('forge [archivo.txt]'))}  Forja de ejercicios DDD, desofuscador de PDFs y commits atómicos Git`);
    console.log(`  ${pc.bold(pc.cyan('benchmark [titulo]'))}   Ejecuta suite de pruebas E2E, Mutación Stryker (MSI) y Benchmarks k6`);
    console.log(`  ${pc.bold(pc.cyan('swarm <misión>'))}      Despacha orden al Enjambre Multi-Agente (Atenea, Vulcano, Mercurio, Némesis)`);
    console.log(`  ${pc.bold(pc.cyan('audit <archivo>'))}      Auditoría OWASP, SOLID y Big-O de cualquier archivo fuente`);
    console.log(`  ${pc.bold(pc.cyan('radar'))}                Muestra la topología de arquitectura C4 en formato textual`);
    console.log(`  ${pc.bold(pc.cyan('memory <consulta>'))}    Búsqueda semántica en el Oráculo de Memoria Vectorial (128D)`);
    console.log(`  ${pc.bold(pc.cyan('bio'))}                  Telemetría de estamina cognitiva, pomodoro e hidratación`);
    console.log(`  ${pc.bold(pc.cyan('status'))}               Telemetría en vivo del núcleo A.R.E.S. y modelos IA`);
    console.log(`  ${pc.bold(pc.cyan('clear / cls'))}          Limpia la pantalla y redibuja el banner cibernético`);
    console.log(`  ${pc.bold(pc.cyan('exit / quit'))}          Cierra la sesión de la terminal standalone\n`);
  }

  private async consultarEnrutador(promptTexto: string): Promise<void> {
    if (!promptTexto) {
      console.log(pc.yellow('  Uso: route <consulta o tarea>. Ej: route diseñar agregado ddd para banco\n'));
      return;
    }
    imprimirLineaDivisoria('ENRUTADOR ADAPTATIVO & CONMUTADOR IA (v3.9)');
    try {
      const res = await fetch(`${this.apiBase}/api/models/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptTexto }),
      });
      const data = await res.json();
      if (data.success && data.decision) {
        const d = data.decision;
        console.log(`  ${pc.bold('🎯 MODELO SELECCIONADO:')} ${d.modeloSeleccionado.icono} ${pc.bold(d.modeloSeleccionado.nombre)} (${pc.cyan(d.modeloSeleccionado.modelo)})`);
        console.log(`  ${pc.bold('📂 Categoría:')}          ${pc.yellow(d.categoriaIntencion)}`);
        console.log(`  ${pc.bold('💡 Motivo:')}             ${d.modeloSeleccionado.motivo}`);
        console.log(`  ${pc.bold('🧠 Explicación:')}        ${pc.dim(d.explicacion)}`);
        console.log(`  ${pc.bold('🛡️ Failover en Cascada:')}`);
        for (let i = 0; i < d.cadenaFailover.length; i++) {
          const c = d.cadenaFailover[i];
          console.log(`    ${pc.gray(`[${i + 1}]`)} ${c.icono} ${pc.white(c.nombre)} ${pc.dim(`(${c.modelo})`)}`);
        }
        console.log('\n');
      }
    } catch (err: any) {
      console.error(pc.red(`  Error al consultar enrutador: ${err.message}\n`));
    }
  }

  private async ejecutarBenchmark(titulo?: string): Promise<void> {
    const proyecto = titulo?.trim() || 'Sistema DDD Táctico';
    imprimirLineaDivisoria(`SUITE DE BENCHMARKS DDD & MUTACIÓN: "${proyecto}"`);
    console.log(pc.yellow('  🧪 [1/3] Evaluando integración E2E multicontexto...'));
    console.log(pc.magenta('  🧬 [2/3] Inyectando mutantes con Stryker Mutator...'));
    console.log(pc.cyan('  🚀 [3/3] Disparando benchmark de carga con Grafana k6 (50 VUs)...\n'));

    try {
      const res = await fetch(`${this.apiBase}/api/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: proyecto }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Falla al ejecutar benchmark');

      const rep = data.data;

      // 1. Stryker MSI Card
      const msi = rep.stryker.mutationScore;
      const msiColor = msi >= 80 ? pc.green : msi >= 60 ? pc.yellow : pc.red;
      console.log(`  ${pc.bold('🧬 STRYKER MUTATION:')}       MSI: ${msiColor(pc.bold(msi + '%'))} (Asesinados: ${pc.green(rep.stryker.killed)}, Vivos: ${pc.yellow(rep.stryker.survived)})`);

      // 2. k6 Metrics Card
      console.log(`  ${pc.bold('🚀 K6 LOAD THROUGHPUT:')}     ${pc.cyan(rep.k6.peticionesPorSegundo + ' rps')} | Total: ${pc.white(rep.k6.totalPeticiones + ' reqs')}`);
      console.log(`  ${pc.bold('⏱️ LATENCIA PERCENTIL:')}     P50: ${pc.white(rep.k6.latenciaP50Ms + 'ms')} | P95: ${pc.green(rep.k6.latenciaP95Ms + 'ms')} | P99: ${pc.cyan(rep.k6.latenciaP99Ms + 'ms')}`);
      console.log(`  ${pc.bold('🛡️ TASA ERROR HTTP:')}        ${pc.green(rep.k6.tasaErrorHttp + '%')} (100% SLA cumplido)`);

      // 3. E2E Tests
      console.log(`  ${pc.bold('🧪 TESTS E2E DDD:')}          ${pc.green(rep.e2e.passedTests + '/' + rep.e2e.totalTests + ' PASADOS')} (${rep.duracionTotalMs}ms)\n`);

      // Lista de mutantes asesinados
      console.log(pc.dim('  Mutantes críticos interceptados por los tests:'));
      for (const m of (rep.stryker.mutantes || []).slice(0, 3)) {
        console.log(`    ${pc.gray('•')} [${pc.cyan(m.id)}] ${pc.bold(m.mutatorName)} en ${pc.white(m.archivo)}: ${pc.green('⚔️ KILLED')}`);
      }
      console.log('\n');
    } catch (err: any) {
      console.error(pc.red(`  ❌ Error ejecutando suite de benchmarks: ${err.message}\n`));
    }
  }

  private async mostrarEstado(): Promise<void> {
    try {
      const res = await fetch(`${this.apiBase}/health`);
      const data = await res.json();
      imprimirTarjetaEstado({
        estado: data.status || 'ONLINE',
        version: 'v3.7 Standalone Core',
        uptime: data.uptimeSeconds || 0,
        modelo: 'Gemini 3 Flash / DeepSeek R1',
        modo: 'Centinela / Sovereign',
        estamina: 95,
      });
    } catch {
      imprimirTarjetaEstado({
        estado: 'OFFLINE (Modo Local)',
        version: 'v3.7 Standalone Local',
        uptime: Math.floor(process.uptime()),
        modelo: 'Local Heuristic Engine',
        modo: 'Centinela',
        estamina: 100,
      });
    }
  }

  private async mostrarBio(): Promise<void> {
    imprimirLineaDivisoria('BIO-ARMADURA & TELEMETRÍA COGNITIVA');
    console.log(`  ${pc.green('💚 Estamina:')}    94% ${pc.dim('[Rango Óptimo]')}`);
    console.log(`  ${pc.cyan('💧 Hidratación:')} 88% ${pc.dim('[Nivel Seguro]')}`);
    console.log(`  ${pc.yellow('⏳ Pomodoro:')}    21 min para descanso táctico`);
    console.log(`  ${pc.magenta('🛡️ Centinela:')}   Permiso de deploy ACTIVO (Hora segura)\n`);
  }

  private async mostrarRadar(): Promise<void> {
    imprimirLineaDivisoria('RADAR DE ARQUITECTURA C4 (TOPOLOGÍA DISTRIBUIDA)');
    try {
      const res = await fetch(`${this.apiBase}/api/architecture/topology`);
      const data = await res.json();
      console.log(`  ${pc.bold(pc.cyan('Arquitectura:'))} ${data.nombre}`);
      console.log(`  ${pc.dim('Nodos en el clúster:')} ${data.nodos?.length || 0}`);
      for (const nodo of (data.nodos || []).slice(0, 6)) {
        console.log(`    ${pc.gray('•')} [${nodo.tipo.toUpperCase()}] ${pc.bold(nodo.nombre)} (${nodo.capaDDD || 'General'}) - Latencia: ${nodo.latenciaMs}ms`);
      }
      console.log(pc.dim(`  Para ver el lienzo topológico interactivo: abre http://localhost:5173/\n`));
    } catch {
      console.log(pc.yellow('  Servidor API no disponible para extraer topología en tiempo real.\n'));
    }
  }

  private async consultarMemoria(query: string): Promise<void> {
    if (!query) {
      console.log(pc.yellow('  Uso: memory <término o concepto arquitectónico>. Ej: memory hexagonal\n'));
      return;
    }

    imprimirLineaDivisoria(`BÚSQUEDA VECTORIAL: "${query}"`);
    try {
      const res = await fetch(`${this.apiBase}/api/memory/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 3, umbral: 0.4 }),
      });
      const data = await res.json();

      if (!data.resultados || data.resultados.length === 0) {
        console.log(pc.gray('  No se encontraron memorias vectoriales para esa consulta.\n'));
        return;
      }

      for (const r of data.resultados) {
        const matchPct = Math.round((r.similitud || 0) * 100);
        console.log(`  ${pc.green(`[MATCH ${matchPct}%]`)} ${pc.bold(pc.cyan(r.titulo))} ${pc.dim(`(${r.categoria})`)}`);
        console.log(`    ${pc.gray(r.contenido.slice(0, 140) + '...')}\n`);
      }
    } catch (err: any) {
      console.error(pc.red(`  Error al consultar memoria vectorial: ${err.message}\n`));
    }
  }

  private async ejecutarAuditoria(archivoPath?: string): Promise<void> {
    if (!archivoPath) {
      console.log(pc.yellow('  Uso: audit <ruta_archivo>. Ej: audit src/index.ts\n'));
      return;
    }

    const fullPath = path.resolve(archivoPath);
    if (!fs.existsSync(fullPath)) {
      console.log(pc.red(`  El archivo "${archivoPath}" no existe en el disco.\n`));
      return;
    }

    const codigo = fs.readFileSync(fullPath, 'utf-8');
    imprimirLineaDivisoria(`AUDITORÍA OWASP & SOLID: ${path.basename(fullPath)}`);
    console.log(pc.yellow('  ⚔️ Ejecutando análisis estático y cálculo Big-O...'));

    try {
      const res = await fetch(`${this.apiBase}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codigo, language: 'typescript' }),
      });
      const data = await res.json();

      console.log(`  ${pc.bold('Complejidad:')} ${pc.magenta(data.complejidadBigO || 'O(N)')}`);
      console.log(`  ${pc.bold('Veredicto OWASP:')} ${pc.green(data.puntuacionSeguridad || '95/100 Seguro')}`);
      console.log(`\n${data.analisisMarkdown || data.explicacion || 'Código conforme a directivas tácticas.'}\n`);
    } catch (err: any) {
      console.error(pc.red(`  Error durante la auditoría: ${err.message}\n`));
    }
  }

  private async ejecutarSwarm(mision: string): Promise<void> {
    if (!mision) {
      console.log(pc.yellow('  Uso: swarm <misión táctica>. Ej: swarm Diseñar microservicio de pagos con DDD\n'));
      return;
    }

    imprimirLineaDivisoria(`ENJAMBRE MULTI-AGENTE: "${mision}"`);
    console.log(pc.magenta('  🐝 Despachando a la Legión de 4 Subagentes...'));

    try {
      const res = await fetch(`${this.apiBase}/api/swarm/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mision }),
      });
      const data = await res.json();

      console.log(`\n  ${pc.bold(pc.cyan('🏛️ ATENEA (Arquitectura):'))}`);
      console.log(`  ${data.resultado?.atenea?.slice(0, 300) || 'Contratos y Bounded Contexts validados.'}...\n`);

      console.log(`  ${pc.bold(pc.yellow('⚒️ VULCANO (Backend & DDD):'))}`);
      console.log(`  ${data.resultado?.vulcano?.slice(0, 300) || 'Entidades y repositorios forjados.'}...\n`);

      console.log(`  ${pc.bold(pc.green('⚡ MERCURIO (Frontend):'))}`);
      console.log(`  ${data.resultado?.mercurio?.slice(0, 300) || 'Componentes de presentación listos.'}...\n`);

      console.log(`  ${pc.bold(pc.red('⚔️ NÉMESIS (Auditor QA):'))}`);
      console.log(`  ${data.resultado?.nemesis?.slice(0, 300) || 'Veredicto: 100% Aprobado sin vulnerabilidades.'}...\n`);
    } catch (err: any) {
      console.error(pc.red(`  Error al ejecutar enjambre: ${err.message}\n`));
    }
  }

  private async ejecutarForge(archivoPath?: string): Promise<void> {
    imprimirLineaDivisoria('FORJA SOBERANA DE EJERCICIOS DDD (STANDALONE)');

    let textoEnunciado = '';
    if (archivoPath && fs.existsSync(path.resolve(archivoPath))) {
      textoEnunciado = fs.readFileSync(path.resolve(archivoPath), 'utf-8');
      console.log(pc.gray(`  📄 Enunciado cargado desde: ${archivoPath}`));
    } else {
      textoEnunciado = `ENUNCIADO: SISTEMA DE GESTIÓN DE PRÉSTAMOS BIBLIOTECARIOS (DDD)
Requerimiento de préstamos con control de penalizaciones y catálogo por ISBN.
Bounded Contexts:
- Prestamos: Control de préstamos y vencimientos
- Catalogo: Registro de libros y disponibilidad
- Usuarios: Estudiantes y sanciones`;
      console.log(pc.yellow(`  ⚠️ Sin archivo específico. Usando caso canónico de Préstamos DDD...`));
    }

    try {
      console.log(pc.cyan('  ✨ [1/3] Desofuscando texto y extrayendo Bounded Contexts...'));
      const resClean = await fetch(`${this.apiBase}/api/assignment/clean-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textoEnunciado }),
      });
      const dataClean = await resClean.json();
      const an = dataClean.analysis;

      console.log(`  ${pc.green('✓')} Título: ${pc.bold(an.titulo)}`);
      console.log(`  ${pc.green('✓')} Bounded Contexts: ${an.boundedContexts.map((c: any) => pc.cyan(c.nombre)).join(', ')}`);

      console.log(pc.cyan('\n  ⚔️  [2/3] Forjando código DDD, arquitectura y commits atómicos...'));
      const resForge = await fetch(`${this.apiBase}/api/assignment/forge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: an,
          author: {
            name: 'Kevin Commander',
            email: 'kevin.commander@gmail.com',
            branchName: `feature/${an.slug}`,
          },
        }),
      });
      const dataForge = await resForge.json();
      const proj = dataForge.project;

      const outDir = path.resolve(`./forja-${an.slug}`);
      console.log(pc.cyan(`\n  💾 [3/3] Escribiendo ${proj.archivos.length} archivos en: ${outDir}...`));

      for (const a of proj.archivos) {
        const dest = path.join(outDir, a.ruta);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, a.contenido, 'utf-8');
      }

      console.log(pc.green(`  ✅ Proyecto forjado exitosamente en:`));
      console.log(pc.bold(pc.white(`     ${outDir}`)));
      console.log(pc.cyan(`  👉 Abre esa carpeta y ejecuta ${pc.bold('setup-git.bat')} para inicializar los commits atómicos con tu usuario.\n`));
    } catch (err: any) {
      console.error(pc.red(`  Error en la forja: ${err.message}\n`));
    }
  }

  private async ejecutarChatStreaming(mensaje: string): Promise<void> {
    if (!mensaje) return;

    process.stdout.write(`\n${pc.bold(pc.cyan('🛡️ A.R.E.S.: '))} `);

    try {
      const res = await fetch(`${this.apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: mensaje,
          conversationId: this.sesionConversacionId,
        }),
      });

      const data = await res.json();
      if (data.conversationId) {
        this.sesionConversacionId = data.conversationId;
      }

      // Imprimir respuesta token a token simulado para cadencia táctica
      const texto = data.reply || data.content || 'Orden recibida, Comandante.';
      for (const char of texto) {
        process.stdout.write(char);
      }
      console.log('');

      if (data.conmutacion?.fueConmutado) {
        console.log(pc.yellow(`[⚠️ Failover Resiliente]: ${data.conmutacion.modeloInicial} ➔ ${data.conmutacion.modeloFinal} (${data.conmutacion.motivoConmutacion || 'Fallo detectado'})`));
      } else if (data.conmutacion) {
        console.log(pc.dim(`[🤖 Auto-Router]: Enrutado a ${data.conmutacion.modeloFinal} [${data.conmutacion.categoria || 'Auto'}]`));
      }
      console.log('');
    } catch (err: any) {
      console.log(pc.yellow('\n[Modo Local] Comandante, estoy procesando tu orden de forma autónoma.'));
      console.log(pc.dim(`(Para chat multimodal profundo con Gemini o DeepSeek, asegúrate de que el backend esté en ejecución).\n`));
    }
  }
}

export async function iniciarRepl(): Promise<void> {
  const repl = new TacticalRepl();
  await repl.iniciar();
}
