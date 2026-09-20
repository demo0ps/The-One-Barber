#!/usr/bin/env python3
"""
Preview proxy: serves ONE dashboard of the single production Next.js server
on its own port, so each dashboard gets its own live preview panel.

Usage: python3 proxy_preview.py <dashboard-path> <port>
  e.g. python3 proxy_preview.py /barber 3001

Everything (assets, API, websocket-free XHR) is forwarded to the ONE engine
on :3000 — the four previews can never drift out of sync.
"""
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UP = "http://127.0.0.1:3000"
DASH = sys.argv[1].rstrip("/")
PORT = int(sys.argv[2])

# Real app paths that must reach the server unmodified.
PASS = ("/barber", "/reception", "/admin", "/api", "/_next", "/images", "/test-payfast", "/favicon.ico")

HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade", "content-length", "host", "accept-encoding"}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _proxy(self):
        path = self.path
        if not any(path == p or path.startswith(p + "/") or path.startswith(p + "?") for p in PASS):
            path = DASH + path
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(UP + path, data=body, method=self.command)
        for k, v in self.headers.items():
            if k.lower() in HOP:
                continue
            req.add_header(k, v)
        req.add_header("Host", "localhost:3000")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
                self.send_response(r.status)
                for k, v in r.headers.items():
                    if k.lower() in HOP or k.lower() == "content-encoding":
                        continue
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/octet-stream"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            msg = str(e).encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    do_GET = do_POST = do_PATCH = do_PUT = do_DELETE = _proxy

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"preview proxy: :{PORT} → {UP}{DASH}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
