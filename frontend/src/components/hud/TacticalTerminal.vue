<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useFsmStore } from '../../stores/fsm.store.js';
import { useChatStore } from '../../stores/chat.store.js';
import { useBioStore } from '../../stores/bio.store.js';
import { zipService } from '../../services/zip.service.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const fsm = useFsmStore();
const chatStore = useChatStore();
const bioStore = useBioStore();

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
        texto: `COMANDOS DISPONIBLES:
  help / ayuda          Muestra este catálogo de órdenes
  status                Telemetría del núcleo A.R.E.S. y modelo activo
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
        texto: `ESTADO DEL NÚCLEO A.R.E.S. v2.8 (J.A.R.V.I.S. CORE):
  - Estado: 🟢 ONLINE
  - Avatar: ${fsm.modo3DActivo ? 'Three.js 3D (Voxel Anime)' : 'Canvas 2D'}
  - Postura actual: [${fsm.posturaActual}] // Pose #${fsm.poseActual.id} (${fsm.poseActual.name})
  - Proveedor LLM: ${chatStore.proveedorSeleccionado.toUpperCase()}
  - Modelo activo: ${chatStore.modeloSeleccionado}
  - Memoria: SQLite nativo (node:sqlite)
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
