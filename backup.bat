@echo off
setlocal enabledelayedexpansion
title LajuQ - Sistem Sandaran Data (Backup)

if exist "C:\Program Files\Docker\Docker\resources\bin" (
    set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
)

echo ============================================================
echo          LAJUQ F^&B SYSTEM - SANDARAN DATA (BACKUP)
echo ============================================================
echo.

:: Dapatkan cap masa tarikh dan masa tempatan
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
if "%datetime%"=="" (
    set YYYY=%date:~10,4%
    set MM=%date:~4,2%
    set DD=%date:~7,2%
    set HH=%time:~0,2%
    set Min=%time:~3,2%
    set SS=%time:~6,2%
    set BACKUP_FILE=lajuq-backup-%YYYY%%MM%%DD%-%HH%%Min%%SS%.tar.gz
) else (
    set YYYY=!datetime:~0,4!
    set MM=!datetime:~4,2!
    set DD=!datetime:~6,2!
    set HH=!datetime:~8,2!
    set Min=!datetime:~10,2!
    set SS=!datetime:~12,2!
    set BACKUP_FILE=lajuq-backup-!YYYY!!MM!!DD!-!HH!!Min!!SS!.tar.gz
)
set BACKUP_FILE=%BACKUP_FILE: =0%

echo [*] Memulakan sandaran data SQLite dan fail gambar menu...
echo [*] Fail sasaran: %BACKUP_FILE%
echo.

docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%":/backup alpine tar czf "/backup/%BACKUP_FILE%" -C / backup_data backup_uploads

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [BERJAYA] Sandaran data selesai dengan jayanya!
    echo Fail disimpan di: %cd%\%BACKUP_FILE%
    echo.
    echo Cadangan: Salin fail ini ke Pendrive atau Google Drive anda.
    echo ============================================================
) else (
    echo.
    echo [RALAT] Gagal membuat sandaran data. Sila pastikan Docker sedang aktif.
)

echo.
pause
