/**
 * @fileoverview Desofuscador y Normalizador de Enunciados Crudos de PDF / Tareas (v3.5).
 * Limpia saltos de línea irregulares, palabras partidas por guiones de fin de página,
 * ruido académico (encabezados, números de página) y extrae especificaciones DDD formales.
 * @module services/exercise-parser.service
 */

export interface BoundedContextMeta {
  nombre: string;
  identificador: string;
  descripcion: string;
  entidades: string[];
  casosUso: string[];
}

export interface AnalisisEnunciado {
  titulo: string;
  slug: string;
  resumenNegocio: string;
  boundedContexts: BoundedContextMeta[];
  entidadesClave: string[];
  valueObjects: string[];
  reglasNegocio: string[];
  casosUso: string[];
  eventosDominio: string[];
  stackSugerido: string;
  especificacionMarkdown: string;
  estadisticasLimpieza: {
    longitudOriginal: number;
    longitudLimpia: number;
    palabrasReparadas: number;
    lineasRuidoEliminadas: number;
  };
}

export class ExerciseParserService {
  /**
   * Sanitiza texto crudo copiado directamente de un visor de PDF o enunciado de examen.
   */
  static limpiarTextoCrudo(textoCrudo: string): { textoLimpio: string; reparadas: number; eliminadas: number } {
    let reparadas = 0;
    let eliminadas = 0;

    // 1. Normalizar saltos de línea y tabulaciones
    let texto = textoCrudo.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Filtrar encabezados y pies de página típicos de PDFs académicos
    const patronesRuido = [
      /^(?:UNIVERSIDAD|FACULTAD|ESCUELA|DEPARTAMENTO|INSTITUTO)\b.*$/gim,
      /^(?:EXAMEN|PARCIAL|FINAL|PRÁCTICA|PRACTICA|TALLER|LABORATORIO|LAB)\b.*$/gim,
      /^(?:DOCENTE|PROFESOR|INGENIERO|ING\.|MG\.|DR\.|FECHA|CICLO|SECCIÓN|SECCION|GRUPO|HORA):.*$/gim,
      /^(?:INTEGRANTES|ALUMNOS|ESTUDIANTE|CÓDIGO|CODIGO):.*$/gim,
      /^(?:Página|Pagina|Pág\.|Pag\.|Page)\s*\d+\s*(?:de|\/)\s*\d+.*$/gim,
      /^\s*[-_—=]{3,}\s*$/gm, // Divisores horizontales ruidosos
    ];

    for (const patron of patronesRuido) {
      texto = texto.replace(patron, () => {
        eliminadas++;
        return '';
      });
    }

    // 3. Reensamblar palabras cortadas por guiones de fin de línea de PDF
    // Ej: "imple-\n  mentar" -> "implementar", "estudian-\n tes" -> "estudiantes"
    texto = texto.replace(/(\b[a-záéíóúñA-ZÁÉÍÓÚÑ]+)-\s*\n+\s*([a-záéíóúñA-ZÁÉÍÓÚÑ]+\b)/g, (_match, p1, p2) => {
      reparadas++;
      return `${p1}${p2}`;
    });

    // 4. Unir saltos de línea arbitrarios en medio de oraciones (soft wraps de PDF)
    // Conserva saltos de párrafo dobles (\n\n) y viñetas (1., -, *, •)
    const lineas = texto.split('\n');
    const lineasFiltradas: string[] = [];

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].trim();
      if (!linea) {
        lineasFiltradas.push('');
        continue;
      }

      // Si la línea es un ítem de lista, título o encabezado de enunciado, mantenerla en su propia línea
      const esInicioLista = /^(\d+[\.\)]|[-*•>]|###?|ENUNCIADO|PROYECTO|TEMA|TITULO|Requerimiento|Regla|Contexto|Entidad)/i.test(linea);

      if (esInicioLista || lineasFiltradas.length === 0 || lineasFiltradas[lineasFiltradas.length - 1] === '') {
        lineasFiltradas.push(linea);
      } else {
        const lineaAnterior = lineasFiltradas[lineasFiltradas.length - 1];
        // Si la línea anterior es un ENUNCIADO/TITULO o termina en signo de puntuación, no concatenar
        const anteriorEsEncabezado = /^(?:ENUNCIADO|PROYECTO|TEMA|TITULO)[:\-]/i.test(lineaAnterior);
        if (!/[\.\:\;\?\!\#]$/.test(lineaAnterior) && !anteriorEsEncabezado) {
          lineasFiltradas[lineasFiltradas.length - 1] = `${lineaAnterior} ${linea}`;
        } else {
          lineasFiltradas.push(linea);
        }
      }
    }

    const textoLimpio = lineasFiltradas
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      textoLimpio,
      reparadas,
      eliminadas,
    };
  }

  /**
   * Extrae la arquitectura DDD y entidades del texto desofuscado.
   */
  static parsearEnunciado(textoCrudo: string, stackDeseado?: string): AnalisisEnunciado {
    const { textoLimpio, reparadas, eliminadas } = this.limpiarTextoCrudo(textoCrudo);

    // 1. Extraer o inferir Título del Proyecto
    let titulo = 'Sistema de Dominio Táctico';
    const matchTitulo = textoLimpio.match(/(?:(?:ENUNCIADO|PROYECTO|TEMA|SISTEMA|CASO DE ESTUDIO)[:\-]\s*)([^\n]+)/i)
      || textoLimpio.match(/^#+\s*([^\n]+)/m)
      || textoLimpio.match(/^(?:Sistema|Plataforma|Módulo|Modulo|Servicio)\s+de\s+[^\n\.\,]+/im);

    if (matchTitulo) {
      titulo = matchTitulo[1] ? matchTitulo[1].trim() : matchTitulo[0].trim();
      titulo = titulo.replace(/^[#\*\-:\s]+/, '').replace(/[\.\:]$/, '').trim();
    } else {
      // Heurística de primera línea
      const primeraLinea = textoLimpio.split('\n')[0] || '';
      if (primeraLinea.length > 5 && primeraLinea.length < 80) {
        titulo = primeraLinea.replace(/^[#\*\-:\s]+/, '');
      }
    }

    const slug = titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sistema-ddd-ares';

    // 2. Extraer o inferir Bounded Contexts
    const boundedContextsMap = new Map<string, BoundedContextMeta>();

    // Buscar menciones explícitas de bounded contexts
    const regexContextos = /(?:bounded\s*contexts?|contextos?\s*delimitados?|módulos?|subdominios?)[:\n]+([\s\S]*?)(?=\n\s*(?:reglas|requerimientos|entidades|tecnolog|casos|invariantes|\n\n\n|$))/i;
    const matchContextos = textoLimpio.match(regexContextos);

    if (matchContextos && matchContextos[1]) {
      const lineasCtx = matchContextos[1].split('\n');
      for (const l of lineasCtx) {
        const item = l.replace(/^[-*•\d\.\)]+/, '').trim();
        if (item.length > 2) {
          const partes = item.split(/[:\-\(]/);
          const nombre = partes[0].trim();
          const desc = partes[1] ? partes.slice(1).join(' ').replace(/[\)]+$/, '').trim() : `Gestión y operaciones del contexto de ${nombre}`;
          const id = nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (id && !boundedContextsMap.has(id)) {
            boundedContextsMap.set(id, {
              nombre,
              identificador: id,
              descripcion: desc,
              entidades: [],
              casosUso: [],
            });
          }
        }
      }
    }

    // Si no se encontraron suficientes Bounded Contexts explícitos, inferir a partir del dominio
    if (boundedContextsMap.size === 0) {
      const palabrasClave = textoLimpio.toLowerCase();
      if (palabrasClave.includes('libro') || palabrasClave.includes('prestamo') || palabrasClave.includes('biblioteca')) {
        boundedContextsMap.set('prestamos', {
          nombre: 'Préstamos',
          identificador: 'prestamos',
          descripcion: 'Gestión del ciclo de vida de préstamos, vencimientos y penalizaciones',
          entidades: ['Prestamo', 'Multa'],
          casosUso: ['SolicitarPrestamo', 'RegistrarDevolucion', 'VerificarVencimiento'],
        });
        boundedContextsMap.set('catalogo', {
          nombre: 'Catálogo',
          identificador: 'catalogo',
          descripcion: 'Inventario de libros, ejemplares físicos y disponibilidad por ISBN',
          entidades: ['Libro', 'Ejemplar'],
          casosUso: ['ConsultarDisponibilidad', 'RegistrarEjemplar'],
        });
        boundedContextsMap.set('usuarios', {
          nombre: 'Usuarios',
          identificador: 'usuarios',
          descripcion: 'Gestión de estudiantes, docentes y credenciales de acceso',
          entidades: ['Usuario', 'Estudiante'],
          casosUso: ['ValidarElegibilidadUsuario', 'BloquearUsuario'],
        });
      } else if (palabrasClave.includes('pedido') || palabrasClave.includes('orden') || palabrasClave.includes('pago') || palabrasClave.includes('tienda') || palabrasClave.includes('carrito')) {
        boundedContextsMap.set('ordenes', {
          nombre: 'Órdenes',
          identificador: 'ordenes',
          descripcion: 'Gestión de pedidos, cálculo de totales y estados de entrega',
          entidades: ['Pedido', 'ItemPedido'],
          casosUso: ['CrearPedido', 'CancelarPedido', 'ConfirmarDespacho'],
        });
        boundedContextsMap.set('pagos', {
          nombre: 'Pagos',
          identificador: 'pagos',
          descripcion: 'Procesamiento de transacciones, validación bancaria y facturas',
          entidades: ['Transaccion', 'ComprobantePago'],
          casosUso: ['ProcesarPago', 'ReembolsarPago'],
        });
        boundedContextsMap.set('inventario', {
          nombre: 'Inventario',
          identificador: 'inventario',
          descripcion: 'Control de existencias de productos y alertas de stock mínimo',
          entidades: ['Producto', 'Stock'],
          casosUso: ['ReservarStock', 'LiberarStock'],
        });
      } else {
        // Dominio genérico extraído del título
        const slugCtx = slug.replace(/sistema-|gestion-|-ddd/g, '') || 'core';
        boundedContextsMap.set(slugCtx, {
          nombre: slugCtx.charAt(0).toUpperCase() + slugCtx.slice(1),
          identificador: slugCtx,
          descripcion: `Contexto central del dominio ${titulo}`,
          entidades: ['RegistroPrincipal', 'DetalleOperacion'],
          casosUso: ['EjecutarOperacion', 'ConsultarEstado'],
        });
        boundedContextsMap.set('notificaciones', {
          nombre: 'Notificaciones',
          identificador: 'notificaciones',
          descripcion: 'Publicación de eventos de dominio y alertas al usuario',
          entidades: ['Notificacion', 'PlantillaMensaje'],
          casosUso: ['EnviarAlertaDominio'],
        });
      }
    }

    // 3. Extraer Reglas de Negocio / Invariantes
    const reglasNegocio: string[] = [];
    const regexReglas = /(?:reglas\s*de\s*negocio|requerimientos?|invariantes?|validaciones?)[:\n]+([\s\S]*?)(?=\n\s*(?:bounded|contextos|tecnolog|stack|\n\n\n|$))/i;
    const matchReglas = textoLimpio.match(regexReglas);

    if (matchReglas && matchReglas[1]) {
      const items = matchReglas[1].split('\n');
      for (const it of items) {
        const limpia = it.replace(/^[-*•\d\.\)]+/, '').trim();
        if (limpia.length > 8) {
          reglasNegocio.push(limpia);
        }
      }
    }

    if (reglasNegocio.length === 0) {
      // Extraer oraciones que contengan palabras normativas: "debe", "puede", "máximo", "límite", "único", "no se permite"
      const oraciones = textoLimpio.split(/(?<=[\.\n])\s+/);
      for (const o of oraciones) {
        const low = o.toLowerCase();
        if (
          (low.includes('debe') || low.includes('puede') || low.includes('máximo') || low.includes('limite') || low.includes('requiere') || low.includes('invariante')) &&
          o.trim().length > 15
        ) {
          reglasNegocio.push(o.trim().replace(/^[-*•\d\.\)]+/, '').trim());
          if (reglasNegocio.length >= 6) break;
        }
      }
    }

    // Si aún no hay suficientes, asegurar al menos 3 invariantes canónicas
    if (reglasNegocio.length === 0) {
      reglasNegocio.push('Toda entidad de agregado debe poseer un identificador inmutable único de tipo UUID/String.');
      reglasNegocio.push('Las operaciones de mutación de estado deben validar la invariante de negocio antes de persistir.');
      reglasNegocio.push('Los cambios críticos disparan eventos de dominio asíncronos para desacoplar contextos.');
    }

    // 4. Extraer Casos de Uso
    const casosUso: string[] = [];
    for (const ctx of boundedContextsMap.values()) {
      casosUso.push(...ctx.casosUso);
    }
    if (casosUso.length === 0) {
      casosUso.push('CrearRegistro', 'ActualizarEstado', 'ConsultarPorIdentificador');
    }

    // 5. Extraer Entidades y Value Objects
    const entidadesClave: string[] = [];
    for (const ctx of boundedContextsMap.values()) {
      entidadesClave.push(...ctx.entidades);
    }
    if (entidadesClave.length === 0) {
      entidadesClave.push('AgregadoRaiz', 'EntidadHija');
    }

    const valueObjects = [
      `${titulo.replace(/[^a-zA-Z]/g, '').slice(0, 10)}Id`,
      'FechaRegistro',
      'EstadoOperacion',
      'MontoMonetario',
    ];

    const eventosDominio = [
      `${entidadesClave[0] || 'Operacion'}CreadaEvent`,
      `${entidadesClave[0] || 'Operacion'}ProcesadaEvent`,
      `${entidadesClave[0] || 'Operacion'}CanceladaEvent`,
    ];

    const stackSugerido = stackDeseado || 'typescript-hexagonal-node';

    // 6. Generar documento SPECIFICATION.md
    const especificacionMarkdown = this.construirEspecificacionMarkdown({
      titulo,
      slug,
      resumenNegocio: textoLimpio.slice(0, 400) + (textoLimpio.length > 400 ? '...' : ''),
      boundedContexts: Array.from(boundedContextsMap.values()),
      entidadesClave,
      valueObjects,
      reglasNegocio,
      casosUso,
      eventosDominio,
      stackSugerido,
    });

    return {
      titulo,
      slug,
      resumenNegocio: textoLimpio.slice(0, 500),
      boundedContexts: Array.from(boundedContextsMap.values()),
      entidadesClave,
      valueObjects,
      reglasNegocio,
      casosUso,
      eventosDominio,
      stackSugerido,
      especificacionMarkdown,
      estadisticasLimpieza: {
        longitudOriginal: textoCrudo.length,
        longitudLimpia: textoLimpio.length,
        palabrasReparadas: reparadas,
        lineasRuidoEliminadas: eliminadas,
      },
    };
  }

  /**
   * Construye el documento canónico de especificación en Markdown.
   */
  private static construirEspecificacionMarkdown(params: {
    titulo: string;
    slug: string;
    resumenNegocio: string;
    boundedContexts: BoundedContextMeta[];
    entidadesClave: string[];
    valueObjects: string[];
    reglasNegocio: string[];
    casosUso: string[];
    eventosDominio: string[];
    stackSugerido: string;
  }): string {
    const fecha = new Date().toISOString().split('T')[0];
    return `# 🛡️ ESPECIFICACIÓN DE DOMINIO TÁCTICO: ${params.titulo.toUpperCase()}
> **Generado por:** A.R.E.S. v3.5 (Sovereign Git & Exercise Forge Core)  
> **Fecha de Emisión:** ${fecha}  
> **Identificador de Solución:** \`${params.slug}\`  
> **Stack Base:** \`${params.stackSugerido}\`  

---

## 1. Visión y Resumen del Negocio
${params.resumenNegocio}

---

## 2. Mapa de Contextos Delimitados (Bounded Contexts)
El sistema ha sido descompuesto formalmente en **${params.boundedContexts.length} Contextos Delimitados** para preservar límites semánticos estrictos y desacoplar los subdominios:

${params.boundedContexts
  .map(
    (c, i) => `### 2.${i + 1}. Bounded Context: \`${c.nombre}\` (Id: \`${c.identificador}\`)
- **Propósito:** ${c.descripcion}
- **Entidades de Dominio:** ${c.entidades.length > 0 ? c.entidades.map(e => `\`${e}\``).join(', ') : '`AgregadoRaiz`'}
- **Casos de Uso de Aplicación:** ${c.casosUso.length > 0 ? c.casosUso.map(u => `\`${u}\``).join(', ') : '`EjecutarFlujo`'}
`
  )
  .join('\n')}

---

## 3. Modelo de Dominio Táctico (DDD)

### 3.1. Entidades y Agregados Raíz
${params.entidadesClave.map((e) => `- **\`${e}\`**: Responsable de salvaguardar los invariantes del agregado y publicar eventos de dominio.`).join('\n')}

### 3.2. Value Objects Inmutables
${params.valueObjects.map((vo) => `- **\`${vo}\`**: Objeto inmutable tipado que encapsula validaciones atómicas.`).join('\n')}

### 3.3. Eventos de Dominio Asíncronos
${params.eventosDominio.map((ev) => `- **\`${ev}\`**: Evento publicado ante transiciones críticas de estado en el agregado.`).join('\n')}

---

## 4. Invariantes y Reglas de Negocio Críticas
${params.reglasNegocio.map((r, i) => `${i + 1}. **[RBN-${(i + 1).toString().padStart(2, '0')}]**: ${r}`).join('\n')}

---

## 5. Casos de Uso y Servicios de Aplicación
${params.casosUso.map((u, i) => `- **CU-${(i + 1).toString().padStart(2, '0')} (\`${u}\`)**: Orquesta la carga de la raíz del agregado, valida precondiciones, invoca métodos de dominio y persiste mediante el puerto de repositorio.`).join('\n')}

---

## 6. Arquitectura Hexagonal y Separación de Capas
\`\`\`
src/
├── shared/
│   └── domain/         # BaseEntity, ValueObject, DomainEvent, AggregateRoot
└── [bounded-context]/
    ├── domain/         # Entidades, Value Objects, Puertos de Repositorio
    ├── application/    # Casos de Uso, DTOs, Handlers
    └── infrastructure/ # Adaptadores de persistencia, Controladores HTTP/CLI
\`\`\`
`;
  }
}
