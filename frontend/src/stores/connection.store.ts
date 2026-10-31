import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { API_BASE_ORIGIN, apiFetch } from '../services/http.js';
type AvailableModel = { id: string; nombre: string; proveedor: 'gemini' | 'openrouter' | 'auto' };
function availableModel(value: unknown): value is AvailableModel {
  if (!value || typeof value !== 'object') return false;
  const model = value as Partial<AvailableModel>;
  return (
    typeof model.id === 'string' &&
    typeof model.nombre === 'string' &&
    ['gemini', 'openrouter', 'auto'].includes(model.proveedor || '')
  );
}

export const useConnectionStore = defineStore('connection', () => {
  const state = ref<'checking' | 'online' | 'locked' | 'offline' | 'error'>('checking');
  const server = ref('');
  const waking = ref(false);
  const models = ref<AvailableModel[]>([]);
  let requestId = 0;
  let pending: AbortController | undefined;
  const label = computed(
    () =>
      ({
        checking: waking.value ? 'Iniciando servidor…' : 'Comprobando conexión',
        online: 'API conectada',
        locked: 'Configurar acceso',
        offline: 'Sin conexión',
        error: 'API no disponible',
      })[state.value],
  );
  async function check() {
    const id = ++requestId;
    pending?.abort();
    pending = new AbortController();
    waking.value = false;
    const wakeTimer = window.setTimeout(() => {
      if (id === requestId) waking.value = true;
    }, 8000);
    state.value = 'checking';
    try {
      const signal = AbortSignal.any([pending.signal, AbortSignal.timeout(60000)]);
      const health = await fetch(`${API_BASE_ORIGIN}/health`, { signal });
      if (!health.ok) throw new Error();
      const data = await health.json();
      if (id !== requestId) return;
      server.value = typeof data.agent === 'string' ? data.agent : '';
      const response = await apiFetch('/api/models', { signal }, false);
      if (id !== requestId) return;
      if (response.status === 401 || response.status === 403) {
        state.value = 'locked';
        models.value = [];
        return;
      }
      if (!response.ok) {
        state.value = 'error';
        models.value = [];
        return;
      }
      const catalogue = await response.json();
      if (id !== requestId) return;
      models.value = Array.isArray(catalogue.models) ? catalogue.models.filter(availableModel) : [];
      state.value = models.value.length ? 'online' : 'error';
    } catch {
      if (id === requestId) state.value = 'offline';
    } finally {
      window.clearTimeout(wakeTimer);
    }
  }
  return { state, server, models, label, check };
});
