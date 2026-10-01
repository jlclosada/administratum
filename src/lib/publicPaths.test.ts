import { describe, expect, it } from 'vitest';
import { isPublicPath } from './publicPaths';

describe('isPublicPath', () => {
  it('opens content, catalog, community and public profiles', () => {
    for (const p of [
      '/catalogo-puntos',
      '/catalogo-puntos/thousand-sons',
      '/catalogo-puntos/thousand-sons/rubric-marines',
      '/guias',
      '/guias/0b6f',
      '/articulos/9a1c',
      '/descargas',
      '/competitivo',
      '/competitivo/torneos/42',
      '/competitivo/listas/7',
      '/comunidad',
      '/comunidad/listas/3',
      '/perfil/4181c82b',
    ]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  it('keeps private pages and editors behind sign-in', () => {
    for (const p of [
      '/',
      '/dashboard',
      '/games',
      '/coleccion',
      '/coleccion/abc',
      '/lists',
      '/lists/1',
      '/paints',
      '/gallery',
      '/settings',
      '/perfil',
      '/amigos',
      '/mensajes',
      '/mensajes/u1',
      '/admin',
      '/guias/nueva',
      '/guias/1/editar',
      '/articulos/nuevo',
      '/articulos/1/editar',
      '/comunidad/otra',
    ]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});
