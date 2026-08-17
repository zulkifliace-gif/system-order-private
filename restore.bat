@echo off
setlocal enabledelayedexpansion
title LajuQ - Pemulihan Data (Restore)

if exist "C:\Program Files\Docker\Docker\resources\bin" (
    set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
)

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
for /L %%i in (1,1,%count%) do (
    echo   [%%i] !file_%%i!
)
echo ------------------------------------------------------------
echo.

:CHOOSE_FILE
set "CHOICE="
set /p "CHOICE=Pilih nombor fail yang ingin dipulihkan (1-%count%) atau 'Q' untuk batal: "

if /i "%CHOICE%"=="Q" (
    echo.
    echo [*] Proses pemulihan dibatalkan oleh pengguna.
    pause
    exit /b 0
)

:: Sahkan input adalah nombor yang sah
echo %CHOICE%| findstr /r "^[1-9][0-9]*$" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [PILIHAN TIDAK SAH] Sila masukkan nombor antara 1 hingga %count%.
    goto CHOOSE_FILE
)

if %CHOICE% GTR %count% (
    echo [PILIHAN TIDAK SAH] Nombor %CHOICE% tiada dalam senarai.
    goto CHOOSE_FILE
)

set "SELECTED_FILE=!file_%CHOICE%!"
echo.
echo Anda telah memilih: %SELECTED_FILE%
echo.

:: ------------------------------------------------------------
:: LAPISAN KESELAMATAN 1: SAHKAN INTEGRITI ARKIB TERLEBIH DAHULU
:: ------------------------------------------------------------
echo [*] Langkah 1/5: Menguji integriti fail sandaran...
docker run --rm -v "%cd%":/backup alpine tar tzf "/backup/%SELECTED_FILE%" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT KRITIKAL] Fail backup %SELECTED_FILE% rosak/corrupt!
    echo Restore DIBATALKAN. Data semasa anda TIDAK disentuh.
    echo Sila gunakan fail backup lain yang tidak rosak.
    echo ============================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Fail backup sah dan tidak rosak.

:: ------------------------------------------------------------
:: LAPISAN KESELAMATAN 2: PENGESAHAN DUA KALI (DOUBLE CONFIRMATION)
:: ------------------------------------------------------------
echo.
echo ============================================================
echo [AMARAN] Tindakan ini akan menggantikan pangkalan data dan
echo fail gambar semasa dengan kandungan daripada:
echo   %SELECTED_FILE%
echo ============================================================
set "CONFIRM="
set /p "CONFIRM=Adakah anda benar-benar pasti untuk teruskan? (Taip 'Y' untuk Ya, 'N' untuk Batal): "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo [*] Pemulihan data dibatalkan oleh pengguna.
    pause
    exit /b 0
)

:: ------------------------------------------------------------
:: LAPISAN KESELAMATAN 3: AUTO-BACKUP DATA SEMASA DAHULU
:: ------------------------------------------------------------
echo.
echo [*] Langkah 2/5: Mencipta salinan keselamatan data semasa (pre-restore safety)...
set "SAFETY_FILE=pre-restore-safety-backup.tar.gz"
docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%":/backup alpine tar czf "/backup/%SAFETY_FILE%" -C / backup_data backup_uploads >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT] Gagal mencipta salinan keselamatan data semasa!
    echo Restore DIBATALKAN demi keselamatan data anda.
    echo Sila pastikan ada ruang cakera mencukupi dan Docker aktif.
    echo ============================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Salinan keselamatan dicipta: %SAFETY_FILE%

:: ------------------------------------------------------------
:: LANGKAH 4: HENTIKAN CONTAINER
:: ------------------------------------------------------------
echo.
echo [*] Langkah 3/5: Menghentikan servis untuk keselamatan SQLite...
docker compose down >nul 2>&1

:: ------------------------------------------------------------
:: LANGKAH 5: PADAM DATA LAMA & EXTRACT DATA BAHARU (DENGAN AUTO-ROLLBACK)
:: ------------------------------------------------------------
echo.
echo [*] Langkah 4/5: Memulihkan pangkalan data dan gambar...
docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%":/backup alpine sh -c "rm -rf /backup_data/* /backup_uploads/* && tar xzf \"/backup/%SELECTED_FILE%\" -C /"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT] Gagal mengekstrak fail backup!
    echo Melakukan pemulihan kecemasan (Auto-Rollback) ke data asal...
    docker run --rm -v lajuq_data:/backup_data -v lajuq_uploads:/backup_uploads -v "%cd%":/backup alpine sh -c "rm -rf /backup_data/* /backup_uploads/* && tar xzf \"/backup/%SAFETY_FILE%\" -C /"
    echo Data asal berjaya dipulihkan. Sila periksa fail backup anda.
    echo ============================================================
    docker compose up -d
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: LANGKAH 6: MULAKAN SEMULA CONTAINER
:: ------------------------------------------------------------
echo.
echo [*] Langkah 5/5: Memulakan semula sistem LajuQ...
docker compose up -d

echo.
echo ============================================================
echo [BERJAYA] Pemulihan data selesai dengan jayanya!
echo Sistem LajuQ kini beroperasi dengan data daripada:
echo   %SELECTED_FILE%
echo ============================================================
echo.
pause
