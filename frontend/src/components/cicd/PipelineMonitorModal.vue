<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import {
  CicdFrontendService,
  type PipelineExecution,
  type CicdTemplate,
  type AuditResult,
} from '../../services/cicd.service.js';
import { useChatStore } from '../../stores/chat.store.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const chatStore = useChatStore();

// Pestañas principales
const tabActiva = ref<'grafo' | 'forja' | 'auditor'>('grafo');

// Estado del pipeline
const ejecucion = ref<PipelineExecution | null>(null);
const pasoSeleccionadoId = ref<string>('lint-types');
const simulando = ref(false);
const abortarStream = ref<(() => void) | null>(null);
const mensajeRollback = ref<string | null>(null);

// Catálogo de plantillas
const templates = ref<CicdTemplate[]>([]);
const templateSeleccionadoId = ref<string>('render-fullstack');
const subtabArchivo = ref<'workflow' | 'dockerfile' | 'compose' | 'dockerignore'>('workflow');
const copiadoExitoso = ref(false);

// Auditor de seguridad
const yamlParaAuditar = ref<string>('');
const resultadoAuditoria = ref<AuditResult | null>(null);
const auditando = ref(false);

const templateActual = computed(() => {
  return templates.value.find((t) => t.id === templateSeleccionadoId.value) || templates.value[0];
});

const pasoSeleccionado = computed(() => {
  if (!ejecucion.value) return null;
  return ejecucion.value.steps.find((s) => s.id === pasoSeleccionadoId.value) || ejecucion.value.steps[0];
});

const codigoArchivoActual = computed(() => {
  if (!templateActual.value) return '';
  switch (subtabArchivo.value) {
    case 'workflow':
      return templateActual.value.archivos.workflowYaml;
    case 'dockerfile':
      return templateActual.value.archivos.dockerfile;
    case 'compose':
      return templateActual.value.archivos.dockerComposeProd || '# No requiere docker-compose para este target.';
    case 'dockerignore':
      return templateActual.value.archivos.dockerignore;
    default:
      return '';
  }
});

const nombreArchivoActual = computed(() => {
  switch (subtabArchivo.value) {
    case 'workflow':
      return '.github/workflows/deploy.yml';
    case 'dockerfile':
      return 'Dockerfile';
    case 'compose':
      return 'docker-compose.prod.yml';
    case 'dockerignore':
      return '.dockerignore';
    default:
      return 'archivo.txt';
  }
});

onMounted(async () => {
  try {
    templates.value = await CicdFrontendService.listarTemplates();
    ejecucion.value = await CicdFrontendService.obtenerEstado();
    if (templates.value.length > 0) {
      yamlParaAuditar.value = templates.value[0].archivos.workflowYaml;
    }
  } catch (error) {
    console.error('Error cargando datos de CI/CD:', error);
  }
});

onUnmounted(() => {
  if (abortarStream.value) {
    abortarStream.value();
  }
});

function iniciarSimulacionPipeline() {
  if (simulando.value) return;
  simulando.value = true;
  mensajeRollback.value = null;

  if (abortarStream.value) {
    abortarStream.value();
  }

  abortarStream.value = CicdFrontendService.simularPipelineStream(
    (nuevoEstado) => {
      ejecucion.value = nuevoEstado;
      const stepActivo = nuevoEstado.steps.find((s) => s.status === 'running');
      if (stepActivo) {
        pasoSeleccionadoId.value = stepActivo.id;
      }
    },
    () => {
      simulando.value = false;
      abortarStream.value = null;
    },
    (err) => {
      console.error('Fallo en stream de CI/CD:', err);
      simulando.value = false;
      abortarStream.value = null;
    }
  );
}

function ejecutarRollback() {
  mensajeRollback.value = '🚨 [ROLLBACK EJECUTADO] Revertido con éxito a la versión previa estable (v3.1.0). El tráfico en Render Cloud ha sido re-enrutado.';
  setTimeout(() => {
    mensajeRollback.value = null;
  }, 6000);
}

async function ejecutarAuditoria() {
  if (!yamlParaAuditar.value.trim()) return;
  auditando.value = true;
  try {
    resultadoAuditoria.value = await CicdFrontendService.auditarWorkflow(yamlParaAuditar.value);
  } catch (error) {
    console.error('Error auditando workflow:', error);
  } finally {
    auditando.value = false;
  }
}

function copiarAlPortapapeles(texto: string) {
  navigator.clipboard.writeText(texto);
  copiadoExitoso.value = true;
  setTimeout(() => {
    copiadoExitoso.value = false;
  }, 2000);
}

function descargarArchivoActual() {
  const blob = new Blob([codigoArchivoActual.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoActual.value.split('/').pop() || 'config.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function enviarArchivoAlChat() {
  const prompt = `A.R.E.S., he configurado el archivo de CI/CD "${nombreArchivoActual.value}" para ${templateActual.value?.nombre}. Por favor audítalo e intégralo a la estructura del proyecto:\n\n\`\`\`yaml\n${codigoArchivoActual.value}\n\`\`\``;
  chatStore.enviarMensaje(prompt);
  emit('cerrar');
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none">
    <div class="w-full max-w-6xl h-[92vh] bg-[#040914] border border-cyan-500/40 rounded-xl flex flex-col shadow-[0_0_40px_rgba(0,229,255,0.18)] overflow-hidden">
      <!-- 1. Encabezado Táctico -->
      <header class="px-5 py-3.5 border-b border-[#132a4a] bg-[#091326] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg border border-cyan-400/50 bg-[#040914] flex items-center justify-center text-xl shadow-inner">
            🚀
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="font-orbitron font-bold text-sm text-slate-100 tracking-wider">
                A.R.E.S. CI/CD & AUTONOMOUS DEPLOYMENT ENGINE
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-bold">
                v3.2 INDUSTRIAL
              </span>
            </div>
            <p class="text-[11px] font-mono text-slate-400">
              Pipeline soberano de validación estricta, compilación OCI multicapa y orquestación Cloud con Zero-Downtime.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Pestañas de Navegación -->
          <div class="flex items-center bg-[#040914] p-1 rounded-lg border border-[#132a4a] text-xs font-mono">
            <button
              @click="tabActiva = 'grafo'"
              class="px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
              :class="tabActiva === 'grafo' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold shadow-[0_0_8px_rgba(0,229,255,0.2)]' : 'text-slate-400 hover:text-slate-200'"
            >
              <span>📊</span>
              <span>Pipeline en Vivo</span>
            </button>
            <button
              @click="tabActiva = 'forja'"
              class="px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
              :class="tabActiva === 'forja' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-bold shadow-[0_0_8px_rgba(0,255,170,0.2)]' : 'text-slate-400 hover:text-slate-200'"
            >
              <span>📜</span>
              <span>Forja de Workflows</span>
            </button>
            <button
              @click="tabActiva = 'auditor'"
              class="px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5"
              :class="tabActiva === 'auditor' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50 font-bold shadow-[0_0_8px_rgba(168,85,247,0.2)]' : 'text-slate-400 hover:text-slate-200'"
            >
              <span>🛡️</span>
              <span>Auditor de Seguridad</span>
            </button>
          </div>

          <button
            @click="emit('cerrar')"
            class="w-8 h-8 rounded-lg border border-slate-700 bg-[#0b1b36] hover:border-red-400 hover:text-red-400 text-slate-400 flex items-center justify-center transition cursor-pointer"
            title="Cerrar modal (Esc)"
          >
            ✕
          </button>
        </div>
      </header>

      <!-- 2. Cuerpo Principal según Pestaña Activa -->
      <div class="flex-1 overflow-hidden flex flex-col p-4 bg-[#040914]">
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <!-- PESTAÑA 1: PIPELINE EN VIVO & GRAFO DE NODOS -->
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <div v-if="tabActiva === 'grafo'" class="h-full flex flex-col gap-4">
          <!-- Banner de Estado Superior & Rollback Alert -->
          <div v-if="mensajeRollback" class="p-3 bg-red-950/60 border border-red-500 rounded-lg text-red-200 text-xs font-mono flex items-center justify-between animate-pulse">
            <span>{{ mensajeRollback }}</span>
            <span class="text-[10px] bg-red-900 px-2 py-0.5 rounded text-red-100">ESTADO RESTAURADO</span>
          </div>

          <!-- Barra de Control y Progreso Global -->
          <div class="bg-[#091326] border border-[#132a4a] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-3 w-full md:w-auto">
              <button
                @click="iniciarSimulacionPipeline"
                :disabled="simulando"
                class="px-4 py-2 rounded-lg font-orbitron font-bold text-xs tracking-wider transition cursor-pointer flex items-center gap-2 shadow-md"
                :class="simulando ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-slate-900 border border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.4)]'"
              >
                <span v-if="simulando" class="animate-spin text-sm">🔄</span>
                <span v-else class="text-sm">▶</span>
                <span>{{ simulando ? 'EJECUTANDO PIPELINE...' : 'INICIAR PIPELINE DEPLOY' }}</span>
              </button>

              <button
                @click="ejecutarRollback"
                :disabled="simulando"
                class="px-3 py-2 rounded-lg font-mono text-xs border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 hover:border-red-400 text-red-300 transition cursor-pointer flex items-center gap-1.5"
                title="Revertir de emergencia al commit previo verificado"
              >
                <span>🚨</span>
                <span class="hidden sm:inline">Rollback Táctico</span>
              </button>
            </div>

            <!-- Progreso del Pipeline -->
            <div class="w-full md:w-1/2 flex flex-col gap-1.5">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-400">PROGRESO DE DESPLIEGUE:</span>
                <span class="font-bold font-orbitron text-cyan-300">{{ ejecucion?.progresoPct || 0 }}%</span>
              </div>
              <div class="w-full h-2.5 bg-[#040914] rounded-full overflow-hidden border border-[#132a4a]">
                <div
                  class="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-[#00ffaa] transition-all duration-300 shadow-[0_0_10px_rgba(0,255,170,0.6)]"
                  :style="{ width: `${ejecucion?.progresoPct || 0}%` }"
                ></div>
              </div>
            </div>

            <!-- Badges de Destino -->
            <div class="flex items-center gap-2 shrink-0 text-xs font-mono">
              <span class="px-2 py-1 rounded bg-[#0b1b36] border border-cyan-500/40 text-cyan-300 font-bold">
                ☁️ RENDER CLOUD
              </span>
              <span class="px-2 py-1 rounded bg-[#0b1b36] border border-emerald-500/40 text-emerald-300">
                🌿 rama: main
              </span>
            </div>
          </div>

          <!-- Grafo Visual de Nodos del Pipeline -->
          <div class="bg-[#091326]/70 border border-[#132a4a] rounded-xl p-4 flex flex-col gap-2">
            <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Etapas de Ejecución Orquestada (Haz clic en un nodo para ver sus logs):</span>
              <span class="text-slate-500">Zero-Downtime Pipeline Flow</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div
                v-for="(step, index) in ejecucion?.steps"
                :key="step.id"
                @click="pasoSeleccionadoId = step.id"
                class="p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between h-24 relative overflow-hidden group"
                :class="[
                  pasoSeleccionadoId === step.id ? 'ring-2 ring-cyan-400' : '',
                  step.status === 'running' ? 'border-cyan-400 bg-cyan-950/40 animate-pulse shadow-[0_0_12px_rgba(0,229,255,0.3)]' :
                  step.status === 'success' ? 'border-emerald-500/60 bg-emerald-950/20 hover:border-emerald-400' :
                  step.status === 'failed' ? 'border-red-500/60 bg-red-950/20' :
                  'border-[#132a4a] bg-[#040914] opacity-70 hover:opacity-100'
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="text-lg">{{ step.icono }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                    :class="[
                      step.status === 'running' ? 'bg-cyan-500 text-slate-900 animate-pulse' :
                      step.status === 'success' ? 'bg-emerald-500/30 text-emerald-300' :
                      step.status === 'failed' ? 'bg-red-500/30 text-red-300' :
                      'bg-slate-800 text-slate-400'
                    ]"
                  >
                    {{ step.status.toUpperCase() }}
                  </span>
                </div>

                <div>
                  <div class="text-[11px] font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-300">
                    {{ step.nombre.replace(/^\d+\.\s*/, '') }}
                  </div>
                  <div class="text-[10px] font-mono text-slate-400 flex items-center justify-between mt-1">
                    <span>Etapa {{ index + 1 }}</span>
                    <span v-if="step.duracionMs > 0">{{ (step.duracionMs / 1000).toFixed(1) }}s</span>
                  </div>
                </div>

                <!-- Conector visual indicador -->
                <div
                  v-if="step.status === 'success'"
                  class="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_6px_rgba(0,255,170,0.8)]"
                ></div>
                <div
                  v-else-if="step.status === 'running'"
                  class="absolute bottom-0 left-0 right-0 h-1 bg-cyan-400 animate-pulse"
                ></div>
              </div>
            </div>
          </div>

          <!-- Consola de Logs del Paso Seleccionado -->
          <div class="flex-1 bg-[#02050b] border border-[#132a4a] rounded-xl flex flex-col overflow-hidden shadow-inner">
            <div class="px-4 py-2 border-b border-[#132a4a] bg-[#080f1e] flex items-center justify-between text-xs font-mono">
              <div class="flex items-center gap-2">
                <span class="text-cyan-400 font-bold">>_ TELEMETRÍA DE PASO:</span>
                <span class="text-slate-200 font-bold">{{ pasoSeleccionado?.nombre }}</span>
                <span
                  class="px-2 py-0.2 rounded text-[10px] font-mono font-bold"
                  :class="pasoSeleccionado?.status === 'success' ? 'text-emerald-400 bg-emerald-950/60' : 'text-cyan-400 bg-cyan-950/60'"
                >
                  [{{ pasoSeleccionado?.status.toUpperCase() }}]
                </span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="copiarAlPortapapeles((pasoSeleccionado?.logs || []).join('\n'))"
                  class="px-2 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[11px] transition cursor-pointer"
                >
                  {{ copiadoExitoso ? '✓ Copiado' : '📋 Copiar Logs' }}
                </button>
              </div>
            </div>

            <div class="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
              <div v-if="!pasoSeleccionado?.logs || pasoSeleccionado.logs.length === 0" class="text-slate-600 italic">
                Esperando inicio de ejecución del job...
              </div>
              <div
                v-for="(linea, idx) in pasoSeleccionado?.logs"
                :key="idx"
                class="flex items-start gap-2 leading-relaxed"
              >
                <span class="text-slate-600 select-none shrink-0">{{ (idx + 1).toString().padStart(2, '0') }}</span>
                <span :class="linea.includes('✅') || linea.includes('superada') || linea.includes('200 OK') ? 'text-emerald-400 font-bold' : linea.includes('❌') ? 'text-red-400 font-bold' : 'text-cyan-100'">
                  {{ linea }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <!-- PESTAÑA 2: FORJA DE WORKFLOWS (YAML / DOCKERFILE) -->
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <div v-else-if="tabActiva === 'forja'" class="h-full flex flex-col gap-3">
          <!-- Barra de selección de plantilla y archivos -->
          <div class="bg-[#091326] border border-[#132a4a] rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <div class="flex items-center gap-2 w-full md:w-auto">
              <span class="text-xs font-mono text-slate-400 shrink-0">PLANTILLA INDUSTRIAL:</span>
              <select
                v-model="templateSeleccionadoId"
                class="bg-[#040914] text-cyan-300 border border-[#132a4a] px-3 py-1.5 rounded-lg text-xs font-mono outline-none cursor-pointer flex-1 md:w-80"
              >
                <option v-for="t in templates" :key="t.id" :value="t.id">
                  {{ t.nombre }}
                </option>
              </select>
            </div>

            <!-- Subtabs de Archivos -->
            <div class="flex items-center bg-[#040914] p-1 rounded-lg border border-[#132a4a] text-xs font-mono">
              <button
                @click="subtabArchivo = 'workflow'"
                class="px-2.5 py-1 rounded transition cursor-pointer"
                :class="subtabArchivo === 'workflow' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50' : 'text-slate-400 hover:text-slate-200'"
              >
                deploy.yml
              </button>
              <button
                @click="subtabArchivo = 'dockerfile'"
                class="px-2.5 py-1 rounded transition cursor-pointer"
                :class="subtabArchivo === 'dockerfile' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50' : 'text-slate-400 hover:text-slate-200'"
              >
                Dockerfile
              </button>
              <button
                @click="subtabArchivo = 'compose'"
                class="px-2.5 py-1 rounded transition cursor-pointer"
                :class="subtabArchivo === 'compose' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50' : 'text-slate-400 hover:text-slate-200'"
              >
                docker-compose.prod.yml
              </button>
              <button
                @click="subtabArchivo = 'dockerignore'"
                class="px-2.5 py-1 rounded transition cursor-pointer"
                :class="subtabArchivo === 'dockerignore' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/50' : 'text-slate-400 hover:text-slate-200'"
              >
                .dockerignore
              </button>
            </div>
          </div>

          <!-- Visor de Código Fuente Forjado -->
          <div class="flex-1 bg-[#02050b] border border-[#132a4a] rounded-xl flex flex-col overflow-hidden shadow-inner">
            <div class="px-4 py-2 border-b border-[#132a4a] bg-[#080f1e] flex items-center justify-between text-xs font-mono">
              <div class="flex items-center gap-2">
                <span class="text-emerald-400 font-bold">📄 {{ nombreArchivoActual }}</span>
                <span class="text-slate-500">({{ templateActual?.stackSugerido }})</span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="copiarAlPortapapeles(codigoArchivoActual)"
                  class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-xs font-mono transition cursor-pointer"
                >
                  {{ copiadoExitoso ? '✓ Copiado' : '📋 Copiar' }}
                </button>
                <button
                  @click="descargarArchivoActual"
                  class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-emerald-400 text-emerald-300 text-xs font-mono transition cursor-pointer"
                >
                  📥 Descargar
                </button>
                <button
                  @click="enviarArchivoAlChat"
                  class="px-2.5 py-1 rounded bg-purple-950/60 border border-purple-500/50 hover:border-purple-400 text-purple-300 text-xs font-mono font-bold transition cursor-pointer"
                  title="Insertar en la consola de chat para que A.R.E.S. lo integre a tu proyecto"
                >
                  💬 Enviar al Chat
                </button>
              </div>
            </div>

            <pre class="flex-1 p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-[#02050b] select-text"><code>{{ codigoArchivoActual }}</code></pre>
          </div>
        </div>

        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <!-- PESTAÑA 3: AUDITOR DE SEGURIDAD CI/CD -->
        <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
        <div v-else-if="tabActiva === 'auditor'" class="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
          <!-- Columna Izquierda: Editor de YAML para auditar -->
          <div class="flex-1 flex flex-col bg-[#02050b] border border-[#132a4a] rounded-xl overflow-hidden">
            <div class="px-4 py-2 border-b border-[#132a4a] bg-[#080f1e] flex items-center justify-between text-xs font-mono">
              <span class="text-purple-400 font-bold">🔍 WORKFLOW A AUDITAR (YAML)</span>
              <button
                @click="ejecutarAuditoria"
                :disabled="auditando"
                class="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-slate-900 font-bold text-xs font-orbitron transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
              >
                <span>🛡️</span>
                <span>{{ auditando ? 'AUDITANDO...' : 'EJECUTAR AUDITORÍA' }}</span>
              </button>
            </div>
            <textarea
              v-model="yamlParaAuditar"
              placeholder="Pega aquí tu workflow .github/workflows/deploy.yml para auditarlo..."
              class="flex-1 p-4 bg-[#02050b] text-slate-200 font-mono text-xs outline-none resize-none border-none leading-relaxed select-text"
            ></textarea>
          </div>

          <!-- Columna Derecha: Reporte de Auditoría Táctica -->
          <div class="w-full md:w-96 flex flex-col gap-3 overflow-y-auto">
            <!-- Puntuación General -->
            <div class="bg-[#091326] border border-[#132a4a] rounded-xl p-4 flex flex-col gap-2">
              <div class="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Diagnóstico de Seguridad CI/CD:
              </div>

              <div class="flex items-center justify-between">
                <div class="text-3xl font-orbitron font-bold" :class="resultadoAuditoria && resultadoAuditoria.puntuacionSeguridad >= 75 ? 'text-emerald-400' : 'text-amber-400'">
                  {{ resultadoAuditoria ? resultadoAuditoria.puntuacionSeguridad : 100 }}<span class="text-sm text-slate-500">/100</span>
                </div>
                <span
                  class="px-2.5 py-1 rounded text-xs font-mono font-bold"
                  :class="resultadoAuditoria && resultadoAuditoria.esAptoProduccion ? 'bg-emerald-950/80 border border-emerald-400 text-emerald-300' : 'bg-amber-950/80 border border-amber-400 text-amber-300'"
                >
                  {{ resultadoAuditoria?.esAptoProduccion ? '✓ APTO PARA PROD' : '⚠️ REVISIÓN REQUERIDA' }}
                </span>
              </div>

              <div class="text-[11px] font-mono text-slate-400 mt-1">
                Total de hallazgos detectados: <strong class="text-slate-200">{{ resultadoAuditoria?.totalVulnerabilidades || 0 }}</strong>
              </div>
            </div>

            <!-- Lista de Vulnerabilidades / Hallazgos -->
            <div class="flex-1 bg-[#091326] border border-[#132a4a] rounded-xl p-4 flex flex-col gap-3 overflow-y-auto">
              <div class="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Hallazgos y Recomendaciones:
              </div>

              <div v-if="!resultadoAuditoria || resultadoAuditoria.issues.length === 0" class="text-emerald-400 text-xs font-mono p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                ✅ Ninguna vulnerabilidad de alto riesgo detectada. El pipeline sigue las mejores prácticas de GitHub Actions y Supply Chain Security.
              </div>

              <div
                v-for="(issue, idx) in resultadoAuditoria?.issues"
                :key="idx"
                class="p-3 rounded-lg border flex flex-col gap-1.5 text-xs font-mono"
                :class="[
                  issue.gravedad === 'CRITICA' ? 'bg-red-950/30 border-red-500/50 text-red-200' :
                  issue.gravedad === 'ALTA' ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' :
                  'bg-cyan-950/30 border-cyan-500/50 text-cyan-200'
                ]"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold font-orbitron">{{ issue.regla }}</span>
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-black/40">
                    {{ issue.gravedad }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">{{ issue.descripcion }}</p>
                <div class="text-[10px] text-emerald-300 bg-black/30 p-1.5 rounded mt-1">
                  💡 {{ issue.sugerencia }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
