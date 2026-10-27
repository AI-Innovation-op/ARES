/**
 * @fileoverview Generador de Arte ASCII y Banner Cibernético para la Terminal Táctica A.R.E.S. (v3.7).
 * Recrea fielmente el diseño de placa de circuito impreso (PCB) con trazas de cobre / cian,
 * bloques microprocesadores de silicio y pines de conexión en la base.
 * @module cli/banner
 */

import pc from 'picocolors';

export function imprimirBannerCircuito(
  version: string = 'v3.7',
  subtitulo: string = '[J.A.R.V.I.S. Standalone Core]'
): void {
  const w = (txt: string) => pc.bold(pc.white(txt));
  const c = (txt: string) => pc.cyan(txt);
  const dim = (txt: string) => pc.dim(pc.cyan(txt));

  const lineas = [
    `  ${w('███████')}${c('┐')}   ${w('███████')}${c('┐')}   ${w('████████')}${c('┐')}  ${w('████████')}${c('┐')}`,
    `  ${w('██')}   ${w('██')}${c('│')}   ${w('██')}   ${w('██')}${c('│')}   ${w('██')}${c('┌──────┘')}  ${w('██')}${c('┌──────┘')}`,
    `  ${w('███████')}${c('│')}   ${w('███████')}${c('├')}${c('─┐')} ${w('███████')}    ${w('████████')}${c('┐')}     ${pc.bold(pc.white(version + ' TACTICAL CLI'))}`,
    `  ${w('██')}   ${w('██')}${c('│')}   ${w('██')}   ${w('██')}${c('││')} ${w('██')}${c('┌──────┘')}  ${c('└──────┐')}${w('██')}${c('│')}     ${pc.bold(pc.cyan(subtitulo))}`,
    `  ${w('██')}   ${w('██')}${c('│')}   ${w('██')}   ${w('██')}${c('││')} ${w('████████')}${c('┐')}  ${w('████████')}${c('│')}`,
    `  ${dim('╘═╝')}   ${dim('╘═╝')}   ${dim('╘═╝')}   ${dim('╘═╝')}${c('╘')}${dim('╘════════╝')}  ${dim('╘════════╝')}`,
  ];

  console.log('\n' + lineas.join('\n'));
  console.log(pc.dim('  Autonomous Resilient Engineering & Software-Documentation God\n'));
}

export function imprimirLineaDivisoria(titulo?: string): void {
  const linea = '─'.repeat(titulo ? Math.max(10, 68 - titulo.length - 4) : 70);
  if (titulo) {
    console.log(pc.dim('┌─[ ') + pc.bold(pc.cyan(titulo)) + pc.dim(' ]' + linea));
  } else {
    console.log(pc.dim('─'.repeat(70)));
  }
}

export function imprimirTarjetaEstado(telemetria: {
  estado: string;
  version: string;
  uptime: number;
  modelo: string;
  modo: string;
  estamina?: number;
}): void {
  imprimirLineaDivisoria('TELEMETRÍA TÁCTICA DEL SISTEMA');
  console.log(`  ${pc.gray('•')} ${pc.white('Estado:')}         ${pc.green('🟢 ' + telemetria.estado)}`);
  console.log(`  ${pc.gray('•')} ${pc.white('Núcleo:')}         ${pc.bold(pc.cyan('A.R.E.S. ' + telemetria.version))}`);
  console.log(`  ${pc.gray('•')} ${pc.white('Modo Activo:')}    ${pc.yellow(telemetria.modo.toUpperCase())}`);
  console.log(`  ${pc.gray('•')} ${pc.white('Modelo IA:')}      ${pc.magenta(telemetria.modelo)}`);
  console.log(`  ${pc.gray('•')} ${pc.white('Tiempo Activo:')}  ${pc.white(telemetria.uptime + 's')} (${Math.floor(telemetria.uptime / 60)} min)`);
  if (telemetria.estamina !== undefined) {
    console.log(`  ${pc.gray('•')} ${pc.white('Bio-Estamina:')}   ${pc.green(telemetria.estamina + '%')} ${pc.dim('[NOMINAL]')}`);
  }
  console.log(pc.dim('└' + '─'.repeat(69)) + '\n');
}
