# Tarea diaria: añadir 10 centros al directorio

Web: https://extraescolarescerca.es · Repo: casitadeingles/extraescolarescerca (rama `main`).
Hostinger publica solo cada `git push` a `main` (Node.js: `npm run build` + `server.js`).

## Objetivo de cada día
Añadir **10 centros nuevos y verificados** de extraescolares para niños en Madrid y alrededores,
priorizando las zonas con huecos, y anotar lo hecho en `data/registro_diario.md`.
Mejor 7 fichas correctas que 10 dudosas: si no se puede verificar la dirección, no se añade.

## Reglas fijas
- **La Casita de Inglés va siempre primero.** El build ya lo garantiza con `destacado: true`. No marques `destacado` en ningún otro centro.
- **Solo extraescolares para niños y jóvenes**: inglés, idiomas, baile, música, arte y teatro, robótica, deporte, apoyo escolar y empresas de extraescolares. Nada de escuelas de español para extranjeros adultos, autoescuelas, gimnasios solo para adultos, salones de cumpleaños, guarderías o colegios.
- **Fuente**: la dirección, el teléfono y la web salen de la **web oficial del centro** (página de contacto o pie de página). Un directorio fiable (Páginas Amarillas, la web del ayuntamiento, etc.) vale solo para confirmar. No te inventes datos: si algo no aparece, déjalo vacío.
- **No dupliques**: antes de añadir un centro, busca su nombre en `data/centros.json` y `data/centros_extra.json`.
- **No copies textos de otras webs.** La descripción es un resumen propio de 1–2 frases.

## De dónde sacar candidatos (en este orden)
1. **Huecos zona × actividad.** Ejecuta `node tools/huecos.js`, que lista las zonas con menos centros y las actividades que les faltan. Empieza por las zonas con sede de La Casita y pocas opciones: Hortaleza (Sanchinarro), Puente y Villa de Vallecas, Carabanchel, Salamanca, Barajas, Ciudad Lineal. Busca, por ejemplo, "escuela de música Sanchinarro" y verifica en la web oficial.
2. **`data/pendientes.json`**: negocios que Google relaciona con los nuestros, ordenados por valoración. Busca su web oficial y, al añadirlo, cambia su `estado` a `"añadido"`. Si no es un centro válido, cámbialo a `"descartado"` y anota el motivo en `motivo`.
3. **Directorio padresenmadrid.com** (https://padresenmadrid.com/extraescolares, unos 500 centros). Sirve solo para encontrar candidatos: filtra por tipo con `/extraescolares/tipo/<tipo>` (idiomas, musica, robotica, arte, teatro, cocina, ajedrez, apoyo-escolar, baile) y pasa páginas con `?page=N`. Cada ficha indica la calle y el barrio, así que es útil para cubrir huecos de zona × actividad. Después hay que sacar la dirección, el teléfono y la web de la **web oficial** del centro; nunca copies sus descripciones ni enlaces sus fichas en lugar de la web oficial.
4. **Zonas nuevas**, cuando las anteriores estén razonablemente cubiertas: Las Rozas, San Sebastián de los Reyes, Rivas-Vaciamadrid, Alcalá de Henares, Torrejón de Ardoz, Fuenlabrada, Arroyomolinos y Villaviciosa de Odón.

## Formato de cada ficha (añadir al array de `data/centros_extra.json`)
```json
{
 "id": "slug-unico-del-nombre",
 "nombre": "Nombre oficial",
 "categoria": "ingles | idiomas | baile | musica | arte | robotica | deporte | apoyo-escolar | extraescolares",
 "campamento": false,
 "destacado": false,
 "zona": "Nombre exacto de la zona",
 "zona_slug": "slug-de-la-zona",
 "tipo_zona": "distrito | municipio",
 "direccion": "Calle, número, CP Ciudad",
 "telefono": "+34 ...",
 "web": "https://...",
 "maps": "",
 "rating": null,
 "opiniones": 0,
 "horario": [],
 "descripcion": "Resumen propio de 1–2 frases.",
 "servicios": ["Clases de ...", "..."]
}
```
- `campamento: true` solo si el centro organiza campamentos de verano según su web.
- `rating` y `opiniones`: solo si vienen en `data/pendientes.json`. Si no, deja `null` y `0`.
- **Zonas existentes**: usa el nombre exacto que ya aparece en los datos.
  - Distritos de Madrid: Arganzuela, Barajas, Carabanchel, Centro, Chamartín, Chamberí, Ciudad Lineal, Fuencarral-El Pardo, Hortaleza, Moncloa-Aravaca, Moratalaz, Puente de Vallecas, Retiro, Salamanca, Tetuán, Usera, Villa de Vallecas, Villaverde, Vicálvaro, San Blas, Latina.
  - Municipios: Alcobendas, Boadilla del Monte, Getafe, Leganés, Majadahonda, Móstoles, Pozuelo de Alarcón, Tres Cantos.
  - Para un municipio nuevo, usa su nombre oficial con `tipo_zona: "municipio"`.
- El `zona_slug` es el nombre en minúsculas, sin tildes y con guiones (por ejemplo, "Villa de Vallecas" se escribe `villa-de-vallecas`).

## Cerrar el día
1. `npm run build`: no debe dar errores, y el número de centros debe subir.
2. Comprueba que en las páginas de zona tocadas la primera ficha sigue siendo de La Casita cuando hay sede (`grep -o '<h3>[^<]*</h3>' dist/zonas/<zona>/index.html | head -1`).
3. Añade una línea a `data/registro_diario.md` con este formato: `- AAAA-MM-DD: N centros añadidos (zona: actividad, ...). Descartados: ... Notas: ...`
4. Haz `git add -A`, haz el commit (mensaje: "Tarea diaria AAAA-MM-DD: N centros nuevos") y luego `git push`.
5. Comprueba en https://extraescolarescerca.es, unos minutos después, que una de las fichas nuevas aparece publicada.
