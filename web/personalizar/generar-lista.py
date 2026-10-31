# Crea lista.json con los archivos de remeras/, estampados/, fondo/ y etiquetas/.
# Correr cada vez que agregues o borres imágenes:  python generar-lista.py
import json, os
aca = os.path.dirname(os.path.abspath(__file__))
ext = (".png", ".webp", ".jpg", ".jpeg")
def imgs(*ruta):
    d = os.path.join(aca, *ruta)
    return sorted(f for f in os.listdir(d) if f.lower().endswith(ext)) if os.path.isdir(d) else []
lista = {c: imgs(c) for c in ("remeras", "estampados", "fondo")}
et = os.path.join(aca, "etiquetas")
lista["etiquetas"] = {m: imgs("etiquetas", m) for m in sorted(os.listdir(et))
                      if os.path.isdir(os.path.join(et, m)) and m.lower() != "tags"} if os.path.isdir(et) else {}
lista["tags"] = imgs("etiquetas", "tags")
with open(os.path.join(aca, "lista.json"), "w", encoding="utf-8") as f:
    json.dump(lista, f, ensure_ascii=False, indent=2)
print({c: (len(v) if isinstance(v, list) else {m: len(x) for m, x in v.items()}) for c, v in lista.items()})
