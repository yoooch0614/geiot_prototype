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
        # 网络不可用时也要尽快回退到 127.0.0.1，不能让服务器一直卡在启动阶段。
        s.settimeout(1.0)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


# 音声・画像などの素材。no-store にすると鳴らすたびに mp3 を取り直すことになり、
# 取得が間に合わず音が出ないことがあるので、端末に持たせておきたい。
MEDIA_SUFFIXES = (".mp3", ".wav", ".m4a", ".ogg", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 編集しながら確認するので、JS/CSS/JSON は毎回取り直させる（no-store）。
        #
        # 素材は端末に持たせておくが、"no-cache" にする。名前がまぎらわしいが、これは
        # 「使う前に毎回サーバーへ変わったか聞く」という意味で、変わっていなければ 304 が返り
        # 手元のものをそのまま使う（＝再ダウンロードしない）。
        # max-age で時間を決め打ちすると、mp3 や png を差し替えても端末が古いものを
        # 使い続けてしまい、「編集が反映されない」ことになる。それを防ぐ。
        path = self.path.split("?", 1)[0].lower()
        if path.endswith(MEDIA_SUFFIXES):
            self.send_header("Cache-Control", "no-cache")
        else:
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
