import { Project, type ProjectData, type ProjectPreferences } from '../domain/project.js';
import { AresError } from '../../shared/domain/errors.js';
import type { Identity } from '../../shared/application/ports.js';

export interface ProjectRepository {
  byAlias(alias: string): Project | undefined;
  byRoot(root: string): Project | undefined;
  list(): readonly ProjectData[];
  register(project: Project): number;
  save(project: Project, expectedRevision: number): void;
}

export class ManageProjects {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly identity: Identity,
  ) {}
  get(alias: string): Project {
    const project = this.projects.byAlias(alias);
    if (!project) throw new AresError('NOT_FOUND', 'Proyecto no registrado. Usa projects list.');
    return project;
  }
  register(
    alias: string,
    root: string,
    locationId?: string,
  ): { project: ProjectData; linkedSessions: number } {
    const at = this.identity.now();
    const project = new Project({
      id: this.identity.next(),
      alias,
      root,
      ...(locationId ? { locationId } : {}),
      revision: 0,
      createdAt: at,
      updatedAt: at,
    });
    return { project: project.data, linkedSessions: this.projects.register(project) };
  }
  relocate(alias: string, root: string, locationId?: string): ProjectData {
    const before = this.get(alias);
    if (before.data.root === root) return before.data;
    const after = before.relocate(root, this.identity.now(), locationId);
    this.projects.save(after, before.data.revision);
    return after.data;
  }
  configure(alias: string, preferences?: ProjectPreferences): ProjectData {
    const before = this.get(alias);
    const after = before.configure(preferences, this.identity.now());
    this.projects.save(after, before.data.revision);
    return after.data;
  }
}
