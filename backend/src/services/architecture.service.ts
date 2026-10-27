/**
 * @fileoverview Servicio del Radar de Arquitectura de Sistemas C4 & Simulador de Eventos (A.R.E.S. v3.4).
 * Proporciona modelado de topologías de sistemas distribuidos, inspección de bounded contexts,
 * simulación de ráfagas de tráfico, inyección de caos (circuit breakers) y exportación C4 Mermaid.
 * @module services/architecture.service
 */

export type NodeType = 'client' | 'gateway' | 'service' | 'database' | 'queue' | 'cache' | 'external';
export type NodeStatus = 'healthy' | 'degraded' | 'offline';
export type ProtocolType = 'HTTP/REST' | 'SSE' | 'gRPC' | 'SQL' | 'AMQP' | 'WS';

export interface TopologyNode {
  id: string;
  nombre: string;
  tipo: NodeType;
  tecnologia: string;
  boundedContext?: string;
  capaDdd: 'presentation' | 'application' | 'domain' | 'infrastructure' | 'cross-cutting';
  status: NodeStatus;
  latenciaMs: number;
  rps: number;
  descripcion: string;
  adrVinculado?: string;
  x: number;
  y: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  protocolo: ProtocolType;
  descripcion: string;
  traficoRps: number;
  activo: boolean;
}

export interface SystemTopology {
  id: string;
  nombre: string;
  descripcion: string;
  patronArquitectonico: string;
  metricasGlobales: {
    totalRps: number;
    latenciaPromedioMs: number;
    tasaErrorPct: number;
    adherenciaSolid: number;
  };
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

/**
 * Catálogo de topologías maestras precargadas en A.R.E.S.
 */
export const TOPOLOGIAS_PREDEFINIDAS: SystemTopology[] = [
  {
    id: 'ares-sovereign-core',
    nombre: 'A.R.E.S. Sovereign Industrial Core (Hexagonal Monorepo)',
    descripcion: 'Topología activa del ecosistema A.R.E.S. integrando HUD 3D, Consola Reactiva, Motor SSE, SQLite WAL y Orquestador Multi-LLM.',
    patronArquitectonico: 'Hexagonal + DDD + Microkernel',
    metricasGlobales: {
      totalRps: 340,
      latenciaPromedioMs: 1.2,
      tasaErrorPct: 0.0,
      adherenciaSolid: 96,
    },
    nodes: [
      {
        id: 'node-client-spa',
        nombre: 'Tactical HUD & Consola SPA',
        tipo: 'client',
        tecnologia: 'Vue 3 + Vite + Tailwind CSS + Three.js',
        boundedContext: 'Presentation Context',
        capaDdd: 'presentation',
        status: 'healthy',
        latenciaMs: 0.4,
        rps: 120,
        descripcion: 'Interfaz táctica ciberpunk con visualización 3D Voxel y terminal embebida.',
        adrVinculado: 'ADR-001',
        x: 10,
        y: 45,
      },
      {
        id: 'node-backend-api',
        nombre: 'A.R.E.S. Core Engine',
        tipo: 'service',
        tecnologia: 'Node.js 24 + Express 5 + TS 5.8',
        boundedContext: 'Orchestration Context',
        capaDdd: 'application',
        status: 'healthy',
        latenciaMs: 1.2,
        rps: 120,
        descripcion: 'Motor central de puertos y adaptadores con streaming SSE línea por línea.',
        adrVinculado: 'ADR-001',
        x: 35,
        y: 45,
      },
      {
        id: 'node-sqlite-wal',
        nombre: 'SQLite WAL Local',
        tipo: 'database',
        tecnologia: 'node:sqlite (Cero dependencias)',
        boundedContext: 'Persistence Context',
        capaDdd: 'infrastructure',
        status: 'healthy',
        latenciaMs: 0.6,
        rps: 85,
        descripcion: 'Base de datos embebida con Write-Ahead Logging y oráculo vectorial 128D.',
        adrVinculado: 'ADR-003',
        x: 65,
        y: 20,
      },
      {
        id: 'node-llm-orchestrator',
        nombre: 'Multi-LLM Sovereign Gateway',
        tipo: 'external',
        tecnologia: 'Gemini 3 Flash + OpenRouter (DeepSeek R1/V3)',
        boundedContext: 'Cognitive Context',
        capaDdd: 'infrastructure',
        status: 'healthy',
        latenciaMs: 450,
        rps: 45,
        descripcion: 'Orquestador inteligente con balanceo de carga y failover automático.',
        adrVinculado: 'ADR-001',
        x: 65,
        y: 70,
      },
      {
        id: 'node-swarm-council',
        nombre: 'Consejo de Enjambre (4 Agentes)',
        tipo: 'service',
        tecnologia: 'Atenea, Vulcano, Mercurio, Némesis',
        boundedContext: 'Consensus Context',
        capaDdd: 'domain',
        status: 'healthy',
        latenciaMs: 620,
        rps: 30,
        descripcion: 'Legión especializada con protocolo de consenso y verificación formal.',
        adrVinculado: 'ADR-002',
        x: 90,
        y: 70,
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'node-client-spa',
        target: 'node-backend-api',
        protocolo: 'SSE',
        descripcion: 'Streaming de respuestas y telemetría bio-armadura',
        traficoRps: 120,
        activo: true,
      },
      {
        id: 'edge-2',
        source: 'node-backend-api',
        target: 'node-sqlite-wal',
        protocolo: 'SQL',
        descripcion: 'Lecturas de memoria vectorial e historial de misiones',
        traficoRps: 85,
        activo: true,
      },
      {
        id: 'edge-3',
        source: 'node-backend-api',
        target: 'node-llm-orchestrator',
        protocolo: 'HTTP/REST',
        descripcion: 'Inferencia multimodal y grounding en tiempo real',
        traficoRps: 45,
        activo: true,
      },
      {
        id: 'edge-4',
        source: 'node-llm-orchestrator',
        target: 'node-swarm-council',
        protocolo: 'gRPC',
        descripcion: 'Diálogo inter-agente y emisión de veredictos',
        traficoRps: 30,
        activo: true,
      },
    ],
  },
  {
    id: 'ecommerce-ddd-distribuido',
    nombre: 'E-Commerce Global DDD (Microservicios & Event-Driven)',
    descripcion: 'Arquitectura distribuida con bounded contexts desacoplados para Catálogo, Pedidos, Pagos y Facturación Electrónica SUNAT.',
    patronArquitectonico: 'Event-Driven Microservices + CQRS',
    metricasGlobales: {
      totalRps: 1850,
      latenciaPromedioMs: 4.8,
      tasaErrorPct: 0.02,
      adherenciaSolid: 94,
    },
    nodes: [
      {
        id: 'node-shop-web',
        nombre: 'Portal Web Comprador',
        tipo: 'client',
        tecnologia: 'Vue 3 SPA + Tailwind CSS',
        boundedContext: 'Ordering UI',
        capaDdd: 'presentation',
        status: 'healthy',
        latenciaMs: 1.0,
        rps: 600,
        descripcion: 'Catálogo de ensaladas saludables, carrito reactivo y visor de boleta.',
        x: 10,
        y: 45,
      },
      {
        id: 'node-api-gateway',
        nombre: 'Traefik API Gateway',
        tipo: 'gateway',
        tecnologia: 'Traefik v3 + Rate Limiting',
        boundedContext: 'Gateway Context',
        capaDdd: 'infrastructure',
        status: 'healthy',
        latenciaMs: 0.8,
        rps: 600,
        descripcion: 'Enrutador perimetral con balanceo de carga y terminación SSL.',
        adrVinculado: 'ADR-004',
        x: 35,
        y: 45,
      },
      {
        id: 'node-order-service',
        nombre: 'Order Service (DDD)',
        tipo: 'service',
        tecnologia: 'TypeScript + Express Clean Architecture',
        boundedContext: 'Order Context',
        capaDdd: 'application',
        status: 'healthy',
        latenciaMs: 3.2,
        rps: 350,
        descripcion: 'Agregado Pedido con invariantes de monto y estados de orden.',
        adrVinculado: 'ADR-002',
        x: 60,
        y: 30,
      },
      {
        id: 'node-billing-service',
        nombre: 'Billing Service (SUNAT)',
        tipo: 'service',
        tecnologia: 'Node.js + Facturación Electrónica B001',
        boundedContext: 'Billing Context',
        capaDdd: 'domain',
        status: 'healthy',
        latenciaMs: 8.5,
        rps: 150,
        descripcion: 'Emisión de boletas con cálculo de IGV 18% y hash digital.',
        x: 60,
        y: 65,
      },
      {
        id: 'node-event-broker',
        nombre: 'Kafka / Redis Event Bus',
        tipo: 'queue',
        tecnologia: 'Redis Streams / Apache Kafka',
        boundedContext: 'Event Spine',
        capaDdd: 'infrastructure',
        status: 'healthy',
        latenciaMs: 0.9,
        rps: 500,
        descripcion: 'Distribución asíncrona de eventos de dominio (OrderPlacedEvent).',
        x: 88,
        y: 45,
      },
    ],
    edges: [
      {
        id: 'e-1',
        source: 'node-shop-web',
        target: 'node-api-gateway',
        protocolo: 'HTTP/REST',
        descripcion: 'Peticiones HTTPS de clientes',
        traficoRps: 600,
        activo: true,
      },
      {
        id: 'e-2',
        source: 'node-api-gateway',
        target: 'node-order-service',
        protocolo: 'HTTP/REST',
        descripcion: 'Despacho de órdenes de compra',
        traficoRps: 350,
        activo: true,
      },
      {
        id: 'e-3',
        source: 'node-api-gateway',
        target: 'node-billing-service',
        protocolo: 'HTTP/REST',
        descripcion: 'Solicitud de emisión fiscal',
        traficoRps: 150,
        activo: true,
      },
      {
        id: 'e-4',
        source: 'node-order-service',
        target: 'node-event-broker',
        protocolo: 'AMQP',
        descripcion: 'Publicación de OrderPlacedEvent',
        traficoRps: 350,
        activo: true,
      },
      {
        id: 'e-5',
        source: 'node-event-broker',
        target: 'node-billing-service',
        protocolo: 'AMQP',
        descripcion: 'Suscripción asíncrona para facturar',
        traficoRps: 150,
        activo: true,
      },
    ],
  },
];

export class ArchitectureService {
  private static topologiaActiva: SystemTopology = JSON.parse(JSON.stringify(TOPOLOGIAS_PREDEFINIDAS[0]));

  /**
   * Obtiene la lista de topologías disponibles.
   */
  public static listarTopologias(): Array<{ id: string; nombre: string; descripcion: string; patronArquitectonico: string }> {
    return TOPOLOGIAS_PREDEFINIDAS.map(t => ({
      id: t.id,
      nombre: t.nombre,
      descripcion: t.descripcion,
      patronArquitectonico: t.patronArquitectonico,
    }));
  }

  /**
   * Obtiene una topología completa por ID o la actual activa.
   */
  public static obtenerTopologia(id?: string): SystemTopology {
    if (!id) return this.topologiaActiva;
    const encontrada = TOPOLOGIAS_PREDEFINIDAS.find(t => t.id === id);
    if (encontrada) {
      this.topologiaActiva = JSON.parse(JSON.stringify(encontrada));
    }
    return this.topologiaActiva;
  }

  /**
   * Simula una ráfaga de tráfico táctico sobre la topología activa.
   */
  public static simularTrafico(multiplicador: number = 2.5): SystemTopology {
    const topo = this.topologiaActiva;
    topo.metricasGlobales.totalRps = Math.round(topo.metricasGlobales.totalRps * multiplicador);
    topo.metricasGlobales.latenciaPromedioMs = parseFloat((topo.metricasGlobales.latenciaPromedioMs * 1.3).toFixed(2));

    for (const node of topo.nodes) {
      node.rps = Math.round(node.rps * multiplicador);
      node.latenciaMs = parseFloat((node.latenciaMs * 1.25).toFixed(1));
      if (node.latenciaMs > 500 && node.tipo !== 'external') {
        node.status = 'degraded';
      }
    }

    for (const edge of topo.edges) {
      edge.traficoRps = Math.round(edge.traficoRps * multiplicador);
    }

    return topo;
  }

  /**
   * Inyecta caos táctico (Chaos Engineering) para probar circuit breakers y auto-curación.
   */
  public static inyectarCaos(nodoId?: string): { nodoAfectado: string; accion: string; topologia: SystemTopology } {
    const topo = this.topologiaActiva;
    const target = nodoId ? topo.nodes.find(n => n.id === nodoId) : topo.nodes.find(n => n.tipo === 'database' || n.tipo === 'external');

    if (target) {
      target.status = 'degraded';
      target.latenciaMs = 1850;
      topo.metricasGlobales.tasaErrorPct = 3.5;

      return {
        nodoAfectado: target.nombre,
        accion: `⚠️ [CIRCUIT BREAKER ACTIVADO] Latencia de ${target.nombre} elevada a 1850ms. Modo degradado seguro en marcha (cache local y reintentos exponenciales).`,
        topologia: topo,
      };
    }

    return {
      nodoAfectado: 'Desconocido',
      accion: 'No se pudo aplicar inyección de caos.',
      topologia: topo,
    };
  }

  /**
   * Restaura la topología al estado 100% saludable.
   */
  public static restaurarTopologia(): SystemTopology {
    const original = TOPOLOGIAS_PREDEFINIDAS.find(t => t.id === this.topologiaActiva.id) || TOPOLOGIAS_PREDEFINIDAS[0];
    this.topologiaActiva = JSON.parse(JSON.stringify(original));
    return this.topologiaActiva;
  }

  /**
   * Genera el diagrama C4 de la topología en sintaxis Mermaid C4Container.
   */
  public static exportarMermaidC4(id?: string): string {
    const topo = this.obtenerTopologia(id);
    let mermaid = `C4Container\n`;
    mermaid += `    title Diagrama C4 Container — ${topo.nombre}\n\n`;

    // Personas y Contenedores
    for (const n of topo.nodes) {
      const sanitizedId = n.id.replace(/[^a-zA-Z0-9]/g, '_');
      if (n.tipo === 'client') {
        mermaid += `    Person(${sanitizedId}, "${n.nombre}", "${n.tecnologia}")\n`;
      } else if (n.tipo === 'database') {
        mermaid += `    ContainerDb(${sanitizedId}, "${n.nombre}", "${n.tecnologia}", "${n.descripcion}")\n`;
      } else if (n.tipo === 'queue') {
        mermaid += `    ContainerQueue(${sanitizedId}, "${n.nombre}", "${n.tecnologia}", "${n.descripcion}")\n`;
      } else {
        mermaid += `    Container(${sanitizedId}, "${n.nombre}", "${n.tecnologia}", "${n.descripcion}")\n`;
      }
    }

    mermaid += `\n`;

    // Relaciones
    for (const e of topo.edges) {
      const sId = e.source.replace(/[^a-zA-Z0-9]/g, '_');
      const tId = e.target.replace(/[^a-zA-Z0-9]/g, '_');
      mermaid += `    Rel(${sId}, ${tId}, "${e.descripcion}", "${e.protocolo}")\n`;
    }

    return mermaid;
  }
}
