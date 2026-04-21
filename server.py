import json
import os
import socket
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

PORT = 8080
HOST = "0.0.0.0"
ROOT = os.path.dirname(os.path.abspath(__file__))
RESULTS_FILE = os.path.join(ROOT, "results.json")
ADMIN_PASSWORD = "kanker"

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}

_lock = threading.Lock()


def load_results():
    if not os.path.exists(RESULTS_FILE):
        return []
    try:
        with open(RESULTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except (json.JSONDecodeError, OSError):
        return []


def save_results(results):
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


class QuizHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print("[%s] %s" % (self.address_string(), format % args))

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        if not os.path.isfile(path):
            self.send_error(404, "Not Found")
            return
        ext = os.path.splitext(path)[1].lower()
        mime = MIME_TYPES.get(ext, "application/octet-stream")
        try:
            with open(path, "rb") as f:
                body = f.read()
        except OSError:
            self.send_error(500, "Read Error")
            return
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return None
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _safe_path(self, url_path):
        if url_path == "/" or url_path == "":
            url_path = "/index.html"
        clean = os.path.normpath(url_path.lstrip("/"))
        full = os.path.join(ROOT, clean)
        if not os.path.abspath(full).startswith(os.path.abspath(ROOT)):
            return None
        return full

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/results":
            with _lock:
                results = load_results()
            self._send_json(200, {"results": results})
            return

        if path.startswith("/api/"):
            self._send_json(404, {"error": "Unknown endpoint"})
            return

        full = self._safe_path(path)
        if full is None:
            self.send_error(403, "Forbidden")
            return
        self._send_file(full)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/login":
            data = self._read_json() or {}
            if data.get("password") == ADMIN_PASSWORD:
                self._send_json(200, {"ok": True})
            else:
                self._send_json(401, {"ok": False, "error": "Onjuist wachtwoord"})
            return

        if path == "/api/results":
            data = self._read_json()
            if not isinstance(data, dict):
                self._send_json(400, {"error": "Invalid body"})
                return
            name = str(data.get("name", "")).strip()[:50]
            icon = str(data.get("icon", "")).strip()[:100]
            try:
                score = int(data.get("score", 0))
                total = int(data.get("total", 0))
            except (TypeError, ValueError):
                self._send_json(400, {"error": "Invalid score"})
                return
            date = str(data.get("date", "")).strip()[:50]
            answers = data.get("answers")
            if not isinstance(answers, list):
                answers = []
            if not name or not icon or total <= 0:
                self._send_json(400, {"error": "Missing fields"})
                return
            entry = {
                "name": name,
                "icon": icon,
                "score": score,
                "total": total,
                "date": date,
                "answers": answers,
            }
            with _lock:
                results = load_results()
                results.append(entry)
                save_results(results)
            self._send_json(200, {"ok": True, "entry": entry})
            return

        self._send_json(404, {"error": "Unknown endpoint"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/results":
            data = self._read_json() or {}
            if data.get("password") != ADMIN_PASSWORD:
                self._send_json(401, {"error": "Unauthorized"})
                return
            with _lock:
                save_results([])
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"error": "Unknown endpoint"})


def main():
    if not os.path.exists(RESULTS_FILE):
        save_results([])

    server = ThreadingHTTPServer((HOST, PORT), QuizHandler)
    local_ip = get_local_ip()

    print("=" * 60)
    print("  5AICTLP Quiz Server")
    print("=" * 60)
    print(f"  Lokaal:         http://127.0.0.1:{PORT}")
    print(f"  LAN (intern):   http://{local_ip}:{PORT}")
    print(f"  Port forward:   poort {PORT} (TCP) -> {local_ip}")
    print("=" * 60)
    print("  Druk op Ctrl+C om te stoppen.")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer gestopt.")
        server.server_close()


if __name__ == "__main__":
    main()
