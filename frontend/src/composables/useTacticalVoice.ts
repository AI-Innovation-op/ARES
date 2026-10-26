/**
 * @fileoverview Síntesis de voz táctica de A.R.E.S. mediante Web Speech API.
 * Proporciona lectura táctica, dicción espartana y filtrado de formato Markdown.
 * @module composables/useTacticalVoice
 */

import { ref } from 'vue';

const vozHabilitada = ref(localStorage.getItem('ares_voice_enabled') !== 'false');
let vozSeleccionada: SpeechSynthesisVoice | null = null;

// Cargar y seleccionar la mejor voz en español disponible en el sistema
function cargarVoces(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const voces = window.speechSynthesis.getVoices();
  if (voces.length === 0) return;

  // Priorizar voces masculinas o profundas en español
  const vozEspanol =
    voces.find((v) => v.lang.startsWith('es') && (v.name.includes('Jorge') || v.name.includes('Diego') || v.name.includes('Pablo'))) ||
    voces.find((v) => v.lang === 'es-PE' || v.lang === 'es-ES' || v.lang === 'es-MX' || v.lang.startsWith('es'));

  vozSeleccionada = vozEspanol ?? voces[0] ?? null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cargarVoces();
  window.speechSynthesis.onvoiceschanged = cargarVoces;
}

/**
 * Limpia el texto de salida retirando el indicador de pose, código y markdown
 * para que la lectura en voz alta suene táctica, fluida y sin ruidos tipográficos.
 */
export function limpiarTextoParaVoz(texto: string): string {
  let limpio = texto;

  // 1. Retirar indicador de pose inicial: [🛡️ POSE 1: CENTINELA DOCUMENTAL ...]
  limpio = limpio.replace(/\[[^\]]*POSE[^\]]*\]/gi, '');

  // 2. Retirar bloques de código y diagramas Mermaid
  limpio = limpio.replace(/```[\s\S]*?```/gi, 'Código y diagramas en pantalla.');

  // 3. Retirar código inline
  limpio = limpio.replace(/`[^`]+`/g, '');

  // 4. Retirar enlaces markdown [texto](url) -> texto
  limpio = limpio.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Retirar asteriscos, almohadillas y guiones
  limpio = limpio.replace(/[*#_~]/g, '');

  // 6. Normalizar espacios
  limpio = limpio.replace(/\s+/g, ' ').trim();

  // 7. Limitar a un extracto táctico conciso (máximo 320 caracteres)
  if (limpio.length > 320) {
    const corte = limpio.slice(0, 320);
    const ultimoPunto = corte.lastIndexOf('.');
    limpio = (ultimoPunto > 180 ? corte.slice(0, ultimoPunto + 1) : corte) + ' Fin del reporte táctico.';
  }

  return limpio;
}

export function useTacticalVoice() {
  function hablar(texto: string): void {
    if (!vozHabilitada.value) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancelar cualquier locución anterior en curso
    window.speechSynthesis.cancel();

    const textoLimpio = limpiarTextoParaVoz(texto);
    if (!textoLimpio) return;

    const utterance = new SpeechSynthesisUtterance(textoLimpio);

    if (vozSeleccionada) {
      utterance.voice = vozSeleccionada;
    }

    // Parámetros para tono firme y espartano
    utterance.rate = 0.98;  // Cadencia militar precisa
    utterance.pitch = 0.88; // Barítono táctico
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  function toggleVoz(): void {
    vozHabilitada.value = !vozHabilitada.value;
    localStorage.setItem('ares_voice_enabled', vozHabilitada.value.toString());
    if (!vozHabilitada.value && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function detenerVoz(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  return {
    vozHabilitada,
    hablar,
    toggleVoz,
    detenerVoz,
  };
}
