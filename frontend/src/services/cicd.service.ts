import { apiFetch } from './http.js';
/**
 * @fileoverview Cliente API Frontend para el Motor de CI/CD & Despliegues Autónomos (v3.2).
 * @module services/cicd.service
 */

export type TargetCloud = 'render' | 'github-pages' | 'docker-vps' | 'railway' | 'aws-ecs';
export type DeployStrategy = 'blue-green' | 'rolling-update' | 'direct-hook' | 'canary';
export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface PipelineStep {
  id: string;
  nombre: string;
  etapa: 'lint' | 'test' | 'security' | 'docker' | 'deploy' | 'healthcheck';
  icono: string;
  status: JobStatus;
  duracionMs: number;
  logs: string[];
  error?: string;
}

export interface PipelineExecution {
  id: string;
  targetCloud: TargetCloud;
  estrategia: DeployStrategy;
  rama: string;
  commitSha: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  progresoPct: number;
  steps: PipelineStep[];
  inicioTimestamp: number;
  finTimestamp?: number;
  rollbackDisponible: boolean;
  versionDesplegada: string;
}

export interface CicdTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  targetCloud: TargetCloud;
  estrategia: DeployStrategy;
  stackSugerido: string;
  archivos: {
    workflowYaml: string;
    dockerfile: string;
    dockerComposeProd?: string;
    dockerignore: string;
  };
}

export interface AuditIssue {
  gravedad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  regla: string;
  descripcion: string;
  sugerencia: string;
  linea?: number;
}

export interface AuditResult {
  puntuacionSeguridad: number;
  esAptoProduccion: boolean;
  totalVulnerabilidades: number;
  issues: AuditIssue[];
}

export class CicdFrontendService {
  /**
   * Obtiene el catálogo de plantillas CI/CD.
   */
  public static async listarTemplates(): Promise<CicdTemplate[]> {
    const res = await apiFetch(`/api/cicd/templates`);
    if (!res.ok) throw new Error('Error al obtener plantillas de CI/CD');
    const data = await res.json();
    return data.templates;
  }

  /**
   * Obtiene una plantilla específica.
   */
  public static async obtenerTemplate(id: string): Promise<CicdTemplate> {
    const res = await apiFetch(`/api/cicd/templates/${id}`);
    if (!res.ok) throw new Error(`Error al obtener plantilla ${id}`);
    return await res.json();
  }

  /**
   * Audita una especificación YAML.
   */
  public static async auditarWorkflow(yaml: string): Promise<AuditResult> {
    const res = await apiFetch(`/api/cicd/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml }),
    });
    if (!res.ok) throw new Error('Error al auditar el workflow YAML');
    return await res.json();
  }

  /**
   * Obtiene el estado actual del pipeline.
   */
  public static async obtenerEstado(): Promise<PipelineExecution> {
    const res = await apiFetch(`/api/cicd/status`);
    if (!res.ok) throw new Error('Error al consultar estado del pipeline');
    return await res.json();
  }

  /**
   * Ejecuta la simulación con streaming SSE en tiempo real.
   */
  public static simularPipelineStream(
    onProgreso: (estado: PipelineExecution) => void,
    onCompletado: () => void,
    onError: (err: any) => void
  ): () => void {
    const controlador = new AbortController();

    (async () => {
      try {
        const res = await apiFetch('/api/cicd/simulate/stream', { signal: controlador.signal });
        if (!res.ok || !res.body) throw new Error(`Falla HTTP al conectar el stream (${res.status})`);

        const lector = res.body.getReader();
        const decodificador = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await lector.read();
          if (done) break;
          buffer += decodificador.decode(value, { stream: true });
          const lineas = buffer.split('\n');
          buffer = lineas.pop() ?? '';

          for (const linea of lineas) {
            const texto = linea.trim();
            if (!texto.startsWith('data:')) continue;
            const dato = texto.replace(/^data:\s*/, '');
            if (dato === '[DONE]') {
              onCompletado();
              return;
            }
            try {
              const parsed = JSON.parse(dato);
              if (parsed.error) {
                onError(new Error(parsed.error));
                return;
              }
              onProgreso(parsed);
            } catch (e) {
              console.error('Error parseando SSE de pipeline:', e);
            }
          }
        }
        onCompletado();
      } catch (err: any) {
        if (err?.name !== 'AbortError') onError(err);
      }
    })();

    // Devuelve función abortadora
    return () => controlador.abort();
  }
}
