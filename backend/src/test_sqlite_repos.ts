import { obtenerOCrearComandantePorDefecto, obtenerComandantePorId } from './repositories/commanders.repo.js';
import { crearConversacion, obtenerConversacionPorId, listarConversacionesPorComandante } from './repositories/conversations.repo.js';
import { guardarMensaje, obtenerUltimosMensajes } from './repositories/messages.repo.js';
import { guardarDocumentoTecnico, obtenerSiguienteNumeroADR, listarDocumentosPorRepositorio } from './repositories/documents.repo.js';
import { registrarTelemetriaBio, obtenerUltimaTelemetria } from './repositories/bio.repo.js';
import { consulta, verificarConexionDB } from './config/db.js';

async function testPersistencia() {
  console.log('🧪 Iniciando verificación de Persistencia y Memoria Total (SQLite)...');
  await verificarConexionDB();

  // 1. Comandante
  const comandante = await obtenerOCrearComandantePorDefecto();
  console.log('✅ Comandante obtenido/creado:', comandante.id, comandante.alias, comandante.preferred_stacks);

  const comandanteLeido = await obtenerComandantePorId(comandante.id);
  console.log('✅ Comandante leído por ID:', comandanteLeido?.alias);

  // Crear Repositorio para pruebas de documentos
  const { rows: repoRows } = await consulta(
    `INSERT INTO repositories (commander_id, name, repo_url) VALUES ($1, $2, $3) RETURNING *`,
    [comandante.id, 'A.R.E.S. Core V2.6', 'https://github.com/ares/ares-core']
  );
  const repo = repoRows[0];
  console.log('✅ Repositorio creado:', repo.id, repo.name);

  // 2. Conversación y Mensajes
  const conversacion = await crearConversacion(comandante.id, 'Sesión Táctica de Auditoría');
  console.log('✅ Conversación creada:', conversacion.id, conversacion.title);

  const msg1 = await guardarMensaje(conversacion.id, 'user', 'Comandante al habla. Reporte de estado.', [], null);
  console.log('✅ Mensaje de usuario guardado:', msg1.id, msg1.content);

  const msg2 = await guardarMensaje(
    conversacion.id,
    'model',
    'A.R.E.S. en línea. Sistemas de combate y persistencia activos.',
    [{ uri: 'https://ares.dev/docs', title: 'A.R.E.S. Ficha v2.6' }],
    1
  );
  console.log('✅ Mensaje de modelo guardado:', msg2.id, msg2.pose_number, msg2.sources);

  const ultimosMensajes = await obtenerUltimosMensajes(conversacion.id);
  console.log(`✅ Historial recuperado: ${ultimosMensajes.length} turnos.`);
  console.log('   Mensajes:', ultimosMensajes.map(m => `[${m.role}] ${m.content}`));

  // 3. Documentos y ADRs
  const numADR1 = await obtenerSiguienteNumeroADR(repo.id);
  console.log('✅ Siguiente ADR calculado:', numADR1);

  const doc = await guardarDocumentoTecnico({
    repositoryId: repo.id,
    docType: 'ADR',
    title: 'ADR-001: Persistencia SQLite Embebido con node:sqlite',
    markdownContent: '# ADR-001\nDecisión: Usar node:sqlite nativo en Node 24.',
    adrNumber: numADR1,
  });
  console.log('✅ Documento técnico persistido:', doc.id, doc.title, doc.adr_number);

  const numADR2 = await obtenerSiguienteNumeroADR(repo.id);
  console.log('✅ Siguiente correlativo ADR verificado (debe ser 2):', numADR2);

  const listaDocs = await listarDocumentosPorRepositorio(repo.id);
  console.log(`✅ Documentos listados para el repositorio: ${listaDocs.length}`);

  // 4. Bio-Armadura
  const bio = await registrarTelemetriaBio({
    commanderId: comandante.id,
    continuousCodingMinutes: 60,
    hydrationLevelPct: 85,
    staminaPct: 90,
    detectedFatigueLevel: 'OPTIMAL',
    spartanInterventionTriggered: false,
  });
  console.log('✅ Telemetría registrada:', bio.id, bio.continuous_coding_minutes, bio.stamina_pct);

  const ultimaBio = await obtenerUltimaTelemetria(comandante.id);
  console.log('✅ Última telemetría leída:', ultimaBio?.continuous_coding_minutes, 'minutos, estamina:', ultimaBio?.stamina_pct);

  console.log('🎉 ¡Todas las operaciones de Persistencia y Memoria Total pasaron exitosamente!');
}

testPersistencia().catch((err) => {
  console.error('❌ Error en prueba de persistencia:', err);
  process.exit(1);
});
