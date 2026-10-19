# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['C:/Users/faiza/OneDrive/Desktop/COLLEGE/Senior Design/Code/New folder/SecurityCertificateSystem/desktop_app.py'],
    pathex=['C:/Users/faiza/OneDrive/Desktop/COLLEGE/Senior Design/Code/New folder/SecurityCertificateSystem/backend'],
    binaries=[],
    datas=[('C:/Users/faiza/OneDrive/Desktop/COLLEGE/Senior Design/Code/New folder/SecurityCertificateSystem/frontend/dist', 'frontend_dist'), ('C:/Users/faiza/OneDrive/Desktop/COLLEGE/Senior Design/Code/New folder/SecurityCertificateSystem/backend', 'backend'), ('C:/Users/faiza/OneDrive/Desktop/COLLEGE/Senior Design/Code/New folder/SecurityCertificateSystem/yolov8n.pt', '.')],
    hiddenimports=['uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.http.h11_impl', 'uvicorn.protocols.http.httptools_impl', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.lifespans', 'uvicorn.lifespans.on', 'sqlalchemy', 'sqlalchemy.dialects.sqlite', 'sqlalchemy.dialects.mysql', 'pymysql', 'fitz', 'PIL', 'PIL.Image', 'reportlab', 'pypdf', 'webview', 'webview.platforms.winforms', 'webview.platforms.edgechromium', 'clr', 'pythonnet'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SecurityCertificateSystem',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SecurityCertificateSystem',
)
