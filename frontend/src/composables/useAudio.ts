/**
 * @fileoverview Sintetizador de efectos de audio tácticos mediante WebAudio API.
 * No requiere archivos de audio externos.
 * @module composables/useAudio
 */

import { ref } from 'vue';

const audioSilenciado = ref(false);
let ctx: AudioContext | null = null;

function obtenerContextoAudio(): AudioContext {
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function useAudio() {
  function reproducirSonido(tipo: 'slash' | 'shield' | 'sprint' | 'error' | 'victory') {
    if (audioSilenciado.value) return;

    try {
      const audio = obtenerContextoAudio();
      const now = audio.currentTime;

      switch (tipo) {
        case 'slash': {
          // Espadazo binario: barrido de frecuencia rápida descendente + ruido
          const osc = audio.createOscillator();
          const gain = audio.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

          osc.connect(gain);
          gain.connect(audio.destination);

          osc.start(now);
          osc.stop(now + 0.18);
          break;
        }

        case 'shield': {
          // Escudo Aegis: zumbido protector resonante ascendente
          const osc = audio.createOscillator();
          const gain = audio.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

          osc.connect(gain);
          gain.connect(audio.destination);

          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }

        case 'sprint': {
          // Sprint de foco: dos tonos rápidos agudos
          [0, 0.08].forEach((offset, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(idx === 0 ? 523.25 : 659.25, now + offset);

            gain.gain.setValueAtTime(0.2, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.07);

            osc.connect(gain);
            gain.connect(audio.destination);

            osc.start(now + offset);
            osc.stop(now + offset + 0.07);
          });
          break;
        }

        case 'error': {
          // Alarma de excepción: dos tonos bajos discordantes
          const osc1 = audio.createOscillator();
          const osc2 = audio.createOscillator();
          const gain = audio.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'square';
          osc1.frequency.setValueAtTime(150, now);
          osc2.frequency.setValueAtTime(142, now);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audio.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.3);
          osc2.stop(now + 0.3);
          break;
        }

        case 'victory': {
          // Auditoría perfecta / Victoria: arpegio triunfal ascendente
          const notas = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
          notas.forEach((freq, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();

            const t = now + idx * 0.08;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

            osc.connect(gain);
            gain.connect(audio.destination);

            osc.start(t);
            osc.stop(t + 0.2);
          });
          break;
        }
      }
    } catch (e) {
      console.warn('⚠️ [Audio] No se pudo reproducir efecto:', e);
    }
  }

  return {
    audioSilenciado,
    reproducirSonido,
    toggleSilencio: () => {
      audioSilenciado.value = !audioSilenciado.value;
    },
  };
}
