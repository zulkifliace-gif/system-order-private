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
echo Sistem akan membuat salinan keselamatan automatik sebelum memulihkan data.
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
echo [*] Langkah 1/4: Menguji integriti fail sandaran...
docker run --rm -v "%cd%:/backup" alpine tar tzf "/backup/!SELECTED_FILE!" >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [RALAT KRITIKAL] Fail backup rosak atau tidak lengkap (corrupted)!
    echo [BATAL] Pemulihan DIBATALKAN. Data semasa anda TIDAK disentuh.
    echo.
    pause
    exit /b 1
)
echo [OK] Integriti fail sandaran sah dan boleh dibaca.

echo.
echo [*] Langkah 2/4: Memberhentikan sistem seketika...
docker compose stop lajuq >nul 2>&1 || docker stop lajuq-system >nul 2>&1

:: Jana nama fail safety backup
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set SAFETY_FILE=pre-restore-safety-!dt:~0,8!-!dt:~8,6!.tar.gz

echo.
echo [*] Langkah 3/4: Membuat salinan keselamatan data semasa (!SAFETY_FILE!)...
docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%:/backup" alpine tar czf "/backup/!SAFETY_FILE!" -C / backup_data backup_uploads >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [RALAT KRITIKAL] Gagal mencipta salinan keselamatan (!SAFETY_FILE!).
    echo [BATAL] Pemulihan DIBATALKAN demi keselamatan data anda.
    echo         Sila pastikan ruang cakera (disk space) mencukupi.
    echo.
    echo [*] Menghidupkan semula sistem LajuQ...
    docker compose up -d >nul 2>&1 || docker start lajuq-system >nul 2>&1
    pause
    exit /b 1
)
echo [OK] Salinan keselamatan berjaya dicipta (!SAFETY_FILE!).

echo.
echo [*] Langkah 4/4: Memulihkan pangkalan data dan gambar hidangan...
docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%:/backup" alpine sh -c "rm -rf /backup_data/* /backup_uploads/* && tar xzf \"/backup/!SELECTED_FILE!\" -C /"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [*] Memulakan semula sistem LajuQ...
    docker compose up -d >nul 2>&1 || docker start lajuq-system >nul 2>&1
    echo.
    echo ============================================================
    echo [BERJAYA] Data sistem telah berjaya dipulihkan sepenuhnya!
    echo Salinan keselamatan data sebelumnya disimpan sebagai:
    echo   !SAFETY_FILE!
    echo.
    echo Sistem sedia diakses seperti biasa di:
    echo   http://localhost:5000/staff
    echo ============================================================
) else (
    echo.
    echo [RALAT] Gagal mengekstrak data. Memulihkan semula data asal dari !SAFETY_FILE!...
    docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%:/backup" alpine sh -c "tar xzf \"/backup/!SAFETY_FILE!\" -C /"
    docker compose up -d >nul 2>&1 || docker start lajuq-system >nul 2>&1
    echo [MAKLUMAN] Data asal telah dipulihkan semula untuk keselamatan.
)

echo.
pause
