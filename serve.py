#!/usr/bin/env python3
"""
同じ Wi-Fi の iPad / iPhone からアクセスできるサーバーを立てる。

つかいかた（このフォルダで）:
    python3 serve.py

表示された http://<このPCのIP>:8000 を iPad の Safari で開く。
（PC と iPad が同じ Wi-Fi につながっている必要があります）

写真撮影はファイル入力(<input capture>)なので、http のままでも動きます。
"""
import http.server
import socket
import socketserver
import os

PORT = 8000

# このスクリプトのある場所（＝プロジェクト直下）を配信する
os.chdir(os.path.dirname(os.path.abspath(__file__)))


def lan_ip() -> str:
    """LAN 側の自分の IP を推定（外部に送信はしない）。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # ログを静かに


def main():
    ip = lan_ip()
    # 0.0.0.0 にバインド ＝ 同じ Wi-Fi の他端末からも見える
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print("=" * 44)
        print("  えほん web サーバー起動中")
        print("-" * 44)
        print(f"  このPC :  http://localhost:{PORT}")
        print(f"  iPad   :  http://{ip}:{PORT}   ← Safariで開く")
        print("=" * 44)
        print("  （同じ Wi-Fi につないでね / 止めるには Ctrl+C）")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを止めました。")


if __name__ == "__main__":
    main()
