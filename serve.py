#!/usr/bin/env python3
"""Servidor estático local para desenvolvimento.

Igual ao `python -m http.server`, mas envia cabeçalhos anti-cache para o
navegador sempre buscar a versão mais recente dos arquivos (o cache heurístico
do navegador atrapalha muito quando existe um Service Worker no meio).
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
RAIZ = Path(__file__).parent


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()


if __name__ == "__main__":
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), partial(Handler, directory=str(RAIZ)))
    print(f"Servindo {RAIZ} em http://localhost:{PORTA}")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        servidor.shutdown()
