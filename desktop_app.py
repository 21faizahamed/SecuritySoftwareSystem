"""
SIRA Security Certificate & Compliance Inspection System
Standalone Desktop Application Entrypoint (.exe)
"""

import os
import sys
import time
import threading
import socket
import webbrowser
import uvicorn

# Fix working directory for PyInstaller bundle
if getattr(sys, 'frozen', False):
    APP_DIR = sys._MEIPASS
    os.chdir(os.path.dirname(sys.executable))
else:
    APP_DIR = os.path.dirname(os.path.abspath(__file__))

# Add backend to sys.path
backend_dir = os.path.join(APP_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.core.logging import logger

HOST = "127.0.0.1"
PORT = 8000

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, port)) == 0

def start_server():
    """Runs the Uvicorn server in a separate thread."""
    config = uvicorn.Config(
        app,
        host=HOST,
        port=PORT,
        log_level="info",
        access_log=False
    )
    server = uvicorn.Server(config)
    server.run()

def wait_for_server(url: str, timeout: int = 15) -> bool:
    """Waits for the FastAPI backend to be ready."""
    import urllib.request
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(f"{url}/health", timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False

def main():
    print("=" * 70)
    print("  SIRA Security Certificate & Compliance Inspection System")
    print("  Initializing Desktop Application...")
    print("=" * 70)

    # 1. Start Server in Thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    app_url = f"http://{HOST}:{PORT}"
    print(f"[*] Waiting for backend services at {app_url}...")
    ready = wait_for_server(app_url)

    if not ready:
        print("[!] Warning: Server startup taking longer than expected. Launching UI anyway...")

    # 2. Try launching via pywebview for native Desktop Window
    try:
        import webview
        print("[*] Launching native Windows application window...")
        window = webview.create_window(
            title="SIRA Security Certificate & Compliance Inspection System",
            url=app_url,
            width=1400,
            height=900,
            min_size=(1024, 700),
            resizable=True,
            text_select=True,
            confirm_close=False
        )
        webview.start(private_mode=False)
    except Exception as e:
        print(f"[!] PyWebView window unavailable ({e}). Opening in default browser...")
        webbrowser.open(app_url)
        # Keep process alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down Security Certificate System...")

if __name__ == "__main__":
    main()
