<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';
import { useChatStore } from '../../stores/chat.store.js';
import { useBioStore } from '../../stores/bio.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import { voiceService } from '../../services/voice.service.js';
import { zipService } from '../../services/zip.service.js';
import axios from 'axios';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const fsm = useFsmStore();
const chatStore = useChatStore();
const bioStore = useBioStore();
const uiStore = useUiStore();

interface LineaTerminal {
  tipo: 'input' | 'output' | 'error' | 'success' | 'system';
  texto: string;
  tiempo: string;
}

const inputComando = ref('');
const historialLineas = ref<LineaTerminal[]>([
  {
    tipo: 'system',
    texto: '🛡️ A.R.E.S. TACTICAL TERMINAL // v2.8 J.A.R.V.I.S. INTERACTIVE SHELL',
    tiempo: new Date().toLocaleTimeString(),
  },
  {
    tipo: 'system',
    texto: 'Escribe "help" o "ayuda" para desplegar el catálogo de comandos de combate.',
    tiempo: new Date().toLocaleTimeString(),
  },
]);

const historialComandos = ref<string[]>([]);
const indiceHistorial = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);
const terminalBodyRef = ref<HTMLDivElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (terminalBodyRef.value) {
      terminalBodyRef.value.scrollTop = terminalBodyRef.value.scrollHeight;
    }
  });
}

function enfocarInput() {
  inputRef.value?.focus();
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    ejecutarComando();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navegarHistorial(-1);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    navegarHistorial(1);
  }
}

function navegarHistorial(direccion: number) {
  if (historialComandos.value.length === 0) return;

  if (direccion === -1) {
    // Flecha Arriba
    if (indiceHistorial.value < historialComandos.value.length - 1) {
      indiceHistorial.value++;
      inputComando.value = historialComandos.value[historialComandos.value.length - 1 - indiceHistorial.value];
    }
  } else {
    // Flecha Abajo
    if (indiceHistorial.value > 0) {
      indiceHistorial.value--;
      inputComando.value = historialComandos.value[historialComandos.value.length - 1 - indiceHistorial.value];
    } else if (indiceHistorial.value === 0) {
      indiceHistorial.value = -1;
      inputComando.value = '';
    }
  }
}

function ejecutarComando() {
  const raw = inputComando.value.trim();
  if (!raw) return;

  const tiempo = new Date().toLocaleTimeString();

  // Guardar en historial
  historialLineas.value.push({
    tipo: 'input',
    texto: `ares@core:~$ ${raw}`,
    tiempo,
  });
  historialComandos.value.push(raw);
  indiceHistorial.value = -1;
  inputComando.value = '';

  const partes = raw.split(/\s+/);
  const cmd = partes[0].toLowerCase();
  const args = partes.slice(1);

  switch (cmd) {
    case 'help':
    case 'ayuda':
      historialLineas.value.push({
        tipo: 'output',
        texto: `COMANDOS DISPONIBLES EN A.R.E.S. v3.5 (SOVEREIGN GIT FORGE CORE):
  help / ayuda          Muestra este catálogo de órdenes
  status                Telemetría del núcleo A.R.E.S., modelo y modo táctico
  forge / assign        Forja Soberana de Ejercicios DDD, Desofuscador de PDFs y Commits Atómicos Git
  radar [open|traffic]  Radar de Arquitectura C4, topología en vivo y caos
  memory [open|search]  Oráculo de Memoria Semántica Vectorial Local y RAG Arquitectónico
  cicd [open|run]       Motor de CI/CD, Workflows industriales y simulación de despliegues
  swarm [monitor|run]   Control y monitor del Enjambre Multi-Agente (Atenea, Vulcano, Mercurio, Némesis)
  agents                Lista los 4 subagentes operativos de la legión
  voice [on|off|toggle] Activa o desactiva la entrada de voz táctica
  audit [github-url]    Ejecuta auditoría profunda de repositorio GitHub (OWASP + C4)
  tactical <modo>       Cambia modo de combate (centinela | blitzkrieg | arquitecto | enjambre)
  export                Descarga la misión actual en archivo Markdown (.md)
  pose <1-16>           Fija la pose del avatar 3D directamente
  posture <postura>     Cambia postura FSM (IDLE, SLASH, SHIELD, SPRINT, VICTORY)
  model [nombre]        Muestra o cambia modelo (gemini, deepseek, r1, claude, gpt4o)
  bio                   Estado de estamina, hidratación y pomodoro
  hydrate               Recarga táctica de hidratación (+15%)
  zip                   Descarga el último proyecto generado en .ZIP
  mode [2d|3d]          Alterna el renderizado del avatar entre 2D y 3D Three.js
  clear / cls           Limpia la pantalla de la terminal
  exit / close          Cierra la terminal táctica`,
        tiempo,
      });
      break;

    case 'status':
      historialLineas.value.push({
        tipo: 'success',
        texto: `ESTADO DEL NÚCLEO A.R.E.S. v3.5 (SOVEREIGN GIT FORGE CORE):
  - Estado: 🟢 ONLINE
  - Modo táctico: ${uiStore.modoTactico.toUpperCase()}
  - Oído digital: ${voiceService.estado.value.toUpperCase()}
  - Avatar: ${fsm.modo3DActivo ? 'Three.js 3D (Voxel Anime)' : 'Canvas 2D'}
  - Postura actual: [${fsm.posturaActual}] // Pose #${fsm.poseActual.id} (${fsm.poseActual.name})
  - Proveedor LLM: ${chatStore.proveedorSeleccionado.toUpperCase()}
  - Modelo activo: ${chatStore.modeloSeleccionado}
  - Memoria: SQLite nativo (node:sqlite) + Vector Memory (128D)
  - Mensajes en sesión: ${chatStore.mensajes.length}`,
        tiempo,
      });
      break;

    case 'pose':
      if (!args[0]) {
        historialLineas.value.push({
          tipo: 'error',
          texto: 'Error: Especifica el número de pose entre 1 y 16. Ej: "pose 11"',
          tiempo,
        });
      } else {
        const idPose = parseInt(args[0], 10);
        if (isNaN(idPose) || idPose < 1 || idPose > 16) {
          historialLineas.value.push({
            tipo: 'error',
            texto: 'Error: Pose inválida. El rango válido es de 1 a 16.',
            tiempo,
          });
        } else {
          fsm.fijarPoseDirecta(idPose as any);
          historialLineas.value.push({
            tipo: 'success',
            texto: `✓ Avatar sincronizado: Pose #${idPose} [${fsm.poseActual.code}] -> ${fsm.poseActual.name}`,
            tiempo,
          });
        }
      }
      break;

    case 'posture':
      if (!args[0]) {
        historialLineas.value.push({
          tipo: 'error',
          texto: 'Error: Especifica la postura: IDLE, SLASH, SHIELD, SPRINT, ERROR o VICTORY.',
          tiempo,
        });
      } else {
        const postura = args[0].toUpperCase() as any;
        const validas = ['IDLE', 'SLASH', 'SHIELD', 'SPRINT', 'ERROR', 'VICTORY'];
        if (!validas.includes(postura)) {
          historialLineas.value.push({
            tipo: 'error',
            texto: `Error: Postura "${args[0]}" no reconocida. Válidas: ${validas.join(', ')}`,
            tiempo,
          });
        } else {
          fsm.cambiarPostura(postura, fsm.poseActual.id);
          historialLineas.value.push({
            tipo: 'success',
            texto: `✓ Postura de combate cambiada a: ${postura}`,
            tiempo,
          });
        }
      }
      break;

    case 'model':
      if (!args[0]) {
        historialLineas.value.push({
          tipo: 'output',
          texto: `Modelo actual: ${chatStore.modeloSeleccionado} (${chatStore.proveedorSeleccionado})\nUsa "model gemini", "model deepseek", "model r1" o "model gpt4o" para alternar.`,
          tiempo,
        });
      } else {
        const target = args[0].toLowerCase();
        if (target.includes('gemini')) {
          chatStore.cambiarModelo('gemini-3-flash-preview', 'gemini');
          historialLineas.value.push({
            tipo: 'success',
            texto: '✓ Motor asignado a: Gemini 3 Flash (Google AI Studio)',
            tiempo,
          });
        } else if (target.includes('r1')) {
          chatStore.cambiarModelo('deepseek/deepseek-r1', 'openrouter');
          historialLineas.value.push({
            tipo: 'success',
            texto: '✓ Motor asignado a: DeepSeek R1 Reasoning (OpenRouter)',
            tiempo,
          });
        } else if (target.includes('deepseek') || target.includes('v3')) {
          chatStore.cambiarModelo('deepseek/deepseek-chat', 'openrouter');
          historialLineas.value.push({
            tipo: 'success',
            texto: '✓ Motor asignado a: DeepSeek V3 (OpenRouter)',
            tiempo,
          });
        } else if (target.includes('gpt')) {
          chatStore.cambiarModelo('openai/gpt-4o', 'openrouter');
          historialLineas.value.push({
            tipo: 'success',
            texto: '✓ Motor asignado a: GPT-4o (OpenAI via OpenRouter)',
            tiempo,
          });
        } else {
          historialLineas.value.push({
            tipo: 'error',
            texto: `Modelo "${args[0]}" no reconocido. Opciones: gemini, deepseek, r1, gpt4o.`,
            tiempo,
          });
        }
      }
      break;

    case 'bio':
      historialLineas.value.push({
        tipo: 'output',
        texto: `TELEMETRÍA BIO-ARMADURA (COMANDANTE):
  - Estamina cognitiva: ${bioStore.estaminaPct}%
  - Nivel de hidratación: ${bioStore.aguaPct}%
  - Tiempo de combate activo: ${Math.floor(bioStore.segundosSesion / 60)} minutos (${bioStore.tiempoSesionFormateado})
  - Pomodoro: ${bioStore.sprintActivo ? 'ACTIVO (Sprint de Enfoque)' : 'EN ESPERA'}`,
        tiempo,
      });
      break;

    case 'hydrate':
      bioStore.hidratar();
      historialLineas.value.push({
        tipo: 'success',
        texto: `💧 Hidratación táctica administrada (+15%). Nivel actual: ${bioStore.aguaPct}%`,
        tiempo,
      });
      break;

    case 'zip':
      // Buscar el último mensaje con archivos generados
      const ultimosMensajes = [...chatStore.mensajes].reverse();
      let encontrado = false;
      for (const m of ultimosMensajes) {
        if (m.role === 'model' && m.content) {
          const files = zipService.extraerArchivosDeTexto(m.content);
          if (files.length > 0) {
            historialLineas.value.push({
              tipo: 'success',
              texto: `📦 Empaquetando ${files.length} archivos en .ZIP...`,
              tiempo,
            });
            zipService.descargarProyectoZip(files, 'proyecto-ares.zip', true);
            encontrado = true;
            break;
          }
        }
      }
      if (!encontrado) {
        historialLineas.value.push({
          tipo: 'error',
          texto: 'No se encontraron proyectos multi-archivo en la sesión actual para exportar.',
          tiempo,
        });
      }
      break;

    case 'mode':
      if (args[0] === '2d' && fsm.modo3DActivo) {
        fsm.toggleModoGrafico();
      } else if (args[0] === '3d' && !fsm.modo3DActivo) {
        fsm.toggleModoGrafico();
      } else if (!args[0]) {
        fsm.toggleModoGrafico();
      }
      historialLineas.value.push({
        tipo: 'output',
        texto: `Modo gráfico asignado: ${fsm.modo3DActivo ? 'Three.js 3D' : 'Canvas 2D'}`,
        tiempo,
      });
      break;

    case 'voice':
    case 'voz':
      if (args[0] === 'off' && voiceService.estado.value === 'escuchando') {
        voiceService.detenerEscucha();
        historialLineas.value.push({
          tipo: 'output',
          texto: '🎙️ Oído digital desactivado.',
          tiempo,
        });
      } else if (args[0] === 'on' && voiceService.estado.value !== 'escuchando') {
        voiceService.iniciarEscucha();
        historialLineas.value.push({
          tipo: 'success',
          texto: '🎙️ Oído digital activado. Puedes hablar con A.R.E.S.',
          tiempo,
        });
      } else {
        voiceService.toggleEscucha();
        historialLineas.value.push({
          tipo: voiceService.estado.value === 'escuchando' ? 'success' : 'output',
          texto: `🎙️ Estado de voz alternado: ${voiceService.estado.value.toUpperCase()}`,
          tiempo,
        });
      }
      break;

    case 'tactical':
      if (!args[0]) {
        historialLineas.value.push({
          tipo: 'output',
          texto: `Modo táctico activo: ${uiStore.modoTactico.toUpperCase()}\nUsa "tactical centinela", "tactical blitzkrieg", "tactical arquitecto" o "tactical enjambre" para cambiar.`,
          tiempo,
        });
      } else {
        const modo = args[0].toLowerCase();
        if (modo === 'centinela' || modo === 'blitzkrieg' || modo === 'arquitecto' || modo === 'enjambre') {
          uiStore.setModoTactico(modo as any);
          historialLineas.value.push({
            tipo: 'success',
            texto: `✓ Modo táctico establecido en: ${modo.toUpperCase()}`,
            tiempo,
          });
        } else {
          historialLineas.value.push({
            tipo: 'error',
            texto: `Modo "${args[0]}" inválido. Opciones válidas: centinela, blitzkrieg, arquitecto, enjambre.`,
            tiempo,
          });
        }
      }
      break;

    case 'swarm':
    case 'enjambre':
      if (args[0] === 'run') {
        const mision = args.slice(1).join(' ');
        if (!mision) {
          historialLineas.value.push({
            tipo: 'error',
            texto: 'Error: Especifica la misión para el enjambre. Ej: "swarm run Diseñar plataforma de subastas con DDD"',
            tiempo,
          });
        } else {
          uiStore.setModoTactico('enjambre');
          chatStore.enviarMensaje(mision);
          emit('cerrar');
        }
      } else if (args[0] === 'monitor' || args[0] === 'open' || args[0] === 'ui') {
        uiStore.modalSwarmAbierto = true;
        historialLineas.value.push({
          tipo: 'success',
          texto: '🐝 Abriendo Monitor de Enjambre Multi-Agente...',
          tiempo,
        });
      } else {
        historialLineas.value.push({
          tipo: 'output',
          texto: `🐝 A.R.E.S. SWARM MULTI-AGENTE SOBERANO (v3.1)
  - Modo Enjambre: ${uiStore.modoTactico === 'enjambre' ? '🟢 ACTIVO' : '⚪ INACTIVO'}
  - Subagentes en la Legión (4):
    • 🏛️ Atenea: Arquitecto de Sistemas & Modelado DDD
    • ⚔️ Vulcano: Forjador Backend & Clean Architecture
    • 🎨 Mercurio: Ingeniero UI/UX Frontend & Live Preview
    • 🧪 Némesis: Centinela QA, Seguridad OWASP & Consenso
  - Comandos:
    • swarm monitor       : Abre el monitor visual del enjambre
    • swarm run <misión>  : Despacha una misión directa a los 4 agentes
    • tactical enjambre   : Activa el modo enjambre en la consola`,
          tiempo,
        });
      }
      break;

    case 'agents':
      historialLineas.value.push({
        tipo: 'output',
        texto: `👥 LEGIÓN DE SUBAGENTES TÁCTICOS DISPONIBLES:
  1. 🏛️ ATENEA   -> Arquitectura, Contextos DDD, Mermaid C4, RFCs
  2. ⚔️ VULCANO  -> TypeScript, Repositorios, Use Cases, Capas Hexagonales
  3. 🎨 MERCURIO -> Vue 3, Tailwind CSS, Live Preview Sandbox
  4. 🧪 NÉMESIS  -> Vitest/Jest, OWASP Top 10, Big-O, Veredicto Consenso`,
        tiempo,
      });
      break;

    case 'audit':
      if (!args[0]) {
        uiStore.modalGithubAuditAbierto = true;
        historialLineas.value.push({
          tipo: 'output',
          texto: '🔍 Abriendo panel visual de Ingesta y Auditoría de GitHub...',
          tiempo,
        });
      } else {
        const urlAudit = args[0];
        historialLineas.value.push({
          tipo: 'output',
          texto: `🔍 Iniciando auditoría táctica de repositorio: ${urlAudit}...`,
          tiempo,
        });
        axios
          .post('/api/audit/github', { url: urlAudit })
          .then((res) => {
            historialLineas.value.push({
              tipo: 'success',
              texto: `✓ Auditoría completada para ${res.data.metadatos?.nombre} (${res.data.metadatos?.totalArchivos} archivos). Abriendo reporte...`,
              tiempo: new Date().toLocaleTimeString(),
            });
            uiStore.modalGithubAuditAbierto = true;
          })
          .catch((err) => {
            historialLineas.value.push({
              tipo: 'error',
              texto: `Error en auditoría: ${err.response?.data?.error || err.message}`,
              tiempo: new Date().toLocaleTimeString(),
            });
          });
      }
      break;

    case 'export':
      if (chatStore.mensajes.length === 0) {
        historialLineas.value.push({
          tipo: 'error',
          texto: 'No hay mensajes en la misión actual para exportar.',
          tiempo,
        });
      } else {
        let docMision = `# 🛡️ INFORME DE MISIÓN TÁCTICA A.R.E.S. (v2.9)\n\n`;
        docMision += `> Fecha: ${new Date().toLocaleString()}\n`;
        docMision += `> Mensajes: ${chatStore.mensajes.length}\n\n---\n\n`;
        for (const m of chatStore.mensajes) {
          docMision += `### [${m.role.toUpperCase()}]\n\n${m.content}\n\n---\n\n`;
        }
        const blobM = new Blob([docMision], { type: 'text/markdown;charset=utf-8' });
        const urlM = URL.createObjectURL(blobM);
        const aM = document.createElement('a');
        aM.href = urlM;
        aM.download = `Mision_ARES_${Date.now()}.md`;
        aM.click();
        URL.revokeObjectURL(urlM);
        historialLineas.value.push({
          tipo: 'success',
          texto: `✓ Misión exportada exitosamente como Markdown.`,
          tiempo,
        });
      }
      break;

    case 'cicd':
    case 'pipeline':
      if (args[0] === 'open' || args[0] === 'ui' || !args[0]) {
        uiStore.modalCicdAbierto = true;
        historialLineas.value.push({
          tipo: 'success',
          texto: '🚀 Abriendo Orquestador Táctico de CI/CD & Despliegues Autónomos...',
          tiempo,
        });
      } else if (args[0] === 'run' || args[0] === 'simulate') {
        uiStore.modalCicdAbierto = true;
        historialLineas.value.push({
          tipo: 'success',
          texto: '🚀 Disparando ejecución de simulación de pipeline en vivo...',
          tiempo,
        });
      } else {
        historialLineas.value.push({
          tipo: 'output',
          texto: `🚀 A.R.E.S. CI/CD ENGINE (v3.2):
  - Comandos:
    • cicd open         : Abre el monitor visual de pipelines y workflows
    • cicd run          : Simula la ejecución completa de las 6 etapas
    • cicd status       : Consulta estado de telemetría y despliegues`,
          tiempo,
        });
      }
      break;

    case 'docker':
    case 'dockerfile':
      uiStore.modalCicdAbierto = true;
      historialLineas.value.push({
        tipo: 'output',
        texto: '🐳 Abriendo Forja de Dockerfiles multi-stage y Compose en CI/CD...',
        tiempo,
      });
      break;

    case 'memory':
    case 'memoria':
    case 'oraculo':
      if (args[0] === 'open' || args[0] === 'ui' || !args[0]) {
        uiStore.modalMemoriaAbierto = true;
        historialLineas.value.push({
          tipo: 'success',
          texto: '🧠 Abriendo Oráculo de Memoria Semántica Vectorial Local (128D Cosine Similarity)...',
          tiempo,
        });
      } else {
        const queryMem = args.join(' ');
        historialLineas.value.push({
          tipo: 'output',
          texto: `🧠 Buscando en memoria vectorial: "${queryMem}"...`,
          tiempo,
        });
        uiStore.modalMemoriaAbierto = true;
      }
      break;

    case 'radar':
    case 'c4':
    case 'architecture':
      if (args[0] === 'traffic' || args[0] === 'stress') {
        uiStore.modalRadarAbierto = true;
        historialLineas.value.push({
          tipo: 'success',
          texto: '🌐 Abriendo Radar C4 e inyectando ráfaga de tráfico (2.5x)...',
          tiempo,
        });
      } else {
        uiStore.modalRadarAbierto = true;
        historialLineas.value.push({
          tipo: 'success',
          texto: '🌐 Abriendo Radar de Arquitectura de Sistemas C4 & Tracing de Eventos...',
          tiempo,
        });
      }
      break;

    case 'forge':
    case 'assign':
    case 'ejercicio':
    case 'git':
      uiStore.modalForgeAbierto = true;
      historialLineas.value.push({
        tipo: 'success',
        texto: '📋 Abriendo Forja Soberana de Ejercicios DDD, Desofuscador de PDFs y Autómata Git (v3.5)...',
        tiempo,
      });
      break;

    case 'clear':
    case 'cls':
      historialLineas.value = [];
      break;

    case 'echo':
      historialLineas.value.push({
        tipo: 'output',
        texto: args.join(' '),
        tiempo,
      });
      break;

    case 'exit':
    case 'close':
    case 'salir':
      emit('cerrar');
      break;

    default:
      historialLineas.value.push({
        tipo: 'error',
        texto: `Comando no reconocido: "${cmd}". Escribe "help" para ver las opciones disponibles.`,
        tiempo,
      });
      break;
  }

  scrollToBottom();
}

onMounted(() => {
  enfocarInput();
  scrollToBottom();
});
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-40 h-80 bg-[#040914]/95 border-t-2 border-[#00ffaa]/60 shadow-[0_-10px_35px_rgba(0,0,0,0.9)] flex flex-col font-mono text-xs backdrop-blur-md"
    @click="enfocarInput"
  >
    <!-- Barra Superior de la Terminal -->
    <div class="px-3 py-1.5 bg-[#091326] border-b border-[#132a4a] flex items-center justify-between text-[11px] select-none shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-2.5 h-2.5 rounded-full bg-[#00ffaa] animate-ping"></div>
        <span class="font-orbitron font-bold text-slate-100 flex items-center gap-1.5">
          <span>>_</span>
          <span>A.R.E.S. TACTICAL TERMINAL // SHELL v2.8</span>
        </span>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-slate-500 hidden sm:inline text-[10px]">
          [Atajo: Ctrl + \`] // Escribe "help"
        </span>
        <button
          type="button"
          @click.stop="historialLineas = []"
          class="text-slate-400 hover:text-white text-[10px] cursor-pointer"
          title="Limpiar salida"
        >
          Limpiar
        </button>
        <button
          type="button"
          @click.stop="emit('cerrar')"
          class="text-rose-400 hover:text-rose-200 text-xs font-bold cursor-pointer px-1 py-0.5 rounded hover:bg-rose-950/40"
          title="Cerrar terminal"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Cuerpo con Scroll y Salida de Comandos -->
    <div ref="terminalBodyRef" class="flex-1 p-3 overflow-y-auto space-y-1 font-mono select-text">
      <div
        v-for="(linea, idx) in historialLineas"
        :key="idx"
        class="leading-relaxed"
        :class="[
          linea.tipo === 'input' ? 'text-slate-200 font-bold' :
          linea.tipo === 'success' ? 'text-[#00ffaa]' :
          linea.tipo === 'error' ? 'text-rose-400' :
          linea.tipo === 'system' ? 'text-cyan-400 font-semibold' : 'text-slate-300'
        ]"
      >
        <span class="text-slate-600 text-[10px] mr-2">[{{ linea.tiempo }}]</span>
        <span class="whitespace-pre-wrap">{{ linea.texto }}</span>
      </div>
    </div>

    <!-- Línea de Prompt y Entrada de Comando -->
    <div class="p-2 border-t border-[#132a4a] bg-[#071329] flex items-center gap-2 shrink-0">
      <span class="text-[#00ffaa] font-bold select-none text-xs flex items-center gap-1">
        <span>ares@core</span>
        <span class="text-cyan-400">:</span>
        <span class="text-slate-300">~$</span>
      </span>
      <input
        ref="inputRef"
        v-model="inputComando"
        type="text"
        @keydown="handleKeydown"
        placeholder="Escribe un comando táctico (ej: status, pose 11, bio, zip, help)..."
        class="flex-1 bg-transparent text-[#00ffaa] focus:outline-none font-mono text-xs placeholder-slate-600 caret-[#00ffaa]"
        autofocus
      />
    </div>
  </div>
</template>
