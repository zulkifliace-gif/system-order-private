@echo off
setlocal enabledelayedexpansion
title LajuQ - Pemulihan Data (Restore)

echo ============================================================
echo         LAJUQ F^&B SYSTEM - PEMULIHAN DATA (RESTORE)
echo ============================================================
echo.

:: Semak sama ada fail backup wujud dalam folder semasa
set count=0
for %%F in (*.tar.gz) do (
    set /a count+=1
    set "file_!count!=%%F"
)

if %count% EQU 0 (
    echo [RALAT] Tiada fail sandaran (.tar.gz) dijumpai dalam folder ini.
    echo Sila pastikan fail backup lajuq-backup-*.tar.gz berada di folder yang sama.
    echo.
    pause
    exit /b 1
)

echo Senarai fail sandaran yang dijumpai:
echo ------------------------------------------------------------
for /l %%i in (1,1,%count%) do (
    echo   [%%i] !file_%%i!
)
echo ------------------------------------------------------------
echo.

:CHOOSE
set /p "choice=Pilih nombor fail yang ingin dipulihkan (1-%count%) atau tekan [Q] untuk batal: "

if /i "%choice%"=="Q" (
    echo.
    echo Pemulihan dibatalkan.
    echo.
    pause
    exit /b 0
)

:: Sahkan input nombor sah
if not defined file_%choice% (
    echo Pilihan tidak sah. Sila masukkan nombor antara 1 hingga %count%.
    goto CHOOSE
)

set "SELECTED_FILE=!file_%choice%!"

echo.
echo ============================================================
echo [AMARAN] Anda memilih untuk memulihkan:
echo          !SELECTED_FILE!
echo.
echo Data semasa dalam sistem akan DIGANTIKAN dengan fail ini.
echo ============================================================
set /p "confirm=Adakah anda pasti untuk teruskan? (Y/N): "

if /i not "%confirm%"=="Y" (
    echo.
    echo Pemulihan dibatalkan.
    echo.
    pause
    exit /b 0
)

echo.
echo [*] Memberhentikan sistem seketika untuk mengelakkan kunci fail...
docker compose stop lajuq >nul 2>&1 || docker stop lajuq-system >nul 2>&1

echo [*] Sedang mengekstrak pangkalan data dan gambar hidangan...
docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%:/backup" alpine sh -c "rm -rf /backup_data/* /backup_uploads/* && tar xzf \"/backup/!SELECTED_FILE!\" -C /"

if %ERRORLEVEL% EQU 0 (
    echo [*] Memulakan semula sistem LajuQ...
    docker compose up -d >nul 2>&1 || docker start lajuq-system >nul 2>&1
    echo.
    echo ============================================================
    echo [BERJAYA] Data sistem telah berjaya dipulihkan sepenuhnya!
    echo Sistem boleh diakses seperti biasa di:
    echo   http://localhost:5000/staff
    echo ============================================================
) else (
    echo.
    echo [RALAT] Gagal memulihkan data. Sila pastikan Docker Desktop sedang aktif.
    docker compose up -d >nul 2>&1 || docker start lajuq-system >nul 2>&1
)

echo.
pause
