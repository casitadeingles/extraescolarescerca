// Lista las zonas con menos centros y las actividades que les faltan (para la tarea diaria)
const fs = require('fs');
const path = require('path');
const d = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
const centros = [...d('centros.json'), ...(fs.existsSync(path.join(__dirname, '..', 'data', 'centros_extra.json')) ? d('centros_extra.json') : [])];
const cats = d('site.json').categorias;
const zonas = {};
for (const c of centros) {
  zonas[c.zona] ??= { total: 0, casita: false, cats: {} };
  zonas[c.zona].total++;
  zonas[c.zona].cats[c.categoria] = (zonas[c.zona].cats[c.categoria] || 0) + 1;
  if (c.destacado) zonas[c.zona].casita = true;
}
const filas = Object.entries(zonas).sort((a, b) => (b[1].casita - a[1].casita) || (a[1].total - b[1].total));
console.log('Zona'.padEnd(22), 'Centros', 'Casita', 'Faltan');
for (const [z, v] of filas) {
  console.log(z.padEnd(22), String(v.total).padStart(7), v.casita ? '   sí ' : '   no ', cats.filter((c) => !v.cats[c.slug]).map((c) => c.corto).join(', '));
}
const p = d('pendientes.json');
console.log(`\nPendientes en data/pendientes.json: ${p.filter((x) => x.estado === 'pendiente').length} de ${p.length}`);
