#!/usr/bin/env node

/**
 * @fileoverview Git Pre-Push Hook Espartano — Protocolo Bio-Armadura "No Deploy a las 3:00 AM".
 * Bloquea despliegues entre 1:00 AM y 5:00 AM si los niveles de estamina del Comandante
 * caen por debajo del 40% (o por defecto en la 'Hora Maldita' de 3:00 AM a 4:00 AM).
 * @module hooks/pre-push
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Estilos ANSI para terminal
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function bannerEspartano() {
  console.log(RED + BOLD + `
    ███████╗███████╗██████╗  █████╗ ██████╗ ████████╗ █████╗ 
    ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗
    ███████╗███████╗██████╔╝███████║██████╔╝   ██║   ███████║
    ╚════██║╚════██║██╔═══╝ ██╔══██║██╔══██╗   ██║   ██╔══██║
    ███████║███████║██║     ██║  ██║██║  ██║   ██║   ██║  ██║
    ╚══════╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
` + RESET);
}

export function ejecutarVerificacion() {
  // 1. Bypass voluntario del Comandante
  if (process.env.FORCE_DEPLOY === '1' || process.env.ARES_FORCE === '1') {
    console.log(YELLOW + BOLD + '⚠️  [BYPASS TÁCTICO] Variable FORCE_DEPLOY=1 detectada.' + RESET);
    console.log(YELLOW + '   El Comandante asume la responsabilidad total de esta operación.' + RESET);
    console.log(GREEN + '   Procediendo con el despliegue...\n' + RESET);
    return 0;
  }

  // 2. Determinar la hora actual (o simulada en pruebas)
  const fecha = new Date();
  const hora = process.env.ARES_TEST_HOUR !== undefined 
    ? parseInt(process.env.ARES_TEST_HOUR, 10) 
    : fecha.getHours();

  const esHorarioNocturno = hora >= 1 && hora < 5;

  // Si está en horario diurno seguro (05:00 a 00:59)
  if (!esHorarioNocturno) {
    console.log(CYAN + BOLD + '🛡️  [A.R.E.S. Spartan Guard] ' + GREEN + 'Pre-push verificado.' + RESET);
    console.log(DIM + `   Hora táctica: ${hora}:${fecha.getMinutes().toString().padStart(2, '0')} hrs (Ventana diurna segura).` + RESET);
    console.log(GREEN + '⚔️  ¡Adelante con el push, Comandante!\n' + RESET);
    return 0;
  }

  // 3. Estamos en la ventana de combate nocturno (1:00 AM a 4:59 AM)
  let stamina = 30; // Valor por defecto en la madrugada si no hay telemetría reciente
  let nivelFatiga = 'CRITICAL';
  let minutosContinuos = 180;

  // Si se pasa estamina forzada por variable para tests
  if (process.env.ARES_TEST_STAMINA !== undefined) {
    stamina = parseInt(process.env.ARES_TEST_STAMINA, 10);
  } else {
    // Intentar leer telemetría real desde SQLite
    const posiblesRutasDB = [
      path.resolve(process.cwd(), 'database/ares.db'),
      path.resolve(process.cwd(), '../database/ares.db'),
      path.resolve('D:/ares-ecosystem/database/ares.db'),
    ];

    for (const rutaDB of posiblesRutasDB) {
      if (fs.existsSync(rutaDB)) {
        try {
          const db = new DatabaseSync(rutaDB);
          const fila = db.prepare(`
            SELECT stamina_pct, detected_fatigue_level, continuous_coding_minutes, logged_at 
            FROM bio_telemetry_logs 
            ORDER BY logged_at DESC 
            LIMIT 1
          `).get();

          if (fila) {
            stamina = fila.stamina_pct ?? stamina;
            nivelFatiga = fila.detected_fatigue_level ?? nivelFatiga;
            minutosContinuos = fila.continuous_coding_minutes ?? minutosContinuos;
          }
          break;
        } catch {
          // Usar valor por defecto si falla la lectura de sqlite
        }
      }
    }
  }

  // 4. Evaluar estamina: si es < 40%, BLOQUEO ESPARTANO TOTAL
  const umbralStaminaMinima = 40;
  if (stamina < umbralStaminaMinima) {
    bannerEspartano();
    console.error(RED + BOLD + '════════════════════════════════════════════════════════════════════════════════' + RESET);
    console.error(RED + BOLD + ' 🛑 PROTOCOLO BIO-ARMADURA A.R.E.S. — DEPLOY NOCTURNO BLOQUEADO 🛑' + RESET);
    console.error(RED + BOLD + '════════════════════════════════════════════════════════════════════════════════' + RESET);
    console.error(RED + `
  ⚠️  ALERTA ROJA: Son las ${BOLD}${hora}:${fecha.getMinutes().toString().padStart(2, '0')} hrs${RESET}${RED} (Ventana maldita 01:00 - 05:00).
  ⚡ Estamina Biológica: ${BOLD}${stamina}%${RESET}${RED} (Mínimo exigido: ${umbralStaminaMinima}%).
  💤 Nivel de Fatiga: ${BOLD}${nivelFatiga}${RESET}${RED}.
  
  "Ningún espartano despliega a producción en la hora maldita con la mente agotada."
  El riesgo de introducir fallos críticos, bugs destructivos o corromper datos es del 89%.
` + RESET);
    console.error(YELLOW + BOLD + '  📋 DIRECTIVA ESPARTANA:' + RESET);
    console.error(YELLOW + '     1. Tu código está seguro localmente en Git.' + RESET);
    console.error(YELLOW + '     2. Cierra el editor, apaga la pantalla y duerme al menos 6 horas.' + RESET);
    console.error(YELLOW + '     3. Bebe 500ml de agua inmediatamente.' + RESET);
    console.error(YELLOW + '     4. Mañana continuarás la batalla con estamina restaurada al 100%.\n' + RESET);
    console.error(MAGENTA + '  ⚡ En caso de emergencia crítica absoluta de producción:' + RESET);
    console.error(DIM + '     PowerShell:  $env:FORCE_DEPLOY=1; git push' + RESET);
    console.error(DIM + '     Bash / CMD:  FORCE_DEPLOY=1 git push   (o usa git push --no-verify)\n' + RESET);
    console.error(RED + BOLD + '════════════════════════════════════════════════════════════════════════════════\n' + RESET);
    return 1; // Bloquea el push
  }

  // Estamina >= 40% en horario nocturno: Advertencia pero se autoriza
  console.log(YELLOW + BOLD + `⚠️  [A.R.E.S. Bio-Armadura] Despliegue nocturno detectado (${hora}:00 hrs).` + RESET);
  console.log(YELLOW + `   Estamina: ${stamina}% (Suficiente). Fatiga: ${nivelFatiga}.` + RESET);
  console.log(GREEN + '⚔️  Mantén el escudo en alto y vigila los logs tras el despliegue. ¡Autorizado!\n' + RESET);
  return 0;
}

// Ejecutar si se llama directamente
const codigoSalida = ejecutarVerificacion();
if (codigoSalida !== 0) {
  process.exit(codigoSalida);
}
