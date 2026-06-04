import os, json, http.server, socketserver

port = int(os.environ.get('PORT', 3456))
directory = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def translate_path(self, path):
        if path in ('/', ''):
            path = '/index.html'
        return super().translate_path(path)

    def do_POST(self):
        if self.path == '/data/cards.json':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            card = json.loads(body)
            cards_path = os.path.join(directory, 'data', 'cards.json')
            try:
                with open(cards_path) as f:
                    existing = json.load(f)
            except Exception:
                existing = []
            # update if ID exists, otherwise append
            ids = [c.get('id') for c in existing]
            if card.get('id') in ids:
                existing = [card if c.get('id')==card.get('id') else c for c in existing]
            else:
                existing.append(card)
            with open(cards_path, 'w') as f:
                json.dump(existing, f, indent=2)
            resp = json.dumps({'ok': True, 'id': card.get('id')}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        pass

with socketserver.TCPServer(('', port), Handler) as httpd:
    httpd.allow_reuse_address = True
    print(f'Serving True Balance Events on port {port}', flush=True)
    httpd.serve_forever()
