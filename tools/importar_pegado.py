"""Importa fichas copiadas/pegadas desde la tabla del directorio (una celda por línea)
y las guarda en data/centros_extra.json, con la misma forma que data/centros.json.

Uso: python3 tools/importar_pegado.py ruta/al/fichero.txt
Cada ficha empieza con una línea "N<TAB>" y trae: nombre, slug, web, teléfono, dirección,
municipio, provincia, CP, lat, lng, tipo, categorías, valoración, nº opiniones, ...,
descripción y servicios (las dos últimas líneas de la ficha).
"""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from importar_csv import categoria, slugify, EXCLUIR_NOMBRES  # mismas reglas que el CSV

ROOT = Path(__file__).resolve().parent.parent
NUM = re.compile(r"^\d+(,\d+)?$")


def servicios(raw):
    try:
        data = json.loads(raw)
    except Exception:
        return []
    out = []
    for s in data:
        if isinstance(s, str):
            out.append(s)
        elif isinstance(s, dict):
            nombre = s.get("servicio") or s.get("nombre_servicio") or s.get("categoria")
            if nombre:
                extra = s.get("tipos_de_clase") or s.get("clases") or []
                out.append(f"{nombre}: {', '.join(extra)}" if extra and nombre.lower() not in ", ".join(extra).lower() else nombre)
    return out[:8]


def parse(path):
    lineas = Path(path).read_text(encoding="utf-8").replace("\r", "").split("\n")
    bloques, actual = [], None
    for l in lineas[1:]:
        if re.match(r"^\d+\t$", l):
            actual = []; bloques.append(actual)
        elif actual is not None:
            actual.append(l)
    fichas = []
    for b in bloques:
        b = [x for x in b if x not in ("Google", "View Place")]
        if len(b) < 14:
            print("  incompleta, se omite:", b[0] if b else "?"); continue
        nombre, slug, _, web, tel, direccion, loc, _, cp, lat, lng = b[:11]
        resto = b[11:]
        tipo = resto[0]
        i = next((k for k, x in enumerate(resto) if NUM.match(x) and k + 1 < len(resto) and NUM.match(resto[k + 1])), None)
        if i is None:
            print("  sin valoración, se omite:", nombre); continue
        cats = [x for x in resto[1:i] if not x.startswith("+")]
        rating, n = float(resto[i].replace(",", ".")), int(resto[i + 1])
        desc, serv = (resto[-2], resto[-1]) if len(resto) >= 2 else ("—", "—")
        if not re.search(r"\d related", " ".join(resto[-4:-2])):
            desc, serv = "—", "—"  # ficha cortada: sin descripción fiable
        fichas.append(dict(nombre=nombre, slug=slug, web=web, tel=tel, direccion=direccion, loc=loc, cp=cp,
                           lat=lat, lng=lng, tipo=tipo, cats="; ".join(cats), rating=rating, n=n,
                           desc="" if desc == "—" else desc, serv=[] if serv == "—" else servicios(serv)))
    return fichas


def main(path):
    centros, descartes = [], []
    for f in parse(path):
        if any(x.lower() in f["nombre"].lower() for x in EXCLUIR_NOMBRES):
            descartes.append((f["nombre"], "excluido")); continue
        cat = (categoria({"Business Type": f["tipo"], "Categories": "", "Business Name": f["nombre"]})
               or categoria({"Business Type": f["tipo"], "Categories": f["cats"], "Business Name": f["nombre"]}))
        if not cat:
            descartes.append((f["nombre"], "sin categoría")); continue
        centros.append({
            "id": f["slug"] or slugify(f["nombre"]),
            "nombre": f["nombre"],
            "categoria": cat,
            "campamento": "campamento" in " ".join(f["serv"]).lower() or "camp" in f["tipo"].lower(),
            "destacado": "casita de ingl" in f["nombre"].lower(),
            "zona": f["loc"],
            "zona_slug": slugify(f["loc"]),
            "tipo_zona": "municipio" if f["loc"] != "Madrid" else "distrito",
            "direccion": f["direccion"].replace(", Spain", ""),
            "telefono": f["tel"],
            "web": f["web"],
            "maps": "",
            "rating": f["rating"],
            "opiniones": f["n"],
            "horario": [],
            "descripcion": f["desc"],
            "servicios": f["serv"],
        })
    (ROOT / "data" / "centros_extra.json").write_text(json.dumps(centros, ensure_ascii=False, indent=1))
    print(f"{len(centros)} fichas importadas a data/centros_extra.json")
    for c in centros:
        print(f"  {c['categoria']:15} {c['zona']:20} {c['nombre']}")
    for n, m in descartes:
        print("  descartado:", n, "-", m)


if __name__ == "__main__":
    main(sys.argv[1])
