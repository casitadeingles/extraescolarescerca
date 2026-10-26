// Generador estático sin dependencias: lee /data y escribe la web en /dist
const fs = require('fs');
const path = require('path');

const root = __dirname;
const out = path.join(root, 'dist');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));

const site = read('site.json');
const centros = read('centros.json');
const campamentos = read('campamentos.json');
const cats = site.categorias;
const catBy = Object.fromEntries(cats.map((c) => [c.slug, c]));

fs.rmSync(out, { recursive: true, force: true });
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const urls = [];

// Zonas (distritos y municipios) con sus centros
const zonas = {};
for (const c of centros) {
  zonas[c.zona_slug] ??= { slug: c.zona_slug, nombre: c.zona, tipo: c.tipo_zona, centros: [] };
  zonas[c.zona_slug].centros.push(c);
}
const zonasOrden = Object.values(zonas).sort((a, b) => b.centros.length - a.centros.length);
const enZona = (z) => (z.tipo === 'municipio' ? `en ${z.nombre}` : `en ${z.nombre} (Madrid)`);
const deCat = (cat) => centros.filter((c) => c.categoria === cat);

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
      <a href="/academias-ingles/">Inglés</a>
      <a href="/zonas/">Por zona</a>
      <a href="/campamentos-urbanos/">Campamentos urbanos</a>
      <a href="/campamentos-residenciales/">Campamentos residenciales</a>
    </nav>
  </div>
</header>
<main>${body}</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div><strong>${esc(site.name)}</strong><p class="muted">${esc(site.tagline)}.</p></div>
    <div><strong>Actividades</strong><ul>${cats.map((c) => `<li><a href="/${c.url}/">${esc(c.nombre)}</a></li>`).join('')}</ul></div>
    <div><strong>Zonas con más oferta</strong><ul>${zonasOrden.slice(0, 9).map((z) => `<li><a href="/zonas/${z.slug}/">${esc(z.nombre)}</a></li>`).join('')}</ul></div>
  </div>
  <div class="wrap"><p class="muted small">Datos de contacto, horarios y valoraciones obtenidos de las fichas públicas de cada centro en Google. ¿Tienes una academia o campamento y quieres aparecer o corregir tus datos? Escríbenos.</p></div>
</footer>
</body>
</html>`;
}

const crumbs = (items) => `<nav class="crumbs wrap">${items.map(([t, h]) => (h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(' › ')}</nav>`;
const stars = (c) => (c.rating ? `<span class="rating">★ ${c.rating.toFixed(1).replace('.', ',')} <span class="muted">(${c.opiniones} opiniones)</span></span>` : '');

function card(c, { mostrarCat = false } = {}) {
  const cat = catBy[c.categoria];
  return `<article class="card${c.destacado ? ' card-star' : ''}">
  ${c.destacado ? '<span class="badge">Destacado</span>' : ''}
  ${mostrarCat ? `<span class="tag">${cat.icono} ${esc(cat.corto)}</span>` : ''}
  <h3>${esc(c.nombre)}</h3>
  ${stars(c)}
  <p class="addr">📍 ${esc(c.direccion)}</p>
  ${c.telefono ? `<p class="addr">📞 <a href="tel:${esc(c.telefono.replace(/\s/g, ''))}">${esc(c.telefono)}</a></p>` : ''}
  ${c.horario?.length ? `<details><summary>Horario</summary><ul class="hours">${c.horario.map(([d, h]) => `<li><span>${esc(d)}</span>${esc(h)}</li>`).join('')}</ul></details>` : ''}
  <div class="actions">
    ${c.web ? `<a class="btn btn-sm" href="${esc(c.web)}" target="_blank" rel="noopener${c.destacado ? '' : ' nofollow'}">Web</a>` : ''}
    ${c.maps ? `<a class="btn btn-sm btn-ghost" href="${esc(c.maps)}" target="_blank" rel="noopener nofollow">Cómo llegar</a>` : ''}
  </div>
</article>`;
}

const itemList = (name, list) => ({
  '@context': 'https://schema.org', '@type': 'ItemList', name,
  itemListElement: list.slice(0, 30).map((c, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: { '@type': 'LocalBusiness', name: c.nombre, address: c.direccion, ...(c.telefono ? { telephone: c.telefono } : {}), ...(c.web ? { url: c.web } : {}) }
  }))
});

const chipsZonas = (lista, base) => `<ul class="chips">${lista.map((z) => `<li><a href="${base(z)}">${esc(z.nombre)} <span>${z.n}</span></a></li>`).join('')}</ul>`;

// ---------- Portada
write('', layout({
  title: `${site.name} · Academias y extraescolares en Madrid por zonas`,
  description: `Directorio con ${centros.length} academias de inglés, idiomas, baile, música, arte, robótica y campamentos de verano en Madrid y alrededores, organizados por zona.`,
  rel: '',
  schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.domain },
  body: `
<section class="hero">
  <div class="wrap">
    <p class="kicker">Madrid y alrededores</p>
    <h1>Extraescolares <em>cerca de casa</em>, zona a zona</h1>
    <p class="lead">${centros.length} academias y centros de inglés, idiomas, baile, música, arte, robótica y deporte, más campamentos de verano. Elige actividad y zona y encuentra lo que te pilla de camino.</p>
    <div class="hero-cta">
      <a class="btn" href="/academias-ingles/">Academias de inglés</a>
      <a class="btn btn-ghost" href="/zonas/">Buscar por zona</a>
    </div>
  </div>
</section>
<section class="wrap block">
  <h2>¿Qué actividad buscas?</h2>
  <div class="tiles">
    ${cats.map((c) => `<a class="tile" href="/${c.url}/"><span class="ico">${c.icono}</span><strong>${esc(c.nombre)}</strong><span>${deCat(c.slug).length} centros</span></a>`).join('')}
    <a class="tile" href="/campamentos-urbanos/"><span class="ico">☀️</span><strong>Campamentos urbanos</strong><span>De día, en la ciudad</span></a>
    <a class="tile" href="/campamentos-residenciales/"><span class="ico">🏕️</span><strong>Campamentos residenciales</strong><span>Con noches fuera de casa</span></a>
  </div>
</section>
<section class="wrap block">
  <h2>Extraescolares por zona</h2>
  ${chipsZonas(zonasOrden.map((z) => ({ ...z, n: z.centros.length })), (z) => `/zonas/${z.slug}/`)}
</section>`
}));

// ---------- Índice de zonas
write('zonas', layout({
  title: 'Extraescolares por zona en Madrid y alrededores | Extraescolares Cerca',
  description: 'Academias y actividades extraescolares por distrito de Madrid y por municipio: Alcobendas, Pozuelo, Majadahonda, Boadilla, Getafe, Leganés y más.',
  rel: 'zonas',
  body: `${crumbs([['Inicio', '/'], ['Zonas']])}
<section class="wrap block">
  <h1>Extraescolares por zona</h1>
  <h2>Distritos de Madrid</h2>
  ${chipsZonas(zonasOrden.filter((z) => z.tipo === 'distrito').map((z) => ({ ...z, n: z.centros.length })), (z) => `/zonas/${z.slug}/`)}
  <h2>Municipios</h2>
  ${chipsZonas(zonasOrden.filter((z) => z.tipo === 'municipio').map((z) => ({ ...z, n: z.centros.length })), (z) => `/zonas/${z.slug}/`)}
</section>`
}));

// ---------- Página de cada zona (todas las actividades)
for (const z of zonasOrden) {
  const porCat = cats.map((c) => [c, z.centros.filter((x) => x.categoria === c.slug)]).filter(([, l]) => l.length);
  write(`zonas/${z.slug}`, layout({
    title: `Extraescolares ${enZona(z)}: academias y actividades para niños | Extraescolares Cerca`,
    description: `${z.centros.length} academias y actividades extraescolares ${enZona(z)}: ${porCat.map(([c]) => c.corto.toLowerCase()).join(', ')}.`,
    rel: `zonas/${z.slug}`,
    schema: itemList(`Extraescolares ${enZona(z)}`, z.centros),
    body: `${crumbs([['Inicio', '/'], ['Zonas', '/zonas/'], [z.nombre]])}
<section class="wrap block">
  <h1>Extraescolares ${esc(enZona(z))}</h1>
  <p class="lead">${z.centros.length} centros para niños y jóvenes ${esc(enZona(z))}, ordenados por actividad.</p>
  <ul class="chips">${porCat.map(([c, l]) => `<li><a href="#${c.slug}">${c.icono} ${esc(c.corto)} <span>${l.length}</span></a></li>`).join('')}</ul>
  ${porCat.map(([c, l]) => `<h2 id="${c.slug}">${c.icono} ${esc(c.nombre)}</h2><div class="cards">${l.map((x) => card(x)).join('')}</div>`).join('')}
</section>`
  }));
}

// ---------- Páginas por categoría y por categoría + zona
for (const c of cats) {
  const lista = deCat(c.slug);
  if (!lista.length) continue;
  const zs = zonasOrden.map((z) => ({ ...z, n: z.centros.filter((x) => x.categoria === c.slug).length })).filter((z) => z.n);
  write(c.url, layout({
    title: `${c.nombre} para niños en Madrid por zona | Extraescolares Cerca`,
    description: `${lista.length} ${c.plural} en Madrid y alrededores. Elige tu zona y compara dirección, horario y valoraciones.`,
    rel: c.url,
    schema: itemList(`${c.nombre} en Madrid`, lista),
    body: `${crumbs([['Inicio', '/'], [c.nombre]])}
<section class="wrap block">
  <h1>${c.icono} ${esc(c.nombre)} en Madrid y alrededores</h1>
  <p class="lead">${lista.length} ${esc(c.plural)}. Elige tu zona:</p>
  ${chipsZonas(zs, (z) => `/${c.url}/${z.slug}/`)}
  <h2>Mejor valorados</h2>
  <div class="cards">${lista.slice(0, 12).map((x) => card(x)).join('')}</div>
</section>`
  }));
  for (const z of zs) {
    const l = z.centros.filter((x) => x.categoria === c.slug);
    const cerca = zs.filter((o) => o.slug !== z.slug && o.tipo === z.tipo).slice(0, 10);
    write(`${c.url}/${z.slug}`, layout({
      title: `${c.nombre} ${enZona(z)} | Extraescolares Cerca`,
      description: `${l.length} ${c.plural} ${enZona(z)}: dirección, teléfono, horario y valoraciones.`,
      rel: `${c.url}/${z.slug}`,
      schema: itemList(`${c.nombre} ${enZona(z)}`, l),
      body: `${crumbs([['Inicio', '/'], [c.nombre, `/${c.url}/`], [z.nombre]])}
<section class="wrap block">
  <h1>${esc(c.nombre)} ${esc(enZona(z))}</h1>
  <p class="lead">${l.length === 1 ? 'Una opción' : `${l.length} opciones`} de ${esc(c.plural)} ${esc(enZona(z))}.</p>
  <div class="cards">${l.map((x) => card(x)).join('')}</div>
  <p class="more"><a href="/zonas/${z.slug}/">Ver todas las extraescolares ${esc(enZona(z))} →</a></p>
  ${cerca.length ? `<h2>${esc(c.nombre)} en otras zonas</h2>${chipsZonas(cerca, (o) => `/${c.url}/${o.slug}/`)}` : ''}
</section>`
    }));
  }
}

// ---------- Campamentos
const otrosCamps = centros.filter((c) => c.campamento);
function campCard(c) {
  return `<article class="card card-star"><span class="badge">Destacado</span><h3>${esc(c.nombre)}</h3><p>${esc(c.resumen)}</p><p class="addr">📍 ${esc(c.donde)}</p><p class="addr">📅 ${esc(c.fechas)}</p><div class="actions"><a class="btn btn-sm" href="${esc(c.web)}" target="_blank" rel="noopener">Web</a></div></article>`;
}
function campPage(rel, tipo, h1, lead, description, extra = []) {
  write(rel, layout({
    title: `${h1} | Extraescolares Cerca`,
    description,
    rel,
    body: `${crumbs([['Inicio', '/'], [h1]])}
<section class="wrap block">
  <h1>${esc(h1)}</h1>
  <p class="lead">${esc(lead)}</p>
  <div class="cards">${campamentos[tipo].map(campCard).join('')}</div>
  ${extra.length ? `<h2>Otros organizadores de campamentos</h2><div class="cards">${extra.map((x) => card(x, { mostrarCat: true })).join('')}</div>` : ''}
  <p class="muted note">¿Organizas un campamento? Escríbenos para aparecer en el directorio.</p>
</section>`
  }));
}
campPage('campamentos-urbanos', 'urbanos', 'Campamentos urbanos de verano en Madrid',
  'Campamentos de día en la ciudad: los niños duermen en casa y pasan la jornada aprendiendo y jugando.',
  'Campamentos urbanos de verano para niños en Madrid y alrededores: en inglés, de deporte, robótica, baile y más.', otrosCamps);
campPage('campamentos-residenciales', 'residenciales', 'Campamentos residenciales de verano',
  'Campamentos con alojamiento, en la naturaleza, para que los niños ganen autonomía y practiquen inglés de verdad.',
  'Campamentos residenciales de verano para niños desde Madrid, con inmersión en inglés y actividades en la naturaleza.');

// ---------- Estáticos, sitemap y robots
fs.copyFileSync(path.join(root, 'public', 'style.css'), path.join(out, 'style.css'));
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.domain}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);

console.log(`Generadas ${urls.length} páginas en /dist (${centros.length} centros, ${zonasOrden.length} zonas)`);
