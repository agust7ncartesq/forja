# Forja · Entrenador de gimnasio

App web sin dependencias ni backend. Los datos quedan en el dispositivo (localStorage), con exportar/importar en Perfil.

## Usar en local

Abre `index.html` en el navegador. Para probar el modo offline (PWA) hace falta HTTP:

```bash
python3 -m http.server 8765
```

## Instalar en el móvil

Publica la carpeta en cualquier hosting estático con HTTPS (Netlify Drop, GitHub Pages, Vercel, Cloudflare Pages).
Abre la URL en el móvil y elige "Añadir a pantalla de inicio". Funciona sin conexión.

Al publicar cambios, sube `CACHE` en `sw.js` (por ejemplo `forja-v2`).

## Tests

```bash
node test.js
```

## Archivos

- `engine.js`: lógica de entrenamiento (rutinas, progresión de cargas, rachas, calentamiento, discos).
- `index.html`: interfaz.
- `sw.js`, `manifest.webmanifest`, `icon.svg`: PWA instalable y offline.
