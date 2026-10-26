// Generador estático sin dependencias: lee /data y escribe la web en /dist
const fs = require('fs');
const path = require('path');

const root = __dirname;
const out = path.join(root, 'dist');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));

const site = read('site.json');
const barrios = read('barrios.json');
const centros = read('centros.json');
const campamentos = read('campamentos.json');

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const urls = [];

function write(rel, html) {
  const file = path.join(out, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  urls.push('/' + (rel ? rel + '/' : ''));
}

function layout({ title, description, rel, body, schema }) {
  const canonical = `${site.domain}/${rel ? rel + '/' : ''}`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Nunito+Sans:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/style.css">
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
</head>
<body>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="/">Extraescolares<span>Cerca</span></a>
    <nav>
      <a href="/academias-ingles/">Academias de inglés</a>
      <a href="/campamentos-urbanos/">Campamentos urbanos</a>
      <a href="/campamentos-residenciales/">Campamentos residenciales</a>
    </nav>
  </div>
</header>
<main>${body}</main>
<footer class="foot">
  <div class="wrap">
    <p><strong>${esc(site.name)}</strong> · ${esc(site.tagline)}.</p>
    <p class="muted">¿Tienes una academia o campamento y quieres aparecer? Escríbenos.</p>
  </div>
</footer>
</body>
</html>`;
}

const crumbs = (items) => `<nav class="crumbs wrap">${items.map(([t, h]) => h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join(' › ')}</nav>`;

function card(c, extra = '') {
  return `<article class="card${c.destacado ? ' card-star' : ''}">
  ${c.destacado ? '<span class="badge">Destacado</span>' : ''}
  <h3>${esc(c.nombre)}</h3>
  <p>${esc(c.resumen)}</p>
  ${extra}
  <a class="btn" href="${esc(c.web)}" target="_blank" rel="noopener">Ver web</a>
</article>`;
}

// ---------- Portada
const zonas = [...new Set(barrios.map((b) => b.zona))];
const listaBarrios = zonas.map((z) => `<div class="zona"><h3>${esc(z)}</h3><ul>${barrios.filter((b) => b.zona === z).map((b) => `<li><a href="/academias-ingles/${b.slug}/">${esc(b.nombre)}</a></li>`).join('')}</ul></div>`).join('');

write('', layout({
  title: `${site.name} · Academias y extraescolares en Madrid por barrios`,
  description: 'Encuentra academias de inglés, extraescolares y campamentos de verano cerca de casa en Madrid y alrededores, organizados por barrio.',
  rel: '',
  body: `
<section class="hero">
  <div class="wrap">
    <p class="kicker">Madrid y alrededores</p>
    <h1>Extraescolares <em>cerca de casa</em>, barrio a barrio</h1>
    <p class="lead">Academias de inglés, campamentos urbanos y campamentos residenciales para niños, organizados por zona para que encuentres lo que te pilla de camino.</p>
    <div class="hero-cta">
      <a class="btn" href="/academias-ingles/">Ver academias de inglés</a>
      <a class="btn btn-ghost" href="/campamentos-residenciales/">Campamentos de verano</a>
    </div>
  </div>
</section>
<section class="wrap block">
  <h2>¿Qué estás buscando?</h2>
  <div class="tiles">
    <a class="tile" href="/academias-ingles/"><strong>Academias de inglés</strong><span>Por barrio</span></a>
    <a class="tile" href="/campamentos-urbanos/"><strong>Campamentos urbanos</strong><span>En la ciudad, de día</span></a>
    <a class="tile" href="/campamentos-residenciales/"><strong>Campamentos residenciales</strong><span>Con noches fuera de casa</span></a>
    ${site.categorias.filter((c) => !c.activa).map((c) => `<div class="tile tile-off"><strong>${esc(c.nombre)}</strong><span>Próximamente</span></div>`).join('')}
  </div>
</section>
<section class="wrap block">
  <h2>Academias de inglés por barrio</h2>
  <div class="zonas">${listaBarrios}</div>
</section>`,
  schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.domain }
}));

// ---------- Índice de academias de inglés
write('academias-ingles', layout({
  title: 'Academias de inglés para niños en Madrid por barrio | Extraescolares Cerca',
  description: 'Academias de inglés para niños en los barrios de Madrid y en Alcobendas, Pozuelo, Majadahonda, Boadilla y Getafe.',
  rel: 'academias-ingles',
  body: `${crumbs([['Inicio', '/'], ['Academias de inglés']])}
<section class="wrap block">
  <h1>Academias de inglés para niños, por barrio</h1>
  <p class="lead">Elige tu zona y te mostramos las academias de inglés que tienes cerca.</p>
  <div class="zonas">${listaBarrios}</div>
</section>`
}));

// ---------- Página de cada barrio
for (const b of barrios) {
  const aqui = centros.filter((c) => c.categoria === 'academias-ingles' && c.sedes && b.slug in c.sedes)
    .sort((x, y) => (y.destacado ? 1 : 0) - (x.destacado ? 1 : 0));
  const otros = barrios.filter((o) => o.zona === b.zona && o.slug !== b.slug);
  const schema = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `Academias de inglés en ${b.nombre}`,
    itemListElement: aqui.map((c, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'EducationalOrganization', name: c.nombre, url: c.web, ...(c.sedes[b.slug] ? { address: c.sedes[b.slug] } : {}) } }))
  };
  write(`academias-ingles/${b.slug}`, layout({
    title: `Academias de inglés para niños en ${b.nombre} | Extraescolares Cerca`,
    description: `Academias de inglés para niños en ${b.nombre}: horarios, método y cómo contactar. Extraescolares de inglés cerca de casa.`,
    rel: `academias-ingles/${b.slug}`,
    schema,
    body: `${crumbs([['Inicio', '/'], ['Academias de inglés', '/academias-ingles/'], [b.nombre]])}
<section class="wrap block">
  <h1>Academias de inglés en ${esc(b.nombre)}</h1>
  <p class="lead">Extraescolares de inglés para niños en ${esc(b.nombre)} y alrededores.</p>
  <div class="cards">
    ${aqui.map((c) => card(c, c.sedes[b.slug] ? `<p class="addr">📍 ${esc(c.sedes[b.slug])}</p>` : `<p class="addr">📍 Sede en ${esc(b.nombre)}</p>`)).join('')}
  </div>
  <p class="muted note">Estamos ampliando el directorio. ¿Conoces otra academia en ${esc(b.nombre)}? Escríbenos y la añadimos.</p>
  ${otros.length ? `<h2>Otras zonas cercanas</h2><ul class="chips">${otros.map((o) => `<li><a href="/academias-ingles/${o.slug}/">${esc(o.nombre)}</a></li>`).join('')}</ul>` : ''}
</section>`
  }));
}

// ---------- Campamentos
function campPage(rel, tipo, h1, lead, description) {
  write(rel, layout({
    title: `${h1} | Extraescolares Cerca`,
    description,
    rel,
    body: `${crumbs([['Inicio', '/'], [h1]])}
<section class="wrap block">
  <h1>${esc(h1)}</h1>
  <p class="lead">${esc(lead)}</p>
  <div class="cards">${campamentos[tipo].map((c) => card(c, `<p class="addr">📍 ${esc(c.donde)}</p><p class="addr">📅 ${esc(c.fechas)}</p>`)).join('')}</div>
  <p class="muted note">¿Organizas un campamento? Escríbenos para aparecer en el directorio.</p>
</section>`
  }));
}
campPage('campamentos-urbanos', 'urbanos', 'Campamentos urbanos de verano en Madrid',
  'Campamentos de día en la ciudad: los niños duermen en casa y pasan la jornada aprendiendo y jugando.',
  'Campamentos urbanos de verano para niños en Madrid y alrededores, incluidos campamentos en inglés.');
campPage('campamentos-residenciales', 'residenciales', 'Campamentos residenciales de verano',
  'Campamentos con alojamiento, en la naturaleza, para que los niños ganen autonomía y practiquen inglés de verdad.',
  'Campamentos residenciales de verano para niños desde Madrid, con inmersión en inglés y actividades en la naturaleza.');

// ---------- Estáticos, sitemap y robots
fs.copyFileSync(path.join(root, 'public', 'style.css'), path.join(out, 'style.css'));
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.domain}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);

console.log(`Generadas ${urls.length} páginas en /dist`);
