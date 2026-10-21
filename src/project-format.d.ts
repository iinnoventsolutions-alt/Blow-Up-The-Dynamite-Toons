import type { Project } from './model';
export const SCHEMA_VERSION: number;
export const MAX_PROJECT_BYTES: number;
export function validateProject(value: unknown): Project;
export function parseProject(text: string): Project;
export function serializeProject(value: Project): string;
export function serializeArtworkProject(value: Project): string;
