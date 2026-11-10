#!/usr/bin/env python3
# Genera una entrada de blog nueva con un modelo gratuito de OpenRouter, la enseña en
# localhost:6000 para confirmarla o pedir cambios, y al confirmar hace commit + push.
# Solo librería estándar: no hace falta "pip install" nada para ejecutar este script.

import datetime
import http.server
import json
import os
import re
import subprocess
import sys
import threading
import unicodedata
import urllib.error
import urllib.request
import webbrowser
from functools import partial
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
BLOG_DIR = ROOT / "blog"
TEMPLATE_PATH = SCRIPT_DIR / "blog_template.html"
INDEX_PATH = BLOG_DIR / "index.html"
SITEMAP_PATH = ROOT / "sitemap.xml"
PORT = 6000
DEFAULT_OG_IMAGE = "u-men-working-house.jpg"
POST_MARKER = "<!-- NUEVO_POST_AQUI -->"
SITEMAP_MARKER = "<!-- NUEVA_URL_AQUI -->"
EMPTY_NOTICE = '      <p class="blog-empty">Aún no hay entradas publicadas. Vuelve pronto.</p>\n'

SERVICIOS = [
    ("Reformas integrales", "reformas-integrales.html"),
    ("Cocinas y baños", "cocinas-y-banos.html"),
    ("Electricidad y fontanería", "electricidad-y-fontaneria.html"),
    ("Pintura y revestimientos", "pintura-y-revestimientos.html"),
    ("Impermeabilización de azoteas", "impermeabilizacion-de-azoteas.html"),
]

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def load_env_file(path):
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def get_config():
    file_vals = load_env_file(SCRIPT_DIR / ".env")
    api_key = os.environ.get("OPENROUTER_API_KEY") or file_vals.get("OPENROUTER_API_KEY")
    model = os.environ.get("OPENROUTER_MODEL") or file_vals.get("OPENROUTER_MODEL")
    return api_key, model


def run_git(args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")


def git_pull():
    print("Actualizando el repositorio (git pull)...")
    result = run_git(["pull"])
    if result.returncode != 0:
        print("No se ha podido hacer git pull. Revisa la conexión o resuelve los conflictos a mano:")
        print(result.stderr or result.stdout)
        sys.exit(1)
    print(result.stdout.strip() or "Repositorio al día.")


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "post"


def unique_slug(base_slug):
    slug = base_slug
    n = 2
    while (BLOG_DIR / f"{slug}.html").exists():
        slug = f"{base_slug}-{n}"
        n += 1
    return slug


def escape_html(text):
    return (text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def fecha_display(d):
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def fetch_free_models(api_key):
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/models",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        print(f"Aviso: no se pudo consultar la lista de modelos ({exc}). Se usará un modelo por defecto.")
        return []
    free = []
    for m in data.get("data", []):
        pricing = m.get("pricing", {})
        try:
            if float(pricing.get("prompt", 1)) == 0 and float(pricing.get("completion", 1)) == 0:
                free.append(m)
        except (TypeError, ValueError):
            continue
    return free


def pick_model(api_key, forced_model):
    if forced_model:
        return forced_model
    free = fetch_free_models(api_key)
    if not free:
        return "openrouter/free"
    preferidos = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-exp:free",
        "deepseek/deepseek-chat-v3.1:free",
        "qwen/qwen-2.5-72b-instruct:free",
    ]
    ids = {m["id"] for m in free}
    for p in preferidos:
        if p in ids:
            return p
    free.sort(key=lambda m: m.get("context_length", 0), reverse=True)
    return free[0]["id"]


def call_openrouter(api_key, model, messages):
    body = json.dumps({"model": model, "messages": messages, "temperature": 0.7}).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://yf-reformas.com",
            "X-Title": "YF Reformas - generador de blog",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detalle = exc.read().decode("utf-8", errors="replace")
        if exc.code == 429:
            raise RuntimeError("Límite gratuito de peticiones agotado por ahora. Espera un minuto y vuelve a intentarlo.")
        if exc.code == 401:
            raise RuntimeError("La clave de OpenRouter no es válida. Revisa OPENROUTER_API_KEY en scripts/.env.")
        raise RuntimeError(f"OpenRouter devolvió un error ({exc.code}): {detalle}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"No se ha podido contactar con OpenRouter: {exc}")
    return data["choices"][0]["message"]["content"]


def extract_json(text):
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass
    raise RuntimeError("La IA no devolvió un JSON válido. Respuesta recibida:\n" + text)


def build_system_prompt(servicio_nombre, servicio_href):
    enlace = (
        f"Incluye exactamente un enlace interno natural hacia \"{servicio_nombre}\" usando la URL exacta "
        f"'../{servicio_href}' dentro de un <a href=\"../{servicio_href}\">texto ancla relevante</a>."
        if servicio_href else
        "No incluyas ningún enlace interno."
    )
    return (
        "Eres redactor de blog para YF Reformas, un autónomo de reformas integrales de vivienda en "
        "Las Palmas de Gran Canaria. Reglas estrictas:\n"
        "- Español de España, tono cercano y profesional, sin tecnicismos innecesarios.\n"
        "- No inventes datos concretos de la empresa: nada de años de experiencia, número de reformas, "
        "certificaciones, premios ni reseñas de clientes.\n"
        "- No uses emojis.\n"
        "- No uses formato Markdown (sin **negrita**, sin listas con guion). El cuerpo es HTML válido usando "
        "solo <p>, <h2> y, si hace falta, <ul>/<li>.\n"
        "- Entre 500 y 800 palabras, en 3-5 apartados con su propio <h2>.\n"
        f"- {enlace}\n"
        "- Termina con un último párrafo invitando a contactar por WhatsApp o el formulario de la web, "
        "sin inventar ofertas ni descuentos.\n"
        "- Devuelve ÚNICAMENTE un objeto JSON, sin texto antes ni después, con esta forma exacta: "
        '{"title": "...", "slug": "...", "meta_description": "...", "body_html": "..."}. '
        "'slug' en minúsculas, sin tildes, separado por guiones. 'meta_description' de máximo 155 caracteres. "
        "'body_html' es un único string con el HTML del cuerpo, sin <html>, <head> ni <body>."
    )


def render_post(slug, data, date_today):
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    title = escape_html(data["title"])
    meta = escape_html(data["meta_description"])
    replacements = {
        "{{TITLE}}": title,
        "{{META_DESCRIPTION}}": meta,
        "{{SLUG}}": slug,
        "{{DATE_ISO}}": date_today.isoformat(),
        "{{DATE_DISPLAY}}": fecha_display(date_today),
        "{{BODY_HTML}}": data["body_html"],
        "{{OG_IMAGE}}": DEFAULT_OG_IMAGE,
    }
    for key, val in replacements.items():
        template = template.replace(key, val)
    return template


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


def start_server():
    handler = partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def ask(prompt):
    return input(prompt).strip()


def elegir_servicio():
    print("\n¿A qué página de servicio quieres enlazar desde el post?")
    for i, (nombre, _) in enumerate(SERVICIOS, start=1):
        print(f"  {i}. {nombre}")
    print("  0. Ninguna")
    while True:
        opcion = ask("Elige un número: ")
        if opcion == "0":
            return None, None
        if opcion.isdigit() and 1 <= int(opcion) <= len(SERVICIOS):
            return SERVICIOS[int(opcion) - 1]
        print("Opción no válida, inténtalo de nuevo.")


def insertar_tarjeta(slug, data, date_today):
    html = INDEX_PATH.read_text(encoding="utf-8")
    html = html.replace(EMPTY_NOTICE, "")
    card = (
        f'      <article class="blog-list-item">\n'
        f'        <span class="blog-list-date">{fecha_display(date_today)}</span>\n'
        f'        <h2><a href="{slug}.html">{escape_html(data["title"])}</a></h2>\n'
        f'        <p>{escape_html(data["meta_description"])}</p>\n'
        f'      </article>\n'
    )
    html = html.replace(POST_MARKER, POST_MARKER + "\n" + card)
    INDEX_PATH.write_text(html, encoding="utf-8")


def insertar_sitemap(slug):
    xml = SITEMAP_PATH.read_text(encoding="utf-8")
    entry = (
        f"  <url>\n"
        f"    <loc>https://yf-reformas.com/blog/{slug}.html</loc>\n"
        f"    <priority>0.5</priority>\n"
        f"  </url>\n"
    )
    if SITEMAP_MARKER in xml:
        xml = xml.replace(SITEMAP_MARKER, SITEMAP_MARKER + "\n" + entry)
    else:
        xml = xml.replace("</urlset>", entry + "</urlset>")
    SITEMAP_PATH.write_text(xml, encoding="utf-8")


def publicar(slug, data):
    insertar_tarjeta(slug, data, datetime.date.today())
    insertar_sitemap(slug)
    run_git(["add", f"blog/{slug}.html", "blog/index.html", "sitemap.xml"])
    msg = f"Nuevo post del blog: {data['title']}"
    commit = run_git(["commit", "-m", msg])
    if commit.returncode != 0:
        print("No se ha podido hacer el commit:")
        print(commit.stderr or commit.stdout)
        return
    print("Commit creado. Subiendo al repositorio (git push)...")
    push = run_git(["push"])
    if push.returncode != 0:
        print("El commit se ha hecho en tu ordenador, pero el push ha fallado:")
        print(push.stderr or push.stdout)
        print("Puedes reintentarlo más tarde ejecutando: git push")
        return
    print(f"Publicado. En unos minutos estará en https://yf-reformas.com/blog/{slug}.html")


def main():
    api_key, forced_model = get_config()
    if not api_key:
        print(
            "Falta la clave de OpenRouter. Crea una cuenta gratuita en https://openrouter.ai, "
            "copia tu clave y pégala en scripts/.env como OPENROUTER_API_KEY=tu_clave "
            "(copia scripts/.env.example como punto de partida)."
        )
        sys.exit(1)

    git_pull()

    print("\nVamos a crear un nuevo post del blog.")
    tema = ask("¿De qué quieres que trate el post? ")
    intencion = ask("¿Qué quieres conseguir con este post (a quién quieres atraer)? ")
    servicio_nombre, servicio_href = elegir_servicio()

    model = pick_model(api_key, forced_model)
    print(f"\nUsando el modelo: {model}")
    system_prompt = build_system_prompt(servicio_nombre, servicio_href)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Tema del artículo: {tema}\n\nIntención/objetivo: {intencion}"},
    ]

    print("Generando el artículo...")
    raw = call_openrouter(api_key, model, messages)
    data = extract_json(raw)
    slug = unique_slug(slugify(data.get("slug") or data["title"]))

    html = render_post(slug, data, datetime.date.today())
    (BLOG_DIR / f"{slug}.html").write_text(html, encoding="utf-8")

    server = start_server()
    url = f"http://127.0.0.1:{PORT}/blog/{slug}.html"
    print(f"\nPost listo para revisar: {url}")
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        while True:
            respuesta = ask(
                "\n¿Confirmas el post? Escribe 's' para publicarlo, 'c' para cancelar, "
                "o describe qué cambiar: "
            )
            if respuesta.lower() == "s":
                break
            if respuesta.lower() == "c":
                (BLOG_DIR / f"{slug}.html").unlink(missing_ok=True)
                print("Cancelado, no se ha tocado el repositorio.")
                return
            messages.append({"role": "assistant", "content": raw})
            messages.append({
                "role": "user",
                "content": (
                    f"Aplica este cambio al artículo anterior y devuélvelo de nuevo completo, "
                    f"en el mismo formato JSON: {respuesta}"
                ),
            })
            print("Aplicando el cambio...")
            raw = call_openrouter(api_key, model, messages)
            data = extract_json(raw)
            html = render_post(slug, data, datetime.date.today())
            (BLOG_DIR / f"{slug}.html").write_text(html, encoding="utf-8")
            print("Cambio aplicado, recarga la página en el navegador para verlo.")
    finally:
        server.shutdown()

    publicar(slug, data)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(f"\nError: {exc}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nCancelado.")
        sys.exit(1)
