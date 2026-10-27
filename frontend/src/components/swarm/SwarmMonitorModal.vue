<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUiStore } from '../../stores/ui.store.js';
import { useChatStore } from '../../stores/chat.store.js';
import { swarmService, type SubagenteFrontend } from '../../services/swarm.service.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const uiStore = useUiStore();
const chatStore = useChatStore();

const agentes = ref<SubagenteFrontend[]>([]);
const cargando = ref(true);
const misionTexto = ref('');

const misionesPredefinidas = [
  'Crear una tienda web de café de especialidad con DDD, catálogo de granos, carrito reactivo y diseño en Vue 3 con Tailwind',
  'Forjar un microservicio de autenticación JWT con Clean Architecture, Refresh Tokens en cookies HttpOnly y rate-limiting',
  'Diseñar y construir una plataforma de subastas en tiempo real con DDD, WebSockets, Vue 3 y validación de ofertas',
  'Desarrollar un dashboard de telemetría para servidores con métricas en tiempo real, diagramas C4 y suite de pruebas Vitest',
];

onMounted(async () => {
  try {
    agentes.value = await swarmService.obtenerSubagentes();
  } finally {
    cargando.value = false;
  }
});

function seleccionarPreset(preset: string) {
  misionTexto.value = preset;
}

function ejecutarPresetDirecto(preset: string) {
  misionTexto.value = preset;
  lanzarMisionEnjambre();
}

function lanzarMisionEnjambre() {
  if (!misionTexto.value.trim()) return;

  // 1. Activar el Modo Enjambre
  uiStore.setModoTactico('enjambre');

  // 2. Despachar la misión al chatStore
  chatStore.enviarMensaje(misionTexto.value.trim());

  // 3. Cerrar el modal
  emit('cerrar');
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-[#02050d]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
    @click.self="emit('cerrar')"
  >
    <div
      class="w-full max-w-4xl max-h-[92vh] bg-[#071120] border border-[#00ffaa]/50 rounded-xl shadow-[0_0_40px_rgba(0,255,170,0.25)] flex flex-col overflow-hidden text-slate-200 font-mono"
    >
      <!-- Cabecera Holográfica -->
      <div class="px-5 py-3.5 border-b border-[#132a4a] bg-[#09172e] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl animate-bounce">🐝</span>
          <div>
            <h2 class="text-base font-orbitron font-bold text-slate-100 flex items-center gap-2">
              ENJAMBRE TÁCTICO MULTI-AGENTE <span class="text-[#00ffaa] text-xs">v3.1 SOBERANO</span>
            </h2>
            <p class="text-[11px] text-slate-400">
              Legión de Subagentes Autónomos Coordinados bajo Consenso y Arquitectura DDD
            </p>
          </div>
        </div>
        <button
          @click="emit('cerrar')"
          class="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 p-1.5 rounded transition cursor-pointer text-sm font-bold"
          title="Cerrar monitor"
        >
          ✕
        </button>
      </div>

      <!-- Contenido Scrolleable -->
      <div class="p-5 flex-1 overflow-y-auto space-y-5">
        <!-- Tarjetas de la Legión de Subagentes -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <h3 class="text-xs font-bold text-cyan-300 font-orbitron flex items-center gap-1.5">
              <span>👥</span> LEGIÓN DE SUBAGENTES OPERATIVOS (4 ACTIVOS)
            </h3>
            <span class="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              PROTOCOLO DE CONSENSO EN LÍNEA
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              v-for="ag in agentes"
              :key="ag.id"
              class="p-3 rounded-lg border bg-[#040914]/90 flex flex-col justify-between transition-all hover:scale-[1.02] shadow-sm"
              :style="{ borderColor: `${ag.color}50` }"
            >
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-1.5">
                    <span class="text-lg">{{ ag.icono }}</span>
                    <span class="font-bold text-xs font-orbitron" :style="{ color: ag.color }">
                      {{ ag.nombre }}
                    </span>
                  </div>
                  <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    IDLE
                  </span>
                </div>
                <div class="text-[11px] text-slate-300 font-semibold mb-1">
                  {{ ag.titulo }}
                </div>
                <p class="text-[10px] text-slate-400 leading-tight mb-2">
                  {{ ag.rol }}
                </p>
              </div>

              <div class="border-t border-[#132a4a] pt-1.5 text-[9px] text-slate-400 flex items-center justify-between">
                <span>Especialidad:</span>
                <span class="text-cyan-400 font-bold truncate max-w-[120px]" :title="ag.especialidad">
                  {{ ag.especialidad.split(',')[0] }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Flujo del Protocolo de Diálogo y Consenso -->
        <div class="bg-[#030712] p-3.5 rounded-lg border border-[#132a4a]">
          <h4 class="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <span>⚙️</span> PROTOCOLO DE CONSENSO Y REVISIÓN CRUZADA INTER-AGENTE
          </h4>
          <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <div class="flex items-center gap-1 bg-[#09172e] px-2 py-1 rounded border border-purple-500/40 text-purple-300">
              <span>🏛️ Atenea</span>
              <span class="text-[8px] text-slate-500">➔ DDD / C4</span>
            </div>
            <span class="text-slate-600 font-bold">➔</span>
            <div class="flex items-center gap-1 bg-[#09172e] px-2 py-1 rounded border border-cyan-500/40 text-cyan-300">
              <span>⚔️ Vulcano</span>
              <span class="text-[8px] text-slate-500">➔ Backend Clean</span>
            </div>
            <span class="text-slate-600 font-bold">➔</span>
            <div class="flex items-center gap-1 bg-[#09172e] px-2 py-1 rounded border border-[#00ffaa]/40 text-[#00ffaa]">
              <span>🎨 Mercurio</span>
              <span class="text-[8px] text-slate-500">➔ Vue 3 / Live UI</span>
            </div>
            <span class="text-slate-600 font-bold">➔</span>
            <div class="flex items-center gap-1 bg-[#09172e] px-2 py-1 rounded border border-amber-500/40 text-amber-300">
              <span>🧪 Némesis</span>
              <span class="text-[8px] text-slate-500">➔ QA & OWASP</span>
            </div>
            <span class="text-slate-600 font-bold">➔</span>
            <div class="flex items-center gap-1 bg-[#09172e] px-2 py-1 rounded border border-emerald-500/50 text-emerald-300 font-bold">
              <span>🛡️ A.R.E.S. Prime</span>
              <span class="text-[8px] text-emerald-400">➔ .ZIP / Sandbox</span>
            </div>
          </div>
        </div>

        <!-- Misiones Predefinidas -->
        <div>
          <label class="text-[11px] text-slate-400 font-bold block mb-1.5 flex items-center gap-1">
            <span>🎯</span> MISIONES TÁCTICAS RECOMENDADAS PARA EL ENJAMBRE:
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              v-for="(preset, idx) in misionesPredefinidas"
              :key="idx"
              class="p-2.5 rounded bg-[#09172e] border border-[#132a4a] hover:border-cyan-400 text-[11px] text-slate-300 transition flex flex-col justify-between gap-2 shadow-sm"
            >
              <div class="flex items-start gap-1.5 cursor-pointer" @click="seleccionarPreset(preset)">
                <span class="text-cyan-400 font-bold shrink-0">#{{ idx + 1 }}</span>
                <span class="line-clamp-2 leading-relaxed">{{ preset }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-[#132a4a] pt-1.5 mt-1">
                <button
                  type="button"
                  @click="seleccionarPreset(preset)"
                  class="px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-[10px] cursor-pointer"
                  title="Copiar texto a la caja de orden para personalizarlo"
                >
                  ✏️ Modificar
                </button>
                <button
                  type="button"
                  @click="ejecutarPresetDirecto(preset)"
                  class="px-2.5 py-0.5 rounded bg-[#00ffaa]/20 border border-[#00ffaa]/60 hover:bg-[#00ffaa]/30 text-[#00ffaa] font-bold text-[10px] cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(0,255,170,0.2)]"
                  title="Lanzar esta misión con el Enjambre de inmediato"
                >
                  <span>▶</span>
                  <span>Lanzar Ahora</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Caja de Entrada de la Misión -->
        <div>
          <label class="text-[11px] text-slate-300 font-bold block mb-1.5 flex items-center justify-between">
            <span>📝 ORDEN OPERATIVA PARA LA LEGIÓN:</span>
            <span class="text-[10px] text-slate-500">Se ejecutará en Modo Enjambre con streaming en tiempo real</span>
          </label>
          <textarea
            v-model="misionTexto"
            rows="3"
            placeholder="Describe la arquitectura y componentes del sistema que deseas forjar con el Enjambre (ej: Crear una aplicación de subastas con DDD...)"
            class="w-full px-3 py-2 bg-[#02050d] border border-[#132a4a] focus:border-[#00ffaa] rounded-lg text-xs font-mono text-slate-100 outline-none resize-none transition"
          ></textarea>
        </div>
      </div>

      <!-- Pie de Acción -->
      <div class="px-5 py-3 border-t border-[#132a4a] bg-[#060e1c] flex items-center justify-between gap-3">
        <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-[#00ffaa] animate-ping"></span>
          <span>4 AGENTES LISTOS PARA DESPLIEGUE</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="emit('cerrar')"
            class="px-3 py-1.5 rounded border border-[#132a4a] text-slate-400 hover:text-slate-200 text-xs cursor-pointer transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="lanzarMisionEnjambre"
            :disabled="!misionTexto.trim()"
            class="px-4 py-1.5 rounded bg-[#00ffaa] hover:bg-[#00e699] disabled:opacity-40 text-[#040914] font-orbitron font-bold text-xs cursor-pointer transition shadow-[0_0_15px_rgba(0,255,170,0.4)] flex items-center gap-1.5"
          >
            <span>🚀</span>
            <span>LANZAR ENJAMBRE TÁCTICO</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
