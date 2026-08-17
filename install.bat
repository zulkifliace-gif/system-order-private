@echo off
setlocal enabledelayedexpansion
title LajuQ - Pemasangan dan Pelancaran Sistem

:: Pastikan laluan Docker ada dalam PATH
if exist "C:\Program Files\Docker\Docker\resources\bin" (
    set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources\bin"
)
if exist "C:\Program Files\Docker\Docker\resources" (
    set "PATH=%PATH%;C:\Program Files\Docker\Docker\resources"
)

echo ============================================================
echo         LAJUQ F^&B ORDER SYSTEM - PEMASANGAN SISTEM
echo ============================================================
echo.

:: ------------------------------------------------------------
:: 1. SEMAK DOCKER TERPASANG
:: ------------------------------------------------------------
echo [*] Langkah 1/5: Menyemak aplikasi Docker Desktop...
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT] Arahan Docker tidak dikesan di PC ini.
    echo Sila pastikan Docker Desktop telah siap dipasang.
    echo ============================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Docker Desktop dikesan.

:: ------------------------------------------------------------
:: 2. SEMAK ENJIN DOCKER SEDANG BERJALAN
:: ------------------------------------------------------------
echo.
echo [*] Langkah 2/5: Menyemak status enjin Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [RALAT] Docker Desktop belum bersedia atau belum dibuka.
    echo Sila buka aplikasi Docker Desktop dan tunggu sehingga status
    echo di bahagian bawah kiri menunjukkan "Engine running".
    echo ============================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Enjin Docker sedang berjalan.

:: ------------------------------------------------------------
:: 3. PENGESANAN FAST-PATH (JIKA SISTEM SUDAH BERJALAN)
:: ------------------------------------------------------------
docker ps --filter "name=lajuq-system" --filter "status=running" --format "{{.Names}}" 2>nul | findstr /i "lajuq-system" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [OK] Sistem LajuQ sudah sedia aktif dan sedang berjalan!
    echo [*] Membuka pelayar web terus ke Portal Staf...
    echo ============================================================
    start http://localhost:5000/staff
    timeout /t 3 /nobreak >nul
    exit /b 0
)

:: ------------------------------------------------------------
:: 4. PERIKSA FAIL .ENV
:: ------------------------------------------------------------
echo.
echo [*] Langkah 3/5: Menyemak konfigurasi persekitaran (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Fail .env baharu dicipta daripada templat .env.example.
    ) else (
        (
            echo PORT=5000
            echo NODE_ENV=production
            echo DB_PATH=/app/fb-order-backend/data/fb_ordering.db
        ) > ".env"
        echo [INFO] Fail .env asas dicipta.
    )
) else (
    echo [OK] Fail .env sedia wujud.
)

:: ------------------------------------------------------------
:: 5. IMPORT DOCKER IMAGE PRA-BINA (LAJUQ-SYSTEM.TAR)
:: ------------------------------------------------------------
echo.
echo [*] Langkah 4/5: Menyemak imej sistem LajuQ di dalam Docker...
docker image inspect lajuq-system:latest >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "lajuq-system.tar" (
        echo [*] Mengimport imej pra-bina lajuq-system.tar...
        echo     (Sila tunggu kira-kira 10-20 saat...)
        docker load -i lajuq-system.tar
        if %ERRORLEVEL% NEQ 0 (
            echo [RALAT] Gagal memuatkan lajuq-system.tar. Sila pastikan fail lengkap.
            pause
            exit /b 1
        )
        echo [OK] Imej berjaya dimuatkan ke dalam Docker!
    ) else (
        echo [RALAT] Fail lajuq-system.tar tidak dijumpai dalam folder ini.
        pause
        exit /b 1
    )
) else (
    echo [OK] Imej lajuq-system sedia wujud di dalam Docker.
)

:: ------------------------------------------------------------
:: 6. JALANKAN CONTAINER MELALUI DOCKER COMPOSE
:: ------------------------------------------------------------
echo.
echo [*] Langkah 5/5: Memulakan sistem LajuQ...

set DOCKER_PROFILES=
findstr /i "CLOUDFLARE_TUNNEL_TOKEN=ey" .env >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set DOCKER_PROFILES=--profile tunnel
    echo [OK] Token Cloudflare Named Tunnel dikesan. Mengaktifkan mod HTTPS Online...
) else (
    echo [INFO] Berjalan dalam mod LOKAL SAHAJA (http://localhost:5000).
)

docker compose %DOCKER_PROFILES% up -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [RALAT] Gagal memulakan servis Docker Compose.
    pause
    exit /b 1
)

echo.
echo [*] Menunggu server bersedia...
timeout /t 3 /nobreak >nul

:: ------------------------------------------------------------
:: BUKA PELAYAR WEB SECARA AUTOMATIK
:: ------------------------------------------------------------
echo.
echo ============================================================
echo [BERJAYA] Sistem LajuQ F^&B kini SEDANG BERJALAN!
echo.
echo [*] Pautan Sistem:
echo     - Portal Staf / POS / KDS : http://localhost:5000/staff
echo     - Menu Pelanggan (Meja 1) : http://localhost:5000/order?table=1
echo.
echo ------------------------------------------------------------
echo [i] PANDUAN PENTING SANDARAN DATA (BACKUP):
echo     1. Untuk buat sandaran harian: Dwi-klik fail "backup.bat".
echo     2. Salin fail .tar.gz yang terhasil ke Pendrive / Google Drive.
echo.
echo [!] AMARAN: Jangan sesekali guna "docker compose down -v"
echo             kerana ia akan memadamkan database anda!
echo ============================================================
echo.

start http://localhost:5000/staff

echo Tekan sebarang kekunci untuk menutup tetingkap ini...
pause >nul
