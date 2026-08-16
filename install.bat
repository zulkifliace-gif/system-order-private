@echo off
setlocal enabledelayedexpansion
title LajuQ - Pemasangan & Pelancaran Sistem

echo ============================================================
echo         LAJUQ F^&B ORDER SYSTEM - PEMASANGAN SISTEM
echo ============================================================
echo.

:: ------------------------------------------------------------
:: 1. SEMAK SAMA ADA DOCKER TERPASANG
:: ------------------------------------------------------------
echo [*] Langkah 1/5: Menyemak pemasangan Docker...
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT] Docker Desktop tidak dijumpai di PC/Laptop anda!
    echo.
    echo Sila muat turun dan pasang Docker Desktop secara percuma dari:
    echo ?? https://www.docker.com/products/docker-desktop/
    echo.
    echo Selepas selesai pasang, buka Docker Desktop dan jalankan
    echo fail install.bat ini semula.
    echo ============================================================
    echo.
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: 2. SEMAK SAMA ADA DOCKER DESKTOP SEDANG BERJALAN (RUNNING)
:: ------------------------------------------------------------
echo [*] Langkah 2/5: Menyemak status enjin Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT] Docker Desktop terpasang tetapi BELUM DIBUKA!
    echo.
    echo Sila buka aplikasi "Docker Desktop" pada Windows anda dan
    echo tunggu sehingga ikon di bawah menunjukkan status "Engine running".
    echo Kemudian, jalankan fail install.bat ini semula.
    echo ============================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Docker Desktop sedia digunakan.

:: ------------------------------------------------------------
:: 3. PERIKSA & CIPTA FAIL .ENV DARIPADA .ENV.EXAMPLE
:: ------------------------------------------------------------
echo.
echo [*] Langkah 3/5: Menyemak fail konfigurasi (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Fail .env baharu berjaya dicipta daripada templat .env.example.
    ) else (
        echo [INFO] Menjana fail .env asas...
        (
            echo PORT=5000
            echo NODE_ENV=production
            echo DB_PATH=/app/fb-order-backend/data/fb_ordering.db
        ) > ".env"
    )
) else (
    echo [OK] Fail .env sedia wujud.
)

:: ------------------------------------------------------------
:: 4. SEMAK KONFLIK PORT 5000
:: ------------------------------------------------------------
echo.
echo [*] Langkah 4/5: Menyemak penggunaan Port 5000 di PC anda...
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    :: Semak sama ada port 5000 digunakan oleh container lajuq sedia ada atau aplikasi lain
    docker ps --filter "name=lajuq-system" --format "{{.Names}}" | findstr "lajuq-system" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ============================================================
        echo [AMARAN] Port 5000 sedang digunakan oleh aplikasi lain di PC ini!
        echo.
        echo Sila pastikan tiada perisian lain menggunakan Port 5000,
        echo ATAU buka fail .env dan tukar PORT=5000 kepada port lain
        echo (contoh: PORT=5050), kemudian jalankan semula install.bat.
        echo ============================================================
        echo.
        pause
        exit /b 1
    )
)
echo [OK] Port 5000 sedia digunakan.

:: ------------------------------------------------------------
:: 5. BINA & JALANKAN CONTAINER DOCKER
:: ------------------------------------------------------------
echo.
echo [*] Langkah 5/5: Memulakan sistem LajuQ melalui Docker Compose...
docker compose up -d --build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [RALAT] Gagal memulakan container Docker. Sila semak log di atas.
    pause
    exit /b 1
)

echo.
echo [*] Menunggu server bersedia...
timeout /t 5 /nobreak >nul

:: ------------------------------------------------------------
:: BUKA PELAYAR WEB SECARA AUTOMATIK
:: ------------------------------------------------------------
echo.
echo ============================================================
echo [BERJAYA] Sistem LajuQ F&B kini SEDANG BERJALAN!
echo.
echo ?? Pautan Sistem:
echo    - Portal Staf / POS / KDS : http://localhost:5000/staff
echo    - Menu Pelanggan (Meja 1) : http://localhost:5000/order?table=1
echo.
echo ------------------------------------------------------------
echo ?? PANDUAN PENTING SANDARAN DATA (BACKUP):
echo    1. Untuk buat sandaran harian: Dwi-klik fail "backup.bat".
echo    2. Salin fail .tar.gz yang terhasil ke Pendrive / Google Drive.
echo    3. Untuk automasi harian: Anda boleh jadualkan "backup.bat"
echo       di Windows Task Scheduler (taskschd.msc) setiap 11:59 malam.
echo.
echo ? AMARAN: Jangan sesekali guna "docker compose down -v"
echo            kerana ia akan memadamkan database anda!
echo ============================================================
echo.

start http://localhost:5000/staff

pause
