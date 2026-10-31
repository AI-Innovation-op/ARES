# Avatar ARES

Geometría articulada integrada desde el ZIP `ARES-Avatar-3D-Visuales-2026-10-31.zip` aportado por Kevin. Se verificaron las 41 huellas de su manifiesto antes de integrar los archivos. La fuente original procede del proyecto ARES, bajo su licencia MIT.

`model.ts` conserva la silueta, materiales y articulaciones del diseño aportado. `scene.ts` adapta la escena al ciclo de vida de Vue y a movimiento reducido. `effects.ts` implementa partículas de código y arcos visuales. `domain/avatar-pose.ts` traduce la máquina de estados existente al modelo sin duplicar el catálogo de 16 poses.

Los PNG individuales son respaldos del diseño para equipos sin WebGL. `ares-static.glb` es una referencia estática; no contiene los clips animados ni sustituye al modelo articulado.
