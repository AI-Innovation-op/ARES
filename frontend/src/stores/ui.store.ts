/**
 * @fileoverview Store de navegación UI y derivación táctica de artefactos entre módulos.
 * Permite que el chat derive automáticamente artefactos a Escudo Documental, Espada Full-Stack o Arquitecto.
 * @module stores/ui.store
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export type TacticalMode = 'centinela' | 'blitzkrieg' | 'arquitecto' | 'enjambre';

export const useUiStore = defineStore('ui', () => {
  const tabActiva = ref(1);
  const terminalAbierta = ref(false);
  const modalGithubAuditAbierto = ref(false);
  const modalSwarmAbierto = ref(false);
  const modalCicdAbierto = ref(false);
  const modalMemoriaAbierto = ref(false);
  const modalRadarAbierto = ref(false);
  const modalForgeAbierto = ref(false);
  const modoTactico = ref<TacticalMode>('centinela');

  // Buffer de transferencia para cada módulo
  const docBuffer = ref<{ titulo?: string; tipo?: string; contenido: string } | null>(null);
  const codeBuffer = ref<{ codigo: string; lenguaje?: string } | null>(null);
  const architectBuffer = ref<{ diagrama: string } | null>(null);

  function toggleTerminal() {
    terminalAbierta.value = !terminalAbierta.value;
  }

  function toggleModalGithubAudit() {
    modalGithubAuditAbierto.value = !modalGithubAuditAbierto.value;
  }

  function toggleModalSwarm() {
    modalSwarmAbierto.value = !modalSwarmAbierto.value;
  }

  function toggleModalCicd() {
    modalCicdAbierto.value = !modalCicdAbierto.value;
  }

  function toggleModalMemoria() {
    modalMemoriaAbierto.value = !modalMemoriaAbierto.value;
  }

  function toggleModalRadar() {
    modalRadarAbierto.value = !modalRadarAbierto.value;
  }

  function toggleModalForge() {
    modalForgeAbierto.value = !modalForgeAbierto.value;
  }

  function setModoTactico(modo: TacticalMode) {
    modoTactico.value = modo;
  }

  function navegarTab(tab: number) {
    tabActiva.value = tab;
  }

  function derivarADocumentacion(contenido: string, titulo?: string, tipo: string = 'RFC') {
    docBuffer.value = { contenido, titulo, tipo };
    tabActiva.value = 2; // Pestaña Escudo Documental
  }

  function derivarACodigo(codigo: string, lenguaje: string = 'typescript') {
    codeBuffer.value = { codigo, lenguaje };
    tabActiva.value = 3; // Pestaña Espada Full-Stack
  }

  function derivarAArquitecto(diagrama: string) {
    architectBuffer.value = { diagrama };
    tabActiva.value = 4; // Pestaña Arquitecto
  }

  return {
    tabActiva,
    terminalAbierta,
    modalGithubAuditAbierto,
    modalSwarmAbierto,
    modalCicdAbierto,
    modalMemoriaAbierto,
    modalRadarAbierto,
    modalForgeAbierto,
    modoTactico,
    docBuffer,
    codeBuffer,
    architectBuffer,
    toggleTerminal,
    toggleModalGithubAudit,
    toggleModalSwarm,
    toggleModalCicd,
    toggleModalMemoria,
    toggleModalRadar,
    toggleModalForge,
    setModoTactico,
    navegarTab,
    derivarADocumentacion,
    derivarACodigo,
    derivarAArquitecto,
  };
});
