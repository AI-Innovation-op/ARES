<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUiStore } from '../../stores/ui.store.js';
import {
  assignmentService,
  type AnalisisEnunciado,
  type ProyectoForjado,
  type StackOption,
  type ArchivoGenerado,
} from '../../services/assignment.service.js';

const emit = defineEmits<{
  (e: 'cerrar'): void;
}>();

const uiStore = useUiStore();

// Estados de interfaz y pasos
const pasoActual = ref<1 | 2 | 3 | 4>(1);
const cargando = ref(false);
const mensajeEstado = ref('');
const error = ref<string | null>(null);

// Datos del formulario
const textoEnunciado = ref('');
const autorNombre = ref('Kevin Commander');
const autorEmail = ref('kevin.commander@gmail.com');
const ramaGit = ref('feature/prestamos-ddd');
const remoteUrl = ref('');
const githubToken = ref('');
const stackSeleccionado = ref('typescript-ddd');
const stacks = ref<StackOption[]>([]);

// Resultados de la forja
const analisis = ref<AnalisisEnunciado | null>(null);
const proyecto = ref<ProyectoForjado | null>(null);
const archivoSeleccionadoIdx = ref(0);
const vistaPreviaTab = ref<'codigo' | 'readme' | 'spec'>('readme');

// Estado de despliegue / push
const ejecutandoPush = ref(false);
const logsPush = ref<string[]>([]);
const pushExitoso = ref(false);
const zipDescargado = ref(false);
const comandosCopiados = ref(false);

const archivoActivo = computed<ArchivoGenerado | null>(() => {
  if (!proyecto.value || proyecto.value.archivos.length === 0) return null;
  return proyecto.value.archivos[archivoSeleccionadoIdx.value] || proyecto.value.archivos[0];
});

// Presets de ejemplo para pruebas inmediatas con un solo clic
const presetsEjemplo = [
  {
    titulo: '📚 Préstamos Bibliotecarios (DDD)',
    texto: `UNIVERSIDAD NACIONAL DE INGENIERÍA
FACULTAD DE CIENCIAS DE LA COMPUTACIÓN
CURSO: DISEÑO DE SOFTWARE AVANZADO - 2026-I
Profesor: Dr. Carlos Ramos    Fecha: 20/04/2026    Página 1 de 4

ENUNCIADO: SISTEMA DE GESTIÓN DE PRÉSTAMOS BIBLIOTECARIOS (DDD)
El presente caso de estudio requiere el desa-
rrollo de una plataforma basada en Domain-Driven Design (DDD) y arquitectura
hexagonal para el control de préstamos de libros a estudian-
tes universitarios.

Bounded Contexts solicitados:
- Prestamos: Ciclo de vida del préstamo, solicitudes y penalizaciones
- Catalogo: Registro de libros, ejemplares e inventario físico por ISBN
- Usuarios: Administración de estudiantes, límites de préstamo y sanciones

Reglas de negocio / Invariantes:
1. Un estudiante puede tener como máximo 3 libros prestados simultáneamente.
2. Cada préstamo tiene un identificador único, fecha de inicio y vencimiento (máximo 14 días).
3. Si la devolución ocurre después de la fecha máxima, el sistema debe registrar el estado PENALIZADO y generar un evento PrestamoVencidoEvent.
4. El libro prestado debe encontrarse en estado DISPONIBLE en el catálogo.
Tecnología solicitada: TypeScript con Clean Architecture y repositorios en memoria.`,
  },
  {
    titulo: '🛒 E-Commerce & Logística (Microservicios)',
    texto: `UNIVERSIDAD TECNOLÓGICA
TALLER DE ARQUITECTURA DISTRIBUIDA
Página 2 de 5 - Examen Final

ENUNCIADO: PLATAFORMA DE COMERCIO Y DESPACHO DE PEDIDOS
Se solicita implementar el backend modular de una tienda en línea bajo principios de DDD:
- Ordenes: Creación y cálculo de totales de pedidos
- Pagos: Validación de transacciones y estados de pago
- Inventario: Reserva atómica de productos y existencias

Reglas de negocio:
1. Una orden solo puede confirmarse si todos los ítems poseen stock suficiente.
2. Si el pago falla o expira en 15 minutos, el stock reservado debe ser liberado inmediatamente.
3. El monto total de la orden debe ser estrictamente mayor a cero y aplicar IVA del 18%.`,
  },
  {
    titulo: '🏥 Sistema de Citas Médicas',
    texto: `EVALUACIÓN PRÁCTICA - INGENIERÍA DE SOFTWARE
Docente: Mg. Elena Solís     Pág. 1 / 3

ENUNCIADO: GESTIÓN DE CITAS Y CONSULTAS CLÍNICAS
Implementar un sistema hexagonal para la reserva de citas médicas:
- Citas: Agendamiento, cancelaciones y reprogramaciones
- Medicos: Especialidades médicas y turnos de disponibilidad
- Pacientes: Historial clínico e identificación

Invariantes:
1. Un médico no puede atender dos citas en el mismo bloque horario.
2. La cancelación de una cita debe realizarse con un mínimo de 2 horas de anticipación.
3. Al confirmarse la cita se debe disparar el evento CitaAgendadaEvent.`,
  },
];

onMounted(async () => {
  stacks.value = await assignmentService.listarStacks();
  cargarPreset(0);
});

function cargarPreset(idx: number) {
  if (presetsEjemplo[idx]) {
    textoEnunciado.value = presetsEjemplo[idx].texto;
    if (idx === 0) {
      ramaGit.value = 'feature/prestamos-ddd';
    } else if (idx === 1) {
      ramaGit.value = 'feature/ecommerce-ordenes';
    } else {
      ramaGit.value = 'feature/citas-medicas';
    }
  }
}

async function desofuscarTexto() {
  if (!textoEnunciado.value.trim()) return;
  cargando.value = true;
  error.value = null;
  mensajeEstado.value = 'Sanitizando texto crudo de PDF y extrayendo Bounded Contexts...';

  try {
    const res = await assignmentService.limpiarTexto(textoEnunciado.value, stackSeleccionado.value);
    analisis.value = res;
    if (res.slug) {
      ramaGit.value = `feature/${res.slug}`;
    }
    pasoActual.value = 2;
  } catch (err: any) {
    error.value = err?.response?.data?.error || err?.message || 'Error al desofuscar enunciado';
  } finally {
    cargando.value = false;
  }
}

async function forjarProyectoCompleto() {
  cargando.value = true;
  error.value = null;
  mensajeEstado.value = 'Forjando arquitectura DDD, código fuente y commits atómicos...';

  try {
    const res = await assignmentService.forjarProyecto({
      text: textoEnunciado.value,
      analysis: analisis.value || undefined,
      author: {
        name: autorNombre.value,
        email: autorEmail.value,
        branchName: ramaGit.value,
        remoteUrl: remoteUrl.value || undefined,
        githubToken: githubToken.value || undefined,
      },
      stack: stackSeleccionado.value,
    });

    proyecto.value = res;
    pasoActual.value = 3;
  } catch (err: any) {
    error.value = err?.response?.data?.error || err?.message || 'Error al forjar proyecto DDD';
  } finally {
    cargando.value = false;
  }
}

async function descargarZip() {
  if (!proyecto.value) return;
  try {
    const nombre = `${proyecto.value.slug}-ddd.zip`;
    await assignmentService.descargarProyectoZip(proyecto.value.archivos, nombre);
    zipDescargado.value = true;
    setTimeout(() => {
      zipDescargado.value = false;
    }, 3000);
  } catch (err) {
    console.error('Error al descargar ZIP:', err);
    alert('Falla al comprimir archivo .ZIP');
  }
}

async function ejecutarPushRemoto() {
  if (!proyecto.value) return;
  ejecutandoPush.value = true;
  logsPush.value = ['[A.R.E.S.] Iniciando secuencia de Push Autónomo a GitHub...'];
  pushExitoso.value = false;

  try {
    const planConRemoto = {
      ...proyecto.value.planGit,
      autor: {
        ...proyecto.value.planGit.autor,
        remoteUrl: remoteUrl.value || proyecto.value.planGit.autor.remoteUrl,
        githubToken: githubToken.value || proyecto.value.planGit.autor.githubToken,
      },
    };

    const res = await assignmentService.ejecutarGitPush(proyecto.value.archivos, planConRemoto);
    logsPush.value = res.logs;
    pushExitoso.value = res.exitoso;

    if (!res.exitoso) {
      error.value = res.error || 'Falla durante la ejecución git';
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.message || 'Error de conexión con el backend Git';
    logsPush.value.push(`❌ ${msg}`);
    error.value = msg;
  } finally {
    ejecutandoPush.value = false;
  }
}

function copiarScriptGit() {
  if (!proyecto.value) return;
  navigator.clipboard.writeText(proyecto.value.planGit.scripts.bat);
  comandosCopiados.value = true;
  setTimeout(() => {
    comandosCopiados.value = false;
  }, 2500);
}

function copiarMarkdown() {
  if (!proyecto.value) return;
  navigator.clipboard.writeText(proyecto.value.readmeHumanizado);
}

function copiarCodigo() {
  if (!archivoActivo.value) return;
  navigator.clipboard.writeText(archivoActivo.value.contenido);
}

function cerrarModal() {
  uiStore.toggleModalForge();
  emit('cerrar');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md font-mono animate-fadeIn">
    <div class="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl border border-[#00ffaa]/50 bg-[#071329] shadow-[0_0_40px_rgba(0,255,170,0.25)] text-slate-200 overflow-hidden">
      <!-- Barra Superior Táctica -->
      <div class="px-4 py-3 bg-[#040914] border-b border-[#132a4a] flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">📋</span>
          <div>
            <div class="font-orbitron font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
              <span>FORJA SOBERANA DE EJERCICIOS & GIT AUTÓNOMO</span>
              <span class="px-2 py-0.5 rounded text-[10px] bg-[#00ffaa]/15 border border-[#00ffaa]/50 text-[#00ffaa]">
                v3.5 SOVEREIGN FORGE
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              Desofuscador de PDFs, commits atómicos por Bounded Context y atribución de GitHub graph.
            </p>
          </div>
        </div>

        <button
          @click="cerrarModal"
          class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-red-400 hover:text-red-400 text-slate-400 text-xs transition cursor-pointer"
        >
          ✕ CERRAR
        </button>
      </div>

      <!-- Barra de Pasos / Tabs -->
      <div class="grid grid-cols-4 bg-[#050e1f] border-b border-[#132a4a] text-xs">
        <button
          @click="pasoActual = 1"
          class="py-2.5 px-3 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 font-bold"
          :class="pasoActual === 1 ? 'border-[#00ffaa] text-[#00ffaa] bg-[#00ffaa]/10' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>1.</span>
          <span class="hidden sm:inline">PDF / Enunciado Crudo</span>
          <span class="sm:hidden">PDF</span>
        </button>

        <button
          @click="pasoActual = 2"
          class="py-2.5 px-3 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 font-bold"
          :class="pasoActual === 2 ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>2.</span>
          <span class="hidden sm:inline">Autor & Git Config</span>
          <span class="sm:hidden">Autor</span>
        </button>

        <button
          @click="pasoActual = 3"
          :disabled="!proyecto"
          class="py-2.5 px-3 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          :class="pasoActual === 3 ? 'border-purple-400 text-purple-300 bg-purple-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>3.</span>
          <span class="hidden sm:inline">Commits & Código DDD</span>
          <span class="sm:hidden">Commits</span>
        </button>

        <button
          @click="pasoActual = 4"
          :disabled="!proyecto"
          class="py-2.5 px-3 flex items-center justify-center gap-2 transition cursor-pointer border-b-2 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          :class="pasoActual === 4 ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <span>4.</span>
          <span class="hidden sm:inline">Despliegue & GitHub</span>
          <span class="sm:hidden">Deploy</span>
        </button>
      </div>

      <!-- Banner de Estado / Notificaciones -->
      <div v-if="cargando" class="px-4 py-2 bg-cyan-950/60 border-b border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
        <span class="animate-spin text-base">⚙️</span>
        <span>{{ mensajeEstado }}</span>
      </div>

      <div v-if="error" class="px-4 py-2 bg-red-950/70 border-b border-red-500/40 text-red-300 text-xs flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>⚠️</span>
          <span>{{ error }}</span>
        </div>
        <button @click="error = null" class="text-xs hover:text-red-100">✕</button>
      </div>

      <!-- Cuerpo Principal del Wizard -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- ============================================================ -->
        <!-- PASO 1: ENUNCIADO CRUDO / DESOFUSCADOR DE PDF -->
        <!-- ============================================================ -->
        <div v-if="pasoActual === 1" class="space-y-4">
          <!-- Presets de Demostración Inmediata -->
          <div class="flex flex-wrap items-center justify-between gap-2 bg-[#040914] p-2.5 rounded-lg border border-[#132a4a]">
            <div class="flex items-center gap-2 text-xs text-slate-300">
              <span class="text-yellow-400">⚡</span>
              <span class="font-bold">PRESETS TÁCTICOS (1-CLIC):</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(p, idx) in presetsEjemplo"
                :key="idx"
                @click="cargarPreset(idx)"
                class="px-2.5 py-1 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-[#00ffaa] hover:text-[#00ffaa] text-xs transition cursor-pointer"
              >
                {{ p.titulo }}
              </button>
            </div>
          </div>

          <!-- Textarea Enunciado Crudo -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <label class="text-slate-300 font-bold flex items-center gap-1.5">
                <span>📄 Pegar Enunciado Crudo (PDF, Word, Campus Virtual, WhatsApp):</span>
              </label>
              <span class="text-[11px] text-slate-400">
                Limpia automáticamente guiones cortados ("desa- rrollo") y encabezados de examen.
              </span>
            </div>
            <textarea
              v-model="textoEnunciado"
              rows="12"
              class="w-full rounded-lg border border-[#132a4a] bg-[#040914] p-3 text-xs text-slate-200 focus:border-[#00ffaa] focus:outline-none focus:ring-1 focus:ring-[#00ffaa] font-mono leading-relaxed resize-y"
              placeholder="Pega aquí el texto del PDF tal cual lo copiaste (aunque tenga saltos de línea desordenados, palabras cortadas con guiones o encabezados de examen)..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              @click="desofuscarTexto"
              :disabled="!textoEnunciado.trim() || cargando"
              class="px-5 py-2.5 rounded-lg bg-[#00ffaa]/20 border border-[#00ffaa] hover:bg-[#00ffaa]/30 text-[#00ffaa] text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,255,170,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>✨</span>
              <span>DESOFUSCAR & EXTRAER BOUNDED CONTEXTS</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- PASO 2: CONFIGURACIÓN DE AUTOR & GIT -->
        <!-- ============================================================ -->
        <div v-if="pasoActual === 2" class="space-y-4">
          <!-- Resumen de Desofuscación -->
          <div v-if="analisis" class="rounded-lg border border-cyan-500/40 bg-cyan-950/20 p-3 text-xs space-y-2">
            <div class="flex items-center justify-between text-cyan-300 font-bold">
              <div class="flex items-center gap-2">
                <span>✅</span>
                <span>ENUNCIADO DESOFUSCADO CON ÉXITO: {{ analisis.titulo }}</span>
              </div>
              <span class="text-[11px] bg-cyan-900/50 px-2 py-0.5 rounded border border-cyan-500/40">
                {{ analisis.estadisticasLimpieza.palabrasReparadas }} palabras reparadas // {{ analisis.estadisticasLimpieza.lineasRuidoEliminadas }} ruidos removidos
              </span>
            </div>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span class="text-slate-400">Bounded Contexts detectados:</span>
              <span
                v-for="ctx in analisis.boundedContexts"
                :key="ctx.identificador"
                class="px-2 py-0.5 rounded-full text-[11px] bg-purple-950/80 border border-purple-500/50 text-purple-300 font-bold"
              >
                {{ ctx.nombre }}
              </span>
            </div>
          </div>

          <!-- Campos de Autor para Git -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#040914] p-4 rounded-lg border border-[#132a4a]">
            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-bold">Nombre del Autor (Git Author Name):</label>
              <input
                v-model="autorNombre"
                type="text"
                class="w-full rounded bg-[#071329] border border-[#132a4a] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                placeholder="Ej: Kevin Alumno"
              />
              <p class="text-[10px] text-slate-400">Aparecerá en el autor de cada commit (`git commit --author`)</p>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-bold">Correo de GitHub (Author Email):</label>
              <input
                v-model="autorEmail"
                type="email"
                class="w-full rounded bg-[#071329] border border-[#132a4a] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                placeholder="Ej: tuusuario@gmail.com"
              />
              <p class="text-[10px] text-slate-400">Debe coincidir con tu GitHub para que ilumine tus cuadritos verdes</p>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-bold">Rama de Trabajo (Git Feature Branch):</label>
              <input
                v-model="ramaGit"
                type="text"
                class="w-full rounded bg-[#071329] border border-[#132a4a] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                placeholder="Ej: feature/prestamos-ddd"
              />
              <p class="text-[10px] text-slate-400">Convención de rama por bounded context o tarea</p>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs text-slate-300 font-bold">Stack Tecnológico Sugerido:</label>
              <select
                v-model="stackSeleccionado"
                class="w-full rounded bg-[#071329] border border-[#132a4a] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option v-for="s in stacks" :key="s.id" :value="s.id">
                  {{ s.icono }} {{ s.nombre }}
                </option>
              </select>
              <p class="text-[10px] text-slate-400">Genera código, puertos, repositorios y tests adaptados al stack</p>
            </div>
          </div>

          <!-- Conexión Remota GitHub Opcional -->
          <div class="bg-[#040914] p-4 rounded-lg border border-[#132a4a] space-y-3">
            <div class="text-xs text-slate-200 font-bold flex items-center gap-2">
              <span>🐙</span>
              <span>CONEXIÓN REMOTA GITHUB (OPCIONAL PARA PUSH AUTÓNOMO)</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs text-slate-300">URL del Repositorio Remoto:</label>
                <input
                  v-model="remoteUrl"
                  type="text"
                  class="w-full rounded bg-[#071329] border border-[#132a4a] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  placeholder="https://github.com/usuario/mi-ejercicio-ddd.git"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs text-slate-300">GitHub Personal Access Token (PAT):</label>
                <input
                  v-model="githubToken"
                  type="password"
                  class="w-full rounded bg-[#071329] border border-[#132a4a] px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Opcional)"
                />
              </div>
            </div>
            <p class="text-[11px] text-slate-400">
              💡 Si no proporcionas token ni repositorio, A.R.E.S. te entregará el .ZIP con el repositorio `.git` pre-iniciado y el script `setup-git.bat` listo para doble clic.
            </p>
          </div>

          <div class="flex justify-between items-center pt-2">
            <button
              @click="pasoActual = 1"
              class="px-4 py-2 rounded bg-[#0b1b36] border border-[#132a4a] text-slate-300 text-xs transition cursor-pointer"
            >
              ◀ Volver al Enunciado
            </button>

            <button
              @click="forjarProyectoCompleto"
              :disabled="cargando"
              class="px-5 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-400 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:opacity-50"
            >
              <span>⚔️</span>
              <span>FORJAR CÓDIGO DDD & CRONOGRAMA GIT</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- PASO 3: CRONOGRAMA DE COMMITS & EXPLORADOR DE CÓDIGO -->
        <!-- ============================================================ -->
        <div v-if="pasoActual === 3 && proyecto" class="space-y-4">
          <!-- Estadísticas del Proyecto Forjado -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div class="bg-[#040914] p-2.5 rounded-lg border border-[#132a4a] text-center">
              <div class="text-[11px] text-slate-400">ARCHIVOS TOTALES</div>
              <div class="text-base font-bold text-[#00ffaa]">{{ proyecto.archivos.length }}</div>
            </div>
            <div class="bg-[#040914] p-2.5 rounded-lg border border-[#132a4a] text-center">
              <div class="text-[11px] text-slate-400">COMMITS ATÓMICOS</div>
              <div class="text-base font-bold text-cyan-300">{{ proyecto.planGit.commits.length }}</div>
            </div>
            <div class="bg-[#040914] p-2.5 rounded-lg border border-[#132a4a] text-center">
              <div class="text-[11px] text-slate-400">BOUNDED CONTEXTS</div>
              <div class="text-base font-bold text-purple-300">{{ proyecto.boundedContexts.length }}</div>
            </div>
            <div class="bg-[#040914] p-2.5 rounded-lg border border-[#132a4a] text-center">
              <div class="text-[11px] text-slate-400">RAMA ASIGNADA</div>
              <div class="text-xs font-bold text-yellow-300 truncate">{{ proyecto.planGit.branchName }}</div>
            </div>
          </div>

          <!-- Selector de Vista Previa (Código vs README vs SPEC) -->
          <div class="flex items-center justify-between border-b border-[#132a4a] pb-2 text-xs">
            <div class="flex items-center gap-2">
              <button
                @click="vistaPreviaTab = 'readme'"
                class="px-3 py-1.5 rounded transition cursor-pointer font-bold"
                :class="vistaPreviaTab === 'readme' ? 'bg-[#00ffaa]/20 border border-[#00ffaa] text-[#00ffaa]' : 'text-slate-400 hover:text-slate-200'"
              >
                📝 README.md Humanizado
              </button>
              <button
                @click="vistaPreviaTab = 'codigo'"
                class="px-3 py-1.5 rounded transition cursor-pointer font-bold"
                :class="vistaPreviaTab === 'codigo' ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300' : 'text-slate-400 hover:text-slate-200'"
              >
                💻 Explorador de Archivos ({{ proyecto.archivos.length }})
              </button>
              <button
                @click="vistaPreviaTab = 'spec'"
                class="px-3 py-1.5 rounded transition cursor-pointer font-bold"
                :class="vistaPreviaTab === 'spec' ? 'bg-purple-500/20 border border-purple-400 text-purple-300' : 'text-slate-400 hover:text-slate-200'"
              >
                📋 SPECIFICATION.md
              </button>
            </div>

            <span class="text-[11px] text-slate-400 hidden sm:inline">
              Autor: <strong class="text-slate-200">{{ proyecto.planGit.autor.name }}</strong> &lt;{{ proyecto.planGit.autor.email }}&gt;
            </span>
          </div>

          <!-- Contenido según Tab Seleccionada -->
          <div v-if="vistaPreviaTab === 'readme'" class="bg-[#040914] p-4 rounded-lg border border-[#132a4a] max-h-96 overflow-y-auto">
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-[#132a4a]">
              <span class="text-[11px] text-slate-400 font-bold">📄 VISTA PREVIA DEL README.md (REDACTADO COMO ALUMNO / INGENIERO REAL):</span>
              <button
                @click="copiarMarkdown"
                class="px-2 py-0.5 rounded bg-[#0b1b36] border border-[#132a4a] hover:border-cyan-400 text-cyan-300 text-[10px] cursor-pointer"
              >
                Copiar Markdown
              </button>
            </div>
            <pre class="text-xs text-slate-300 whitespace-pre-wrap font-mono">{{ proyecto.readmeHumanizado }}</pre>
          </div>

          <div v-else-if="vistaPreviaTab === 'spec'" class="bg-[#040914] p-4 rounded-lg border border-[#132a4a] max-h-96 overflow-y-auto">
            <pre class="text-xs text-slate-300 whitespace-pre-wrap font-mono">{{ proyecto.especificacionMarkdown }}</pre>
          </div>

          <div v-else-if="vistaPreviaTab === 'codigo'" class="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-96">
            <!-- Lista de Archivos -->
            <div class="bg-[#040914] rounded-lg border border-[#132a4a] p-2 overflow-y-auto max-h-96 space-y-1">
              <div
                v-for="(arch, idx) in proyecto.archivos"
                :key="arch.ruta"
                @click="archivoSeleccionadoIdx = idx"
                class="px-2.5 py-1.5 rounded text-[11px] font-mono cursor-pointer transition truncate flex items-center justify-between"
                :class="archivoSeleccionadoIdx === idx ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 font-bold' : 'hover:bg-[#0b1b36] text-slate-400'"
              >
                <span class="truncate">{{ arch.ruta }}</span>
              </div>
            </div>

            <!-- Visor de Código -->
            <div class="md:col-span-2 bg-[#040914] rounded-lg border border-[#132a4a] p-3 overflow-y-auto max-h-96">
              <div v-if="archivoActivo" class="space-y-2">
                <div class="flex items-center justify-between border-b border-[#132a4a] pb-1.5">
                  <span class="text-xs font-bold text-cyan-300">{{ archivoActivo.ruta }}</span>
                  <button
                    @click="copiarCodigo"
                    class="px-2 py-0.5 rounded bg-[#0b1b36] border border-[#132a4a] text-slate-300 text-[10px] hover:border-[#00ffaa]"
                  >
                    Copiar Código
                  </button>
                </div>
                <pre class="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{{ archivoActivo.contenido }}</pre>
              </div>
            </div>
          </div>

          <!-- Cronograma Visual de Commits Atómicos -->
          <div class="bg-[#040914] p-3 rounded-lg border border-[#132a4a] space-y-2">
            <div class="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>🌳 CRONOGRAMA DE COMMITS ATÓMICOS PLANIFICADOS ({{ proyecto.planGit.commits.length }} COMMITS):</span>
              <span class="text-[11px] text-emerald-400">Autor: {{ proyecto.planGit.autor.name }}</span>
            </div>
            <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div
                v-for="c in proyecto.planGit.commits"
                :key="c.id"
                class="p-2 rounded bg-[#071329] border border-[#132a4a] text-xs flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2 truncate">
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                    :class="{
                      'bg-yellow-950 border border-yellow-500/50 text-yellow-300': c.tipo === 'chore',
                      'bg-cyan-950 border border-cyan-500/50 text-cyan-300': c.tipo === 'feat',
                      'bg-purple-950 border border-purple-500/50 text-purple-300': c.tipo === 'test',
                      'bg-emerald-950 border border-emerald-500/50 text-emerald-300': c.tipo === 'docs',
                    }"
                  >
                    {{ c.tipo.toUpperCase() }}
                  </span>
                  <span class="text-slate-200 font-mono truncate">{{ c.mensaje }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
                  <span class="bg-[#040914] px-1.5 py-0.5 rounded">{{ c.archivos.length }} arch.</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-2">
            <button
              @click="pasoActual = 2"
              class="px-4 py-2 rounded bg-[#0b1b36] border border-[#132a4a] text-slate-300 text-xs transition cursor-pointer"
            >
              ◀ Configuración de Autor
            </button>

            <button
              @click="pasoActual = 4"
              class="px-5 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            >
              <span>🚀</span>
              <span>CONTINUAR A DESPLIEGUE Y DESCARGA</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        <!-- ============================================================ -->
        <!-- PASO 4: DESPLIEGUE, PUSH GITHUB Y DESCARGA .ZIP -->
        <!-- ============================================================ -->
        <div v-if="pasoActual === 4 && proyecto" class="space-y-4">
          <div class="bg-[#040914] p-4 rounded-lg border border-emerald-500/40 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <span>🛡️</span>
                <span>PROYECTO LISTO PARA DESPLIEGUE AUTÓNOMO</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-xs border border-emerald-500/50">
                Rama: {{ proyecto.planGit.branchName }}
              </span>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed">
              El proyecto incluye todos los Bounded Contexts, entidades ricas, casos de uso, repositorios en memoria, pruebas unitarias y el README redactado con tu nombre <strong>{{ proyecto.planGit.autor.name }}</strong>.
            </p>

            <!-- Acciones Principales -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <!-- Opción 1: Descargar .ZIP con Git Pre-iniciado -->
              <button
                @click="descargarZip"
                class="p-3 rounded-lg bg-[#00ffaa]/15 border border-[#00ffaa]/70 hover:bg-[#00ffaa]/25 text-[#00ffaa] text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,255,170,0.15)]"
              >
                <span class="text-lg">📦</span>
                <span>DESCARGAR .ZIP</span>
                <span class="text-[10px] text-slate-400">Incluye scripts setup-git.bat / .sh</span>
                <span v-if="zipDescargado" class="text-[10px] text-white bg-emerald-600 px-1.5 py-0.5 rounded">¡DESCARGADO!</span>
              </button>

              <!-- Opción 2: Ejecutar Push Autónomo a GitHub -->
              <button
                @click="ejecutarPushRemoto"
                :disabled="ejecutandoPush || !remoteUrl"
                class="p-3 rounded-lg bg-cyan-500/15 border border-cyan-400/70 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
                :title="remoteUrl ? 'Ejecuta git init, commits atomicos y push a GitHub' : 'Configura una URL de repositorio remoto en el Paso 2 para activar el push directo'"
              >
                <span class="text-lg">🚀</span>
                <span>{{ ejecutandoPush ? 'EJECUTANDO PUSH...' : 'PUSH AUTÓNOMO A GITHUB' }}</span>
                <span class="text-[10px] text-slate-400">Ejecuta git y sube la rama</span>
                <span v-if="pushExitoso" class="text-[10px] text-white bg-cyan-600 px-1.5 py-0.5 rounded">¡SUBIDO A GITHUB!</span>
              </button>

              <!-- Opción 3: Copiar Script de Automatización -->
              <button
                @click="copiarScriptGit"
                class="p-3 rounded-lg bg-purple-500/15 border border-purple-400/70 hover:bg-purple-500/25 text-purple-300 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              >
                <span class="text-lg">📋</span>
                <span>COPIAR SETUP-GIT.BAT</span>
                <span class="text-[10px] text-slate-400">Para ejecutar en tu terminal</span>
                <span v-if="comandosCopiados" class="text-[10px] text-white bg-purple-600 px-1.5 py-0.5 rounded">¡COPIADO!</span>
              </button>
            </div>
          </div>

          <!-- Consola de Logs del Push -->
          <div v-if="logsPush.length > 0" class="bg-[#040914] p-3 rounded-lg border border-[#132a4a] space-y-1.5">
            <div class="text-[11px] font-bold text-cyan-400 flex items-center justify-between">
              <span>📡 REGISTRO DE EJECUCIÓN GIT AUTÓNOMO:</span>
              <span v-if="pushExitoso" class="text-emerald-400 font-bold">🟢 RAMA SUBIDA CON ÉXITO</span>
            </div>
            <div class="p-2.5 rounded bg-[#010409] font-mono text-xs text-slate-300 max-h-48 overflow-y-auto space-y-1">
              <div v-for="(log, idx) in logsPush" :key="idx" class="leading-relaxed">
                {{ log }}
              </div>
            </div>
          </div>

          <!-- Instrucciones Rápidas para Ejecutar en Local -->
          <div class="bg-[#040914] p-3.5 rounded-lg border border-[#132a4a] text-xs space-y-2">
            <div class="font-bold text-slate-200">🛠️ ¿Cómo usar el .ZIP descargado en tu máquina?</div>
            <ol class="list-decimal list-inside space-y-1 text-slate-300">
              <li>Descomprime el archivo <strong>{{ proyecto.slug }}-ddd.zip</strong> en tu computadora.</li>
              <li>Abre una terminal en esa carpeta y ejecuta <strong>setup-git.bat</strong> (en Windows) o <strong>./setup-git.sh</strong> (en Linux/Mac).</li>
              <li>El script inicializa git, crea la rama <strong>{{ proyecto.planGit.branchName }}</strong> y ejecuta todos los commits con tu usuario <strong>{{ proyecto.planGit.autor.name }} &lt;{{ proyecto.planGit.autor.email }}&gt;</strong>.</li>
              <li>Para subirlo a tu GitHub: <code class="text-cyan-300 bg-slate-900 px-1 rounded">git remote add origin &lt;URL&gt;</code> y luego <code class="text-cyan-300 bg-slate-900 px-1 rounded">git push -u origin {{ proyecto.planGit.branchName }}</code>. ¡Tus cuadros de GitHub se pondrán verdes!</li>
            </ol>
          </div>

          <div class="flex justify-between items-center pt-2">
            <button
              @click="pasoActual = 3"
              class="px-4 py-2 rounded bg-[#0b1b36] border border-[#132a4a] text-slate-300 text-xs transition cursor-pointer"
            >
              ◀ Revisar Código y Commits
            </button>

            <button
              @click="cerrarModal"
              class="px-5 py-2 rounded bg-[#0b1b36] border border-[#00ffaa]/50 hover:bg-[#00ffaa]/20 text-[#00ffaa] text-xs font-bold transition cursor-pointer"
            >
              ✓ FINALIZAR MISIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
</style>
