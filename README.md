# Forja · Entrenador de gimnasio

App web sin dependencias ni backend. Los datos quedan en el dispositivo (localStorage), con exportar/importar en Perfil.

## Usar en local

Abre `index.html` en el navegador. Para probar el modo offline (PWA) hace falta HTTP:

```bash
make serve
```

`make` sin argumentos lista todas las tareas.

## Instalar en el móvil

Publica la carpeta en cualquier hosting estático con HTTPS (Netlify Drop, GitHub Pages, Vercel, Cloudflare Pages).
Abre la URL en el móvil y elige "Añadir a pantalla de inicio". Funciona sin conexión.

Al publicar cambios, sube `CACHE` en `sw.js` (por ejemplo `forja-v7`) para que los móviles descarguen la nueva versión.

## Tests y verificaciones

```bash
make ci
```

Corre `test.js` (lógica) y `scripts/check.js` (sintaxis, manifest, archivos del service worker, sin recursos de terceros). Es lo mismo que ejecuta GitHub Actions en cada push y PR (`.github/workflows/ci.yml`).

## Despliegue

**GitHub Pages:** el job `deploy` de la CI publica la app en cada push a `main`, pero solo si:
1. Activas Pages en el repo con origen "GitHub Actions" (en un repo privado requiere plan de pago).
2. Defines la variable de repo `DEPLOY_PAGES=true`.

**Docker (nginx sin root, puerto 8080):**

```bash
make docker-run   # construye y sirve en http://127.0.0.1:8080
```

La imagen añade cabeceras de seguridad (`deploy/security-headers.conf`) y caché correcta: `index.html`, `sw.js` y el manifest siempre se revalidan; `assets/` y `vendor/` se cachean una semana.

## Archivos

- `engine.js`: lógica de entrenamiento (rutinas, progresión de cargas, rachas, calentamiento, discos).
- `coach.js`: entrenador (nutrición, check-in de preparación, análisis del progreso, técnica y guía con fuentes).
- `index.html`: interfaz.
- `sw.js`, `manifest.webmanifest`, `icon.svg`: PWA instalable y offline.
- `assets/fonts/`, `vendor/`: fuente Manrope y Chart.js 4.4.1, alojados para funcionar sin conexión.
- `Makefile`, `scripts/check.js`, `.github/workflows/ci.yml`, `Dockerfile`, `deploy/`: tareas, verificaciones, CI/CD e imagen nginx.
