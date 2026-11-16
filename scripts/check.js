// Verificaciones estáticas sin dependencias: sintaxis JS (también los scripts en línea),
// manifest y que todo lo que el service worker cachea y el HTML enlaza exista.
// Ejecutar: node scripts/check.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0;
const check = (cond, msg) => { if (!cond) { console.error('FALLO: ' + msg); fails++; } };
const parses = (code, name) => { try { new vm.Script(code, { filename: name }); return true; } catch (e) { check(false, `${name}: ${e.message}`); return false; } };

for (const f of ['engine.js', 'coach.js', 'sw.js', 'test.js', 'scripts/check.js']) parses(read(f), f);

const html = read('index.html');
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => parses(m[1], `index.html (script en línea ${i + 1})`));

let manifest;
try { manifest = JSON.parse(read('manifest.webmanifest')); } catch { check(false, 'manifest.webmanifest no es JSON válido'); }
if (manifest) for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) check(manifest[k], `manifest.webmanifest sin "${k}"`);

// Si falta un archivo de esta lista, la instalación del service worker falla y no hay modo offline.
const list = (read('sw.js').match(/const FILES = \[([^\]]*)\]/) || [])[1];
check(list, 'sw.js no define la lista FILES');
if (list) for (const f of list.match(/'[^']+'/g).map((x) => x.slice(1, -1))) if (f !== './') check(fs.existsSync(path.join(root, f)), `sw.js cachea ${f}, que no existe`);

for (const [, ref] of html.matchAll(/(?:src|href)="(?!https?:|#|data:|\$\{)([^"]+)"/g)) check(fs.existsSync(path.join(root, ref)), `index.html enlaza ${ref}, que no existe`);
check(!/https?:\/\/(?!www\.w3\.org)/.test(html), 'index.html carga recursos de terceros (la app debe funcionar sin conexión)');

if (fails) { console.error(`${fails} problema(s) encontrado(s)`); process.exit(1); }
console.log('OK: verificaciones estáticas');
