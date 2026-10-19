@echo off
title Build Security Certificate System Executable (.exe)
cd /D "%~dp0"

echo ==============================================================================
echo   Building SIRA Security Certificate System Desktop Software (.exe)
echo ==============================================================================
echo.

python build_exe.py

echo.
echo ==============================================================================
echo  Build complete! Look for the .exe in: dist\SecurityCertificateSystem\
echo ==============================================================================
pause
