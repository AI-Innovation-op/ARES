import { AresError, requireText } from '../../shared/domain/errors.js';

export interface TeamPolicyData {
  readonly version: 1;
  readonly name: string;
  readonly checks: readonly string[];
  readonly ai?: { readonly provider: string; readonly model: string };
}
export class TeamPolicy {
  readonly data: TeamPolicyData;
  constructor(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new AresError('VALIDATION', 'ares.team.json debe ser un objeto.');
    const value = input as Record<string, unknown>;
    if (
      Object.keys(value).some((key) => !['version', 'name', 'checks', 'ai'].includes(key)) ||
      value.version !== 1 ||
      typeof value.name !== 'string' ||
      /[\x00-\x1f\x7f]/.test(value.name) ||
      !Array.isArray(value.checks) ||
      value.checks.length > 8 ||
      value.checks.some(
        (script) => typeof script !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(script),
      ) ||
      new Set(value.checks).size !== value.checks.length
    )
      throw new AresError(
        'VALIDATION',
        'Configuración de equipo inválida: versión 1, nombre y hasta 8 scripts únicos. No se admiten campos de credenciales.',
      );
    requireText(value.name, 'Nombre del proyecto', 100);
    let ai: TeamPolicyData['ai'];
    if (value.ai !== undefined) {
      const config = value.ai as Record<string, unknown>;
      if (
        !config ||
        typeof config !== 'object' ||
        Array.isArray(config) ||
        Object.keys(config).some((key) => !['provider', 'model'].includes(key)) ||
        typeof config.provider !== 'string' ||
        !/^[a-z][a-z0-9-]{0,39}$/.test(config.provider) ||
        typeof config.model !== 'string' ||
        !config.model.trim() ||
        config.model.length > 200 ||
        /[\x00-\x1f\x7f]/.test(config.model)
      )
        throw new AresError(
          'VALIDATION',
          'ai admite solamente provider y model; las claves son personales.',
        );
      ai = Object.freeze({ provider: config.provider, model: config.model });
    }
    this.data = Object.freeze({
      version: 1,
      name: value.name,
      checks: Object.freeze([...value.checks]) as readonly string[],
      ...(ai ? { ai } : {}),
    });
    Object.freeze(this);
  }
}
