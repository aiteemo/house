import os
import sys
import json
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

sys.path.insert(0, os.path.dirname(__file__))

from api import parse_url, fetch_all
from storage import save, load_all

BASE_DIR = os.path.dirname(__file__)
TEMPLATE = os.path.join(BASE_DIR, 'templates', 'report.html')
REPORT = os.path.join(BASE_DIR, 'report.html')
DATA_FILE = os.path.join(BASE_DIR, 'data.json')


def update_data_file():
    results = load_all()
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False)


def generate_report():
    update_data_file()
    return REPORT


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/' or self.path == '/report.html':
            self.path = '/report.html'
            return super().do_GET()
        if self.path.startswith('/api/data'):
            update_data_file()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(DATA_FILE, 'rb') as f:
                self.wfile.write(f.read())
            return
        return super().do_GET()

    def log_message(self, format, *args):
        pass


def serve(port=8080):
    update_data_file()
    server = HTTPServer(('127.0.0.1', port), Handler)
    print(f'报告服务已启动: http://127.0.0.1:{port}')
    print('按 Ctrl+C 停止服务')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务已停止')


def main():
    if len(sys.argv) > 1 and sys.argv[1] in ('-s', '--serve'):
        port = 8080
        if '--port' in sys.argv:
            idx = sys.argv.index('--port')
            port = int(sys.argv[idx + 1])
        serve(port)
        return

    parser = argparse.ArgumentParser(description='黑猫投诉数据抓取')
    parser.add_argument('target', nargs='?', help='couid 或包含 couid 的 URL')
    parser.add_argument('-a', '--all', action='store_true', help='请求全部数据（自动翻页）')
    parser.add_argument('-d', '--delay', type=int, default=10, help='翻页间隔秒数（默认10）')
    parser.add_argument('-p', '--page', type=int, default=1, help='起始页码（默认1）')
    args = parser.parse_args()

    if not args.target:
        parser.print_help()
        return

    if not args.target:
        parser.print_help()
        return

    couid = parse_url(args.target)
    print(f'正在抓取 couid={couid} ...')

    info, complaints = fetch_all(couid, delay=args.delay, start_page=args.page)
    filepath = save(couid, info, complaints)
    print(f'数据已保存: {filepath}')
    print(f'共获取 {len(complaints)} 条投诉')

    generate_report()
    print(f'数据已更新，请刷新浏览器查看')


if __name__ == '__main__':
    main()
