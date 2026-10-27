<script setup lang="ts">
import { ref, watch } from 'vue';
import { apiService } from '../../services/api.service.js';
import { useFsmStore } from '../../stores/fsm.store.js';
import { useUiStore } from '../../stores/ui.store.js';

const fsm = useFsmStore();
const uiStore = useUiStore();

const patron = ref('Clean + Hexagonal (Ports & Adapters)');
const descripcion = ref('');
const resultadoArquitectura = ref('');
const cargando = ref(false);

// Sincronizar derivación automática desde el chat
watch(
  () => uiStore.architectBuffer,
  (nuevo) => {
    if (nuevo) {
      resultadoArquitectura.value = nuevo.diagrama;
    }
  },
  { immediate: true }
);

const patrones = [
  'Clean + Hexagonal (Ports & Adapters)',
  'Domain-Driven Design (DDD)',
  'Event-Driven Architecture (EDA / CQRS)',
  'Microservicios con API Gateway',
  'Modular Monolith',
];

async function disenar() {
  if (!descripcion.value.trim()) return;

  cargando.value = true;
  fsm.cambiarPostura('SPRINT', 7);

  try {
    const prompt = `Actúa como el Oráculo de Arquitectura de A.R.E.S.
Diseña una arquitectura de grado industrial bajo el patrón "${patron.value}" para el siguiente sistema:

${descripcion.value.trim()}

Tu entrega debe incluir:
1. 🏛️ **Árbol de Directorios Modular Completo**
2. 🔄 **Flujo de Datos y Responsabilidades por Capa**
3. 📊 **Diagrama de Arquitectura Mermaid (\`\`\`mermaid)**
4. 💾 **Esquema de Base de Datos Recomendado (PostgreSQL / Redis / Vector)**
5. 🛡️ **Borrador de ADR-001** justificando la elección y detallando los trade-offs`;

    const res = await apiService.enviarMensajeChat({
      message: prompt,
    });

    resultadoArquitectura.value = res.reply;
    fsm.cambiarPostura('VICTORY', 16);
  } catch (err: any) {
    console.error(err);
    fsm.cambiarPostura('ERROR', 2);
    resultadoArquitectura.value = `⚠️ Error al diseñar arquitectura: ${err.message}`;
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-y-auto space-y-4">
    <!-- Encabezado del Oráculo -->
    <div class="flex items-center justify-between pb-3 border-b border-[#132a4a]">
      <div>
        <h2 class="font-orbitron font-bold text-base text-slate-100 flex items-center gap-2">
          <span>🏛️</span> ORÁCULO DE ARQUITECTURA // SYSTEM DESIGN
        </h2>
        <p class="text-xs font-mono text-slate-400">
          Diseño de sistemas de alto rendimiento, Clean Architecture y planos modulares en segundos.
        </p>
      </div>

      <select
        v-model="patron"
        class="bg-[#040914] border border-[#132a4a] text-[#00ffaa] font-mono text-xs rounded px-2.5 py-1.5 outline-none"
      >
        <option v-for="p in patrones" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <!-- Entrada del Proyecto -->
    <div class="space-y-3">
      <div>
        <label class="block text-xs font-mono text-slate-400 mb-1">
          DESCRIPCIÓN DEL SISTEMA O REQUISITOS DE TRÁFICO:
        </label>
        <textarea
          v-model="descripcion"
          rows="5"
          placeholder="Ej: Sistema de pedidos de restaurantes con alta concurrencia, pagos con Stripe, tracking en tiempo real con WebSockets y notificaciones push..."
          class="w-full bg-[#040914] border border-[#132a4a] focus:border-[#00ffaa] rounded p-2.5 text-xs font-mono text-cyan-300 outline-none resize-y"
        ></textarea>
      </div>

      <button
        @click="disenar"
        :disabled="cargando || !descripcion.trim()"
        class="w-full py-2.5 rounded font-orbitron text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        :class="
          cargando
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-[#00ffaa] hover:bg-[#00e699] text-[#040914] shadow glow-neon'
        "
      >
        <span v-if="cargando" class="animate-spin">⏳</span>
        <span v-else>🏛️</span>
        <span>{{ cargando ? 'TRAZANDO PLANO DE ARQUITECTURA...' : 'FORJAR PLANO DE ARQUITECTURA' }}</span>
      </button>
    </div>

    <!-- Salida de la Arquitectura -->
    <div v-if="resultadoArquitectura" class="pt-3 border-t border-[#132a4a] flex-1 flex flex-col">
      <h3 class="text-xs font-mono text-cyan-300 font-bold mb-2">PLANO TÁCTICO ENTREGADO:</h3>
      <div class="flex-1 bg-[#040914] border border-[#132a4a] rounded p-3 overflow-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
        {{ resultadoArquitectura }}
      </div>
    </div>
  </div>
</template>
