#!/usr/bin/env python3
"""Vigilante de capacero3d.com: web, /editor, DNS (NS, MX, SPF de IONOS).

Se ejecuta desde GitHub Actions cada 10 min. Si algo falla dos veces seguidas
(con 90 s de separación) abre un issue y avisa por Gmail; cuando se recupera,
cierra el issue y avisa de nuevo. Sin avisos repetidos mientras dura la caída.
El correo se envía desde y hacia la cuenta de Gmail del secreto GMAIL_USER.
"""
import json, os, smtplib, ssl, sys, time, urllib.parse, urllib.request
from email.message import EmailMessage

DOMINIO = "capacero3d.com"
WEBS = [("Web principal", f"https://www.{DOMINIO}/", "capacero"),
        ("Editor", f"https://www.{DOMINIO}/editor/", "")]
DOH = ["https://dns.google/resolve", "https://cloudflare-dns.com/dns-query"]
REPO = os.environ.get("GITHUB_REPOSITORY", "")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
ETIQUETA = "caida-monitor"
# Valores esperados. Durante la migración de DNS se aceptan los NS de sered y los de IONOS.
NS_VALIDOS = ("sered.net", "ui-dns.com", "ui-dns.de", "ui-dns.org", "ui-dns.biz")
IP_RAIZ = "216.198.79.1"
DKIM = [("s1-ionos._domainkey", "s1.dkim.ionos.com"),
        ("s2-ionos._domainkey", "s2.dkim.ionos.com"),
        ("s42582890._domainkey", "s42582890.dkim.ionos.com")]
UA = {"User-Agent": "monitor-web"}


def http_get(url, headers=None, timeout=20):
    req = urllib.request.Request(url, headers=headers or UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read(400000).decode("utf-8", "replace")


def doh(nombre, tipo):
    """Devuelve (status_dns, [respuestas]) del primer resolvedor que conteste; (None, []) si ninguno."""
    for base in DOH:
        try:
            url = f"{base}?name={urllib.parse.quote(nombre)}&type={tipo}"
            _, body = http_get(url, {"accept": "application/dns-json", **UA})
            j = json.loads(body)
            datos = [a.get("data", "") for a in j.get("Answer", []) if a.get("type") in (1, 2, 5, 15, 16, 28)]
            return j.get("Status"), datos
        except Exception:
            continue
    return None, []


def comprobar():
    fallos = []
    for nombre, url, texto in WEBS:
        try:
            st, body = http_get(url)
            if st != 200:
                fallos.append(f"{nombre} ({url}) respondió {st}")
            elif texto and texto not in body.lower():
                fallos.append(f"{nombre} responde 200 pero sin el contenido esperado")
            elif len(body) < 300:
                fallos.append(f"{nombre} responde 200 pero casi vacía")
        except Exception as e:
            fallos.append(f"{nombre} ({url}) no responde: {e}")

    st, ns = doh(DOMINIO, "NS")
    if st is None:
        print("Aviso: no se pudo consultar DoH; se omiten los chequeos DNS (no cuenta como fallo).")
        return fallos
    if st != 0 or not ns:
        fallos.append(f"DNS: los servidores de nombres no resuelven {DOMINIO} (estado {st})")
    elif not all(n.lower().rstrip(".").endswith(NS_VALIDOS) for n in ns):
        fallos.append(f"DNS: servidores de nombres inesperados: {ns}")
    st, a = doh(DOMINIO, "A")
    if st != 0 or not a:
        fallos.append(f"DNS: {DOMINIO} no devuelve IP (estado {st})")
    elif IP_RAIZ not in a:
        fallos.append(f"DNS: la IP de {DOMINIO} no es {IP_RAIZ}: {a}")
    st, w = doh(f"www.{DOMINIO}", "CNAME")
    if st != 0 or not any("vercel" in x.lower() for x in w):
        fallos.append(f"DNS: www.{DOMINIO} no apunta a Vercel (estado {st}): {w}")
    for host, destino in DKIM:
        st, d = doh(f"{host}.{DOMINIO}", "CNAME")
        if st != 0 or not any(destino in x.lower() for x in d):
            fallos.append(f"CORREO: falta o es incorrecto el DKIM {host} (estado {st}): {d}")
    st, mx = doh(DOMINIO, "MX")
    if st != 0 or not mx:
        fallos.append(f"CORREO: no hay registros MX (estado {st})")
    elif not all("ionos" in m.lower() for m in mx):
        fallos.append(f"CORREO: los MX no apuntan a IONOS: {mx}")
    st, txt = doh(DOMINIO, "TXT")
    spf = [t for t in txt if "v=spf1" in t.lower()]
    if st != 0 or not spf:
        fallos.append("CORREO: falta el registro SPF")
    elif "ionos" not in spf[0].lower():
        fallos.append(f"CORREO: el SPF no incluye IONOS: {spf[0]}")
    return fallos


def api(metodo, ruta, datos=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}{ruta}", method=metodo,
        data=json.dumps(datos).encode() if datos is not None else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json", **UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read() or b"null")


def issue_abierto():
    if not (REPO and TOKEN):
        return None
    try:
        lst = api("GET", f"/issues?state=open&labels={ETIQUETA}")
        return lst[0] if lst else None
    except Exception as e:
        print("No se pudo leer issues:", e)
        return None


def enviar_correo(asunto, cuerpo):
    clave = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "")
    usuario = os.environ.get("GMAIL_USER", "").strip()
    if not (clave and usuario):
        print("::warning::Faltan los secretos GMAIL_USER / GMAIL_APP_PASSWORD: no se envía correo (queda el aviso de GitHub).")
        return False
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = asunto, usuario, usuario
    msg.set_content(cuerpo)
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ssl.create_default_context(), timeout=30) as s:
        s.login(usuario, clave)
        s.send_message(msg)
    print("Correo enviado:", asunto)
    return True


def main():
    fallos = comprobar()
    if fallos:
        print("Fallos, reintento en 90 s:", fallos)
        time.sleep(90)
        fallos = comprobar()
    abierto = issue_abierto()
    ahora = time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())
    if fallos:
        print("CAÍDA CONFIRMADA:", fallos)
        if abierto:
            print("Ya hay un aviso abierto; no se repite.")
            return
        lista = "\n".join(f"- {f}" for f in fallos)
        try:
            enviar_correo(f"🔴 CAÍDA capacero3d.com ({ahora})",
                          f"El vigilante ha detectado un problema confirmado en dos comprobaciones seguidas:\n\n{lista}\n\n"
                          "Te avisaré de nuevo cuando se recupere.")
        except Exception as e:
            print("::warning::Fallo enviando el correo:", e)
        try:
            api("POST", "/issues", {"title": f"🔴 Caída detectada ({ahora})", "labels": [ETIQUETA],
                                    "body": f"{lista}\n\nSe cerrará solo cuando todo vuelva a la normalidad."})
        except Exception as e:
            print("::warning::No se pudo crear el issue:", e)
    elif abierto:
        print("RECUPERADO")
        try:
            enviar_correo(f"🟢 RECUPERADO capacero3d.com ({ahora})",
                          f"Web, editor, DNS y correo vuelven a responder con normalidad.\nAviso abierto desde: {abierto['created_at']}")
        except Exception as e:
            print("::warning::Fallo enviando el correo:", e)
        try:
            api("POST", f"/issues/{abierto['number']}/comments", {"body": f"🟢 Recuperado ({ahora})."})
            api("PATCH", f"/issues/{abierto['number']}", {"state": "closed", "state_reason": "completed"})
        except Exception as e:
            print("::warning::No se pudo cerrar el issue:", e)
    else:
        print("Todo OK")


if __name__ == "__main__":
    if "--test-email" in sys.argv:
        ok = enviar_correo("✅ Prueba del vigilante de capacero3d.com", "Si lees esto, los avisos por Gmail funcionan.")
        sys.exit(0 if ok else 1)
    main()
