#!/usr/bin/env python3
"""Simple HTTP server with image upload support for renovation assistant."""
import http.server
import json
import os
import sys
import cgi
import urllib.parse
import hashlib
import time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'images')
os.makedirs(UPLOAD_DIR, exist_ok=True)

class UploadHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/upload':
            self._handle_upload()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith('/api/image/'):
            self._handle_delete()
        else:
            self.send_error(404)

    def _handle_upload(self):
        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            self._json_response(400, {'error': 'Expected multipart/form-data'})
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                'REQUEST_METHOD': 'POST',
                'CONTENT_TYPE': content_type,
            }
        )

        file_item = form['file']
        if file_item.filename:
            ext = os.path.splitext(file_item.filename)[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'):
                self._json_response(400, {'error': 'Unsupported image type'})
                return

            # Generate unique filename
            ts = int(time.time() * 1000)
            h = hashlib.md5(file_item.filename.encode()).hexdigest()[:6]
            filename = f"{ts}_{h}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)

            with open(filepath, 'wb') as f:
                f.write(file_item.file.read())

            self._json_response(200, {
                'ok': True,
                'filename': filename,
                'url': f'images/{filename}'
            })
        else:
            self._json_response(400, {'error': 'No file uploaded'})

    def _handle_delete(self):
        filename = self.path.split('/')[-1]
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            self._json_response(200, {'ok': True})
        else:
            self._json_response(404, {'error': 'File not found'})

    def _json_response(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    with http.server.HTTPServer(('', PORT), UploadHandler) as httpd:
        print(f'Server running at http://localhost:{PORT}/')
        print(f'Image uploads saved to: {UPLOAD_DIR}')
        httpd.serve_forever()
