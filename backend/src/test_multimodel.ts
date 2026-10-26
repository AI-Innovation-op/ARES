import { invocarLLM, invocarLLMStream, CATALOGO_MODELOS } from './services/llm.service.js';

async function testMultiModel() {
  console.log('🧪 Probando motor Multi-Modelo A.R.E.S. (Gemini + OpenRouter)...');
  console.log('Catálogo de modelos soportados:', CATALOGO_MODELOS.map(m => `${m.icono} ${m.nombre}`));

  // 1. Probar OpenRouter directo con DeepSeek
  console.log('\n--- 1. Consulta con OpenRouter (DeepSeek V3) ---');
  const resOR = await invocarLLM({
    contents: [{ role: 'user', parts: [{ text: 'Hola A.R.E.S., confirma tu estado multi-modelo en 2 oraciones.' }] }],
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat',
  });
  console.log(`[${resOR.proveedorUsado} | ${resOR.modeloUsado}] Respuesta:`);
  console.log(resOR.texto);

  // 2. Probar OpenRouter en modo Streaming
  console.log('\n--- 2. Streaming SSE con OpenRouter (DeepSeek V3) ---');
  const stream = invocarLLMStream({
    contents: [{ role: 'user', parts: [{ text: 'Dame una orden táctica breve en 1 línea.' }] }],
    provider: 'openrouter',
    model: 'deepseek/deepseek-chat',
  });
  let chunks = '';
  for await (const chunk of stream) {
    process.stdout.write(chunk);
    chunks += chunk;
  }
  console.log('\n[Stream completado con éxito]');

  // 3. Probar Gemini
  console.log('\n--- 3. Consulta con Gemini (Google) ---');
  const resGemini = await invocarLLM({
    contents: [{ role: 'user', parts: [{ text: 'ARES, confirma enlace neuronal.' }] }],
    provider: 'gemini',
    enableSearch: false,
  });
  console.log(`[${resGemini.proveedorUsado} | ${resGemini.modeloUsado}] Respuesta:`);
  console.log(resGemini.texto.slice(0, 120) + '...');

  console.log('\n🎉 ¡AMBOS PROVEEDORES (GEMINI Y OPENROUTER) VERIFICADOS Y FUNCIONANDO AL 100%!');
}

testMultiModel().catch(console.error);
