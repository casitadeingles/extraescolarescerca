"""Convierte el CSV exportado (fichas de Google) en data/centros.json.

Uso: python3 tools/importar_csv.py ruta/al/fichero.csv
Asigna a cada ficha una categoría del directorio y una zona (distrito de Madrid o municipio).
"""
import csv, json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DISTRITOS = ["Centro", "Arganzuela", "Retiro", "Salamanca", "Chamartín", "Tetuán", "Chamberí",
             "Fuencarral-El Pardo", "Moncloa - Aravaca", "Latina", "Carabanchel", "Usera",
             "Puente de Vallecas", "Moratalaz", "Cdad. Lineal", "Hortaleza", "Villaverde",
             "Villa de Vallecas", "Vicálvaro", "San Blas", "Barajas"]
NOMBRE_DISTRITO = {"Cdad. Lineal": "Ciudad Lineal", "Moncloa - Aravaca": "Moncloa-Aravaca"}
# Códigos postales de Madrid capital → distrito, para fichas sin distrito en la dirección
CP_DISTRITO = {"28001": "Salamanca", "28002": "Chamartín", "28003": "Chamberí", "28004": "Centro",
               "28005": "Centro", "28006": "Salamanca", "28007": "Retiro", "28008": "Moncloa-Aravaca",
               "28009": "Retiro", "28010": "Chamberí", "28012": "Centro", "28013": "Centro",
               "28014": "Retiro", "28015": "Chamberí", "28016": "Chamartín", "28019": "Carabanchel",
               "28020": "Tetuán", "28028": "Salamanca", "28034": "Fuencarral-El Pardo",
               "28036": "Chamartín", "28042": "Barajas", "28045": "Arganzuela", "28049": "Fuencarral-El Pardo",
               "28050": "Hortaleza"}

EXCLUIR_TIPOS = {"Preschool", "Child care agency", "Park"}
EXCLUIR_NOMBRES = ["TalentGenome", "Planet Of Children", "Swings and Sports", "Tercer Depósito", "Colegio Afuera",
                   # escuelas de español para extranjeros adultos: no son extraescolares para niños
                   "Spanish School", "Spanish Language", "Cervantes Institute", "TILDE MADRID"]

REGLAS = [  # (categoría, palabras clave en tipo + categorías + nombre), en orden de prioridad
    ("robotica", ["robot", "programación", "computer training", "algorithmics", "tecnol", "steam", "inventores", "digital genius", "genios", "hack", "modelbot", "rbtk", "rockbotic", "ebot"]),
    ("baile", ["dance", "ballet", "danza", "baile", "salsa"]),
    ("musica", ["music", "música", "musica", "piano", "guitar"]),
    ("arte", ["art school", "painting", "pottery", "arte", "artes", "dragón de madera"]),
    ("deporte", ["sport", "swimming", "gym", "fitness", "gymnastics", "natación", "deport"]),
    ("apoyo-escolar", ["tutoring", "cramming", "apoyo escolar", "academia mundoestudiante", "gostudent"]),
    ("ingles", ["english", "inglés", "ingles"]),
    ("idiomas", ["language school", "idiomas"]),
    ("extraescolares", ["after school", "extraescolar", "education center", "training center", "school house", "amusement", "event"]),
]
CAMPAMENTO = ["camp", "campamento"]


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def zona(row):
    addr = row["Address"]
    loc = row["Locality"] or ""
    if loc and loc != "Madrid":
        return loc, "municipio"
    for d in DISTRITOS:
        if re.search(r",\s*" + re.escape(d) + r",", addr):
            return NOMBRE_DISTRITO.get(d, d), "distrito"
    if row["Postal Code"] in CP_DISTRITO:
        return CP_DISTRITO[row["Postal Code"]], "distrito"
    m = re.search(r"(28\d{3})\s+([^,]+),", addr)
    if m and m.group(2).strip() != "Madrid":
        return m.group(2).strip(), "municipio"
    return None, None


def categoria(row):
    texto = " ".join([row["Business Type"], row["Categories"], row["Business Name"]]).lower()
    for cat, claves in REGLAS:
        if any(k in texto for k in claves):
            return cat
    return None


def a_24h(texto):
    """'9:30 AM to 1 PM, 5 to 10 PM' -> '9:30–13:00, 17:00–22:00'"""
    texto = texto.replace("\u202f", " ").replace("Open 24 hours", "24 horas")
    if texto == "Closed":
        return "Cerrado"
    tramos = []
    for tramo in texto.split(","):
        partes = [p.strip() for p in tramo.split(" to ")]
        if len(partes) != 2:
            tramos.append(tramo.strip()); continue
        fin_ampm = "PM" if "PM" in partes[1] else "AM"
        res = []
        for i, p in enumerate(partes):
            ampm = "PM" if "PM" in p else "AM" if "AM" in p else fin_ampm
            hm = p.replace("AM", "").replace("PM", "").strip()
            h, m = (hm.split(":") + ["00"])[:2]
            h = int(h) % 12 + (12 if ampm == "PM" else 0)
            res.append(f"{h}:{m}")
        tramos.append("–".join(res))
    return ", ".join(tramos)


def horario(raw):
    try:
        dias = {"Monday": "Lun", "Tuesday": "Mar", "Wednesday": "Mié", "Thursday": "Jue", "Friday": "Vie", "Saturday": "Sáb", "Sunday": "Dom"}
        return [[dias.get(d["day"], d["day"]), a_24h(d["hours"])] for d in json.loads(raw)]
    except Exception:
        return []


def main(csv_path):
    filas = list(csv.DictReader(open(csv_path, encoding="utf-8-sig")))
    centros, descartes, vistos = [], [], set()
    for r in filas:
        nombre = r["Business Name"].strip()
        if r["Business Type"] in EXCLUIR_TIPOS or any(n.lower() in nombre.lower() for n in EXCLUIR_NOMBRES):
            descartes.append((nombre, "tipo no encaja")); continue
        z, tipo_zona = zona(r)
        cat = "ingles" if "casita de ingl" in nombre.lower() else categoria(r)
        if not z or not cat:
            descartes.append((nombre, "sin zona" if not z else "sin categoría")); continue
        if r["Google Place ID"] in vistos:
            continue
        vistos.add(r["Google Place ID"])
        texto = " ".join([r["Business Type"], nombre]).lower()
        centros.append({
            "id": r["URL Slug"] or slugify(nombre),
            "nombre": nombre,
            "categoria": cat,
            "campamento": any(k in texto for k in CAMPAMENTO),
            "destacado": "casita de ingl" in nombre.lower(),
            "zona": z,
            "zona_slug": slugify(z),
            "tipo_zona": tipo_zona,
            "direccion": r["Address"].replace(", Spain", ""),
            "telefono": r["Phone"],
            "web": r["Website"],
            "maps": f"https://www.google.com/maps/place/?q=place_id:{r['Google Place ID']}" if r["Google Place ID"] else "",
            "rating": float(r["Rating"]) if r["Rating"] else None,
            "opiniones": int(r["Rating Count"]) if r["Rating Count"] else 0,
            "horario": horario(r["Opening Hours"]),
            "lat": float(r["Latitude"]) if r["Latitude"] else None,
            "lng": float(r["Longitude"]) if r["Longitude"] else None,
        })
    centros.sort(key=lambda c: (not c["destacado"], -(c["rating"] or 0) * min(c["opiniones"], 50)))
    (ROOT / "data" / "centros.json").write_text(json.dumps(centros, ensure_ascii=False, indent=1))
    from collections import Counter
    print(f"{len(centros)} centros importados, {len(descartes)} descartados")
    print("Por categoría:", dict(Counter(c["categoria"] for c in centros)))
    print("Zonas:", len({c["zona"] for c in centros}))
    for n, motivo in descartes:
        print("  descartado:", n, "-", motivo)


if __name__ == "__main__":
    main(sys.argv[1])
