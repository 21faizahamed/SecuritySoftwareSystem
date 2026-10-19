"""
PyInstaller Packaging Script for SIRA Security Certificate System
Builds a standalone Windows Desktop Executable (.exe)
"""

import os
import sys
import shutil
import subprocess
import PyInstaller.__main__

def build():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    dist_dir = os.path.join(frontend_dir, "dist")

    print("=" * 75)
    print("  BUILDING SIRA SECURITY CERTIFICATE SYSTEM - STANDALONE DESKTOP .EXE")
    print("=" * 75)

    # 1. Build Frontend if needed
    print("\n[1/3] Checking Frontend Build...")
    if not os.path.exists(dist_dir) or not os.path.exists(os.path.join(dist_dir, "index.html")):
        print("  --> Building React Frontend...")
        subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True, shell=True)
    else:
        print("  --> Frontend 'dist' directory is up-to-date.")

    # 2. Prepare PyInstaller parameters
    print("\n[2/3] Preparing PyInstaller Arguments...")
    
    # Separator for PyInstaller --add-data on Windows is ';'
    sep = ";" if sys.platform.startswith("win") else ":"
    
    data_args = [
        f"--add-data={os.path.join(root_dir, 'frontend', 'dist')}{sep}frontend_dist",
        f"--add-data={os.path.join(root_dir, 'backend')}{sep}backend",
    ]

    # Include yolov8n.pt if exists
    yolo_model = os.path.join(root_dir, "yolov8n.pt")
    if os.path.exists(yolo_model):
        data_args.append(f"--add-data={yolo_model}{sep}.")

    hidden_imports = [
        "--hidden-import=uvicorn",
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.http.h11_impl",
        "--hidden-import=uvicorn.protocols.http.httptools_impl",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespans",
        "--hidden-import=uvicorn.lifespans.on",
        "--hidden-import=sqlalchemy",
        "--hidden-import=sqlalchemy.dialects.sqlite",
        "--hidden-import=sqlalchemy.dialects.mysql",
        "--hidden-import=pymysql",
        "--hidden-import=fitz",
        "--hidden-import=PIL",
        "--hidden-import=PIL.Image",
        "--hidden-import=reportlab",
        "--hidden-import=pypdf",
        "--hidden-import=webview",
        "--hidden-import=webview.platforms.winforms",
        "--hidden-import=webview.platforms.edgechromium",
        "--hidden-import=clr",
        "--hidden-import=pythonnet",
    ]

    # Check if single file requested (default) or onedir
    mode_arg = "--onefile" if "--onedir" not in sys.argv else "--onedir"

    pyinstaller_args = [
        os.path.join(root_dir, "desktop_app.py"),
        "--name=SecurityCertificateSystem",
        "--noconfirm",
        mode_arg,
        "--windowed", # Windows GUI mode
        f"--paths={os.path.join(root_dir, 'backend')}",
        *data_args,
        *hidden_imports,
    ]

    print("\n[3/3] Running PyInstaller Compiler...")
    print(f"  Mode: {mode_arg}")
    print("  Command: python -m PyInstaller " + " ".join(pyinstaller_args[:5]) + " ...")
    PyInstaller.__main__.run(pyinstaller_args)

    if mode_arg == "--onefile":
        output_exe = os.path.join(root_dir, "dist", "SecurityCertificateSystem.exe")
    else:
        output_exe_dir = os.path.join(root_dir, "dist", "SecurityCertificateSystem")
        output_exe = os.path.join(output_exe_dir, "SecurityCertificateSystem.exe")
        for folder in ["uploads", "reports", "database"]:
            os.makedirs(os.path.join(output_exe_dir, folder), exist_ok=True)

    print("\n" + "=" * 75)
    print("  SUCCESS! Standalone Desktop Executable (.exe) Built Successfully!")
    print(f"  Location: {output_exe}")
    print("=" * 75)

if __name__ == "__main__":
    build()
