/**
 * @fileoverview Store de navegación UI y derivación táctica de artefactos entre módulos.
 * Permite que el chat derive automáticamente artefactos a Escudo Documental, Espada Full-Stack o Arquitecto.
 * @module stores/ui.store
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const tabActiva = ref(1);

  // Buffer de transferencia para cada módulo
  const docBuffer = ref<{ titulo?: string; tipo?: string; contenido: string } | null>(null);
  const codeBuffer = ref<{ codigo: string; lenguaje?: string } | null>(null);
  const architectBuffer = ref<{ diagrama: string } | null>(null);

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
    docBuffer,
    codeBuffer,
    architectBuffer,
    navegarTab,
    derivarADocumentacion,
    derivarACodigo,
    derivarAArquitecto,
  };
});
