<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue';
import { useChatStore } from '../../stores/chat.store.js';
import { useUiStore } from '../../stores/ui.store.js';
import { useConnectionStore } from '../../stores/connection.store.js';
import ChatInput from './ChatInput.vue';
import AppIcon from '../common/AppIcon.vue';
const ChatMessage = defineAsyncComponent(() => import('./ChatMessage.vue'));
const BioPanel = defineAsyncComponent(() => import('../hud/BioPanel.vue'));
const GithubAuditModal = defineAsyncComponent(() => import('../audit/GithubAuditModal.vue'));
const SwarmMonitorModal = defineAsyncComponent(() => import('../swarm/SwarmMonitorModal.vue'));
const PipelineMonitorModal = defineAsyncComponent(() => import('../cicd/PipelineMonitorModal.vue'));
const MemoryOracleModal = defineAsyncComponent(() => import('../memory/MemoryOracleModal.vue'));
const ArchitectureRadarModal = defineAsyncComponent(
  () => import('../architecture/ArchitectureRadarModal.vue'),
);
const AssignmentForgeModal = defineAsyncComponent(
  () => import('../forge/AssignmentForgeModal.vue'),
);
const BenchmarkSuiteModal = defineAsyncComponent(
  () => import('../benchmark/BenchmarkSuiteModal.vue'),
);
const chat = useChatStore(),
  ui = useUiStore(),
  connection = useConnectionStore();
const composer = ref<InstanceType<typeof ChatInput> | null>(null);
const scroll = ref<HTMLDivElement | null>(null),
  history = ref<HTMLDialogElement | null>(null),
  tools = ref<HTMLDialogElement | null>(null);
const wellbeing = ref<HTMLDialogElement | null>(null);
const wellbeingOpen = ref(false);
const visibleMessages = computed(() =>
  chat.mensajes.filter(
    (message) =>
      message.id !== 'bienvenida' &&
      !message.id.startsWith('new-') &&
      !message.id.startsWith('init-'),
  ),
);
const welcome = computed(() => visibleMessages.value.length === 0);
const exported = ref(false),
  historyError = ref('');
const starters = [
  {
    icon: 'code',
    label: 'Revisar mi código',
    text: 'Encuentra problemas y oportunidades de mejora.',
    prompt:
      'Quiero revisar mi código. Ayúdame a identificar defectos verificables y a definir pruebas antes de proponer cambios.',
  },
  {
    icon: 'layers',
    label: 'Pensar la arquitectura',
    text: 'Define límites, reglas y decisiones con claridad.',
    prompt:
      'Ayúdame a definir los contextos de mi proyecto y las invariantes de sus agregados. Primero identifica qué información necesitas.',
  },
  {
    icon: 'document',
    label: 'Documentar una decisión',
    text: 'Convierte el contexto en un ADR útil.',
    prompt:
      'Quiero documentar una decisión de arquitectura en un ADR. Guíame para describir contexto, alternativas y consecuencias.',
  },
];
const modules = [
  {
    id: 'wellbeing',
    icon: 'pause',
    name: 'Pausa y bienestar',
    description: 'Recordatorios de agua y sesiones de foco.',
  },
  {
    id: 'forge',
    icon: 'code',
    name: 'Forja de proyectos',
    description: 'Preparar estructura, ejercicios y archivos.',
  },
  {
    id: 'audit',
    icon: 'shield',
    name: 'Revisión de repositorio',
    description: 'Analizar fuentes de GitHub.',
  },
  {
    id: 'memory',
    icon: 'history',
    name: 'Memoria',
    description: 'Consultar el conocimiento guardado.',
  },
  {
    id: 'radar',
    icon: 'layers',
    name: 'Radar de arquitectura',
    description: 'Explorar y simular topologías.',
  },
  {
    id: 'swarm',
    icon: 'spark',
    name: 'Especialistas',
    description: 'Solicitar perspectivas de varios agentes.',
  },
  {
    id: 'cicd',
    icon: 'terminal',
    name: 'Simulador de pipeline',
    description: 'Explorar etapas de CI/CD simuladas.',
  },
  {
    id: 'benchmark',
    icon: 'code',
    name: 'Laboratorio de pruebas',
    description: 'Generar suites y consultar simulaciones.',
  },
];
function openModule(id: string) {
  tools.value?.close();
  if (id === 'wellbeing') {
    wellbeingOpen.value = true;
    wellbeing.value?.showModal();
  } else if (id === 'forge') ui.modalForgeAbierto = true;
  else if (id === 'audit') ui.modalGithubAuditAbierto = true;
  else if (id === 'memory') ui.modalMemoriaAbierto = true;
  else if (id === 'radar') ui.modalRadarAbierto = true;
  else if (id === 'swarm') ui.modalSwarmAbierto = true;
  else if (id === 'cicd') ui.modalCicdAbierto = true;
  else if (id === 'benchmark') ui.modalBenchmarkAbierto = true;
}
function send(payload: { texto: string; imagenBase64?: string }) {
  if (chat.cargando) return;
  if (connection.state !== 'online') {
    window.dispatchEvent(new Event('ares:open-connection'));
    return;
  }
  chat.enviarMensaje(payload.texto, payload.imagenBase64);
}
function openConnection() {
  window.dispatchEvent(new Event('ares:open-connection'));
}
async function openHistory() {
  history.value?.showModal();
  historyError.value = '';
  await chat.cargarConversaciones();
  historyError.value = chat.errorHistorial || '';
  if (connection.state !== 'online')
    historyError.value = 'Conecta tu servidor para recuperar las misiones guardadas.';
}
async function selectSession(id: string) {
  await chat.seleccionarConversacion(id);
  history.value?.close();
}
async function newSession() {
  if (chat.cargando) return;
  await chat.nuevaSesion();
}
function exportSession() {
  const text =
    '# Conversación ARES\n\n' +
    visibleMessages.value
      .map((message) => `## ${message.role === 'user' ? 'Tú' : 'ARES'}\n\n${message.content}`)
      .join('\n\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'conversacion-ares.md';
  anchor.click();
  URL.revokeObjectURL(url);
  exported.value = true;
  setTimeout(() => (exported.value = false), 2000);
}
let follow = true;
function trackScroll() {
  if (scroll.value)
    follow = scroll.value.scrollHeight - scroll.value.scrollTop - scroll.value.clientHeight < 100;
}
watch(
  () => chat.mensajes.at(-1)?.content,
  async () => {
    await nextTick();
    if (follow && scroll.value) scroll.value.scrollTop = scroll.value.scrollHeight;
  },
);
watch(
  () => connection.state,
  (state) => {
    if (state === 'online') chat.cargarConversaciones();
  },
);
onMounted(() => {
  if (connection.state === 'online') chat.cargarConversaciones();
});
</script>
<template>
  <section class="conversation-panel" aria-label="Conversación con ARES">
    <div class="conversation-toolbar">
      <div class="conversation-title">
        <AppIcon name="chat" :size="19" /><span>Conversación</span
        ><span class="muted-separator">/</span
        ><span class="conversation-context">{{
          chat.conversacionIdActual ? 'Misión guardada' : 'Nueva misión'
        }}</span>
      </div>
      <div class="conversation-actions">
        <button class="text-button" :disabled="chat.cargando" @click="newSession">
          <AppIcon name="plus" :size="17" /><span>Nueva</span>
        </button>
        <button
          class="icon-button"
          aria-label="Abrir historial de misiones"
          :disabled="chat.cargando"
          @click="openHistory"
        >
          <AppIcon name="history" :size="19" />
        </button>
        <button
          class="icon-button"
          aria-label="Explorar herramientas de ingeniería"
          @click="tools?.showModal()"
        >
          <AppIcon name="layers" :size="19" />
        </button>
        <button
          v-if="!welcome"
          class="icon-button"
          :aria-label="exported ? 'Conversación exportada' : 'Exportar conversación'"
          @click="exportSession"
        >
          <AppIcon :name="exported ? 'check' : 'download'" :size="19" />
        </button>
      </div>
    </div>
    <div class="conversation-mode">
      <span class="eyebrow">ENFOQUE</span
      ><select v-model="ui.modoTactico" aria-label="Enfoque de la conversación">
        <option value="centinela">Ingeniería y revisión</option>
        <option value="arquitecto">Arquitectura y decisiones</option>
        <option value="blitzkrieg">Prototipado</option>
        <option value="enjambre">Perspectivas de especialistas</option></select
      ><span class="mode-note">Contexto claro. Cambios revisables.</span>
    </div>
    <div ref="scroll" class="conversation-scroll" @scroll="trackScroll">
      <div v-if="welcome" class="conversation-welcome">
        <span class="welcome-symbol"><AppIcon name="spark" :size="24" /></span
        ><span class="eyebrow">MENOS FRICCIÓN. MÁS INGENIERÍA.</span>
        <h1>De una idea<br />a algo que <span>funciona.</span></h1>
        <p>
          Un espacio para pensar, construir y documentar.<br class="desktop-break" />
          Tú marcas el rumbo. ARES te acompaña.
        </p>
        <div class="starter-cards">
          <button
            v-for="starter in starters"
            :key="starter.label"
            @click="composer?.setText(starter.prompt)"
          >
            <span class="starter-icon"><AppIcon :name="starter.icon" :size="21" /></span
            ><strong>{{ starter.label }}</strong
            ><span>{{ starter.text }}</span
            ><AppIcon name="arrow" :size="16" class="starter-arrow" />
          </button>
        </div>
        <span class="welcome-footnote"
          ><span class="status-dot" />Tu siguiente paso empieza con una buena pregunta.</span
        >
      </div>
      <div v-else class="message-list" role="log" aria-label="Mensajes de la conversación">
        <ChatMessage v-for="message in visibleMessages" :key="message.id" :message="message" />
        <p v-if="chat.cargando" class="generation-state" role="status">
          <span class="thinking-dots" aria-hidden="true">•••</span>ARES está preparando una
          respuesta.
        </p>
      </div>
    </div>
    <div class="composer-area">
      <div v-if="connection.state === 'locked'" class="access-notice">
        <AppIcon name="key" :size="16" /><span>Configura el acceso para empezar a conversar.</span
        ><button @click="openConnection">Conectar<AppIcon name="arrow" :size="14" /></button>
      </div>
      <ChatInput
        ref="composer"
        :cargando="chat.cargando"
        :conectado="connection.state === 'online'"
        @conectar="openConnection"
        @enviar="send"
        @detener="chat.cancelarGeneracion()"
      />
      <div class="composer-disclaimer">
        <AppIcon name="shield" :size="12" /><span
          >ARES puede equivocarse. Revisa el código y verifica los cambios.</span
        ><span class="workspace-version">ARES / WEB</span>
      </div>
    </div>
    <dialog ref="history" class="workspace-dialog history-dialog" aria-labelledby="history-title">
      <div class="dialog-heading">
        <span class="dialog-icon"><AppIcon name="history" :size="22" /></span
        ><button class="icon-button" aria-label="Cerrar historial" @click="history?.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <span class="eyebrow">TU TRABAJO, CON CONTEXTO</span>
      <h2 id="history-title">Misiones guardadas.</h2>
      <p v-if="historyError" class="dialog-description">{{ historyError }}</p>
      <p v-else-if="chat.cargandoHistorial" class="dialog-description" role="status">
        Recuperando tus misiones…
      </p>
      <div v-else-if="chat.conversaciones.length" class="session-list">
        <button
          v-for="session in chat.conversaciones"
          :key="session.id"
          @click="selectSession(session.id)"
        >
          <AppIcon name="chat" :size="18" /><span>{{ session.title || 'Sin título' }}</span
          ><AppIcon name="chevron" :size="16" />
        </button>
      </div>
      <p v-else class="dialog-description">
        Todavía no hay misiones guardadas. Tu primera conversación aparecerá aquí.
      </p>
    </dialog>
    <dialog ref="tools" class="workspace-dialog tools-dialog" aria-labelledby="tools-title">
      <div class="dialog-heading">
        <span class="dialog-icon"><AppIcon name="layers" :size="22" /></span
        ><button class="icon-button" aria-label="Cerrar herramientas" @click="tools?.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <span class="eyebrow">ELIGE TU SIGUIENTE PASO</span>
      <h2 id="tools-title">Tu caja de herramientas.</h2>
      <div class="tool-list">
        <button v-for="module in modules" :key="module.id" @click="openModule(module.id)">
          <AppIcon :name="module.icon" :size="21" /><span
            ><strong>{{ module.name }}</strong
            ><small>{{ module.description }}</small></span
          ><AppIcon name="chevron" :size="16" />
        </button>
      </div>
      <p class="helper-text">
        Las simulaciones representan escenarios; no acreditan ejecuciones reales de CI o benchmarks.
      </p>
    </dialog>
    <dialog
      ref="wellbeing"
      class="workspace-dialog tools-dialog wellbeing-dialog"
      aria-labelledby="wellbeing-title"
      @close="wellbeingOpen = false"
    >
      <div class="dialog-heading">
        <span class="dialog-icon"><AppIcon name="pause" :size="22" /></span
        ><button class="icon-button" aria-label="Cerrar bienestar" @click="wellbeing?.close()">
          <AppIcon name="close" />
        </button>
      </div>
      <h2 id="wellbeing-title">Haz espacio para una pausa.</h2>
      <p class="dialog-description">
        Recordatorios personales y temporizador de foco. Los indicadores no son mediciones de salud.
      </p>
      <BioPanel v-if="wellbeingOpen" />
    </dialog>
    <GithubAuditModal
      v-if="ui.modalGithubAuditAbierto"
      @cerrar="ui.modalGithubAuditAbierto = false"
      @insertar-en-chat="(prompt: string) => composer?.setText(prompt)"
    />
    <SwarmMonitorModal v-if="ui.modalSwarmAbierto" @cerrar="ui.modalSwarmAbierto = false" />
    <PipelineMonitorModal v-if="ui.modalCicdAbierto" @cerrar="ui.modalCicdAbierto = false" />
    <MemoryOracleModal v-if="ui.modalMemoriaAbierto" @cerrar="ui.modalMemoriaAbierto = false" />
    <ArchitectureRadarModal v-if="ui.modalRadarAbierto" @cerrar="ui.modalRadarAbierto = false" />
    <AssignmentForgeModal v-if="ui.modalForgeAbierto" @cerrar="ui.modalForgeAbierto = false" />
    <BenchmarkSuiteModal
      v-if="ui.modalBenchmarkAbierto"
      @cerrar="ui.modalBenchmarkAbierto = false"
    />
  </section>
</template>
