@echo off
setlocal enabledelayedexpansion
title LajuQ - Sistem Sandaran Data (Backup)

echo ============================================================
echo          LAJUQ F^&B SYSTEM - SANDARAN DATA (BACKUP)
echo ============================================================
echo.

:: Dapatkan cap masa tarikh dan masa tempatan
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set YYYY=!datetime:~0,4!
set MM=!datetime:~4,2!
set DD=!datetime:~6,2!
set HH=!datetime:~8,2!
set Min=!datetime:~10,2!
set SS=!datetime:~12,2!

set BACKUP_FILE=lajuq-backup-!YYYY!!MM!!DD!-!HH!!Min!!SS!.tar.gz

echo [*] Sedang menyalin pangkalan data SQLite dan gambar hidangan...
echo [*] Fail sasaran: !BACKUP_FILE!
echo.

:: Jalankan Docker container sementara untuk mampatkan volume ke fail .tar.gz
docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%:/backup" alpine tar czf "/backup/!BACKUP_FILE!" -C / backup_data backup_uploads

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [BERJAYA] Sandaran data telah selesai!
    echo Fail disimpan sebagai: !BACKUP_FILE!
    echo.
    echo TIP: Sila salin fail ini ke Pendrive atau Google Drive anda
    echo      sebagai salinan keselamatan luar talian.
    echo ============================================================
) else (
    echo.
    echo [RALAT] Gagal membuat sandaran. Sila pastikan Docker Desktop sedang berjalan.
)

echo.
pause
