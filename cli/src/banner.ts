/**
 * @fileoverview Generador de Arte ASCII y Banner Cibernético para la Terminal Táctica A.R.E.S. (v4.0).
 * Recrea fielmente las siglas A R E S con proporciones simétricas perfectas,
 * estética ciberpunk y atribución a AI Innovation.
 * @module cli/banner
 */

import pc from 'picocolors';

export function imprimirBannerCircuito(
  version: string = 'v4.0 RELEASE',
  subtitulo: string = 'Created by AI Innovation'
): void {
  const w = (txt: string) => pc.bold(pc.white(txt));
  const c = (txt: string) => pc.bold(pc.cyan(txt));
  const dim = (txt: string) => pc.dim(pc.cyan(txt));

  const lineas = [
    '  ' + w('██████╗ ') + '  ' + w('██████╗ ') + '  ' + w('███████╗') + '  ' + w('███████╗'),
    '  ' + w('██╔══██╗') + '  ' + w('██╔══██╗') + '  ' + w('██╔════╝') + '  ' + w('██╔════╝') + '     ' + pc.bold(pc.white(version)),
    '  ' + w('███████║') + '  ' + w('██████╔╝') + '  ' + w('█████╗  ') + '  ' + w('███████╗') + '     ' + c(subtitulo),
    '  ' + w('██╔══██║') + '  ' + w('██╔══██╗') + '  ' + w('██╔══╝  ') + '  ' + w('╚════██║'),
    '  ' + w('██║  ██║') + '  ' + w('██║  ██║') + '  ' + w('███████╗') + '  ' + w('███████║'),
    '  ' + dim('╚═╝  ╚═╝') + '  ' + dim('╚═╝  ╚═╝') + '  ' + dim('╚══════╝') + '  ' + dim('╚══════╝'),
  ];

  console.log('\n' + lineas.join('\n'));
  console.log(pc.dim('  Autonomous Resilient Engineering & Software-Documentation God\n'));
}

export function imprimirLineaDivisoria(titulo?: string): void {
  const linea = '─'.repeat(titulo ? Math.max(10, 68 - titulo.length - 2) : 70);
  if (titulo) {
    console.log(pc.dim('┌─ ') + pc.bold(pc.cyan(titulo)) + pc.dim(' ' + linea));
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
    console.log(`  ${pc.gray('•')} ${pc.white('Bio-Estamina:')}   ${pc.green(telemetria.estamina + '%')} ${pc.dim('Nominal')}`);
  }
  console.log(pc.dim('└' + '─'.repeat(69)) + '\n');
}
