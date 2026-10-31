import { AresError } from '../../shared/domain/errors.js';

export interface ProjectPreferences {
  readonly provider: string;
  readonly model: string;
}
export interface ProjectData {
  readonly id: string;
  readonly alias: string;
  readonly root: string;
  readonly locationId?: string;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly preferences?: ProjectPreferences;
}

/** A project keeps its identity when its location or preferences change. */
export class Project {
  readonly data: ProjectData;
  constructor(data: ProjectData) {
    if (
      typeof data.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(data.id) ||
      typeof data.alias !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,39}$/.test(data.alias) ||
      typeof data.root !== 'string' ||
      !data.root ||
      data.root.length > 4096 ||
      /[\x00-\x1f\x7f]/.test(data.root) ||
      !Number.isInteger(data.revision) ||
      data.revision < 0
    )
      throw new AresError(
        'VALIDATION',
        'Proyecto inválido; usa un alias en minúsculas de hasta 40 caracteres.',
      );
    if (
      data.preferences &&
      (typeof data.preferences.provider !== 'string' ||
        !/^[a-z][a-z0-9-]{0,39}$/.test(data.preferences.provider) ||
        typeof data.preferences.model !== 'string' ||
        !data.preferences.model.trim() ||
        data.preferences.model.length > 200 ||
        /[\x00-\x1f\x7f]/.test(data.preferences.model))
    )
      throw new AresError('VALIDATION', 'El perfil requiere proveedor y modelo válidos.');
    if (
      data.locationId !== undefined &&
      (typeof data.locationId !== 'string' || !/^[0-9]+:[0-9]+$/.test(data.locationId))
    )
      throw new AresError('VALIDATION', 'Identidad de carpeta inválida.');
    this.data = Object.freeze({
      ...data,
      ...(data.preferences ? { preferences: Object.freeze({ ...data.preferences }) } : {}),
    });
    Object.freeze(this);
  }
  relocate(root: string, at: string, locationId?: string): Project {
    const { locationId: _previous, ...data } = this.data;
    return new Project({
      ...data,
      root,
      ...(locationId ? { locationId } : {}),
      revision: this.data.revision + 1,
      updatedAt: at,
    });
  }
  configure(preferences: ProjectPreferences | undefined, at: string): Project {
    const { preferences: _previous, ...data } = this.data;
    return new Project({
      ...data,
      ...(preferences ? { preferences } : {}),
      revision: data.revision + 1,
      updatedAt: at,
    });
  }
}
