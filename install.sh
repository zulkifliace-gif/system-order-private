#!/bin/bash
# ============================================================
# LajuQ F&B Order System — Skrip Pemasangan & Pelancaran (Linux/macOS)
# ============================================================

set -e

echo "============================================================"
echo "         LAJUQ F&B ORDER SYSTEM - PEMASANGAN SISTEM"
echo "============================================================"
echo ""

# 0. Fast-Path: Jika container lajuq-system sudah berjalan
if docker ps --filter "name=lajuq-system" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "lajuq-system"; then
    echo "[OK] Sistem LajuQ sudah pun aktif dan sedang berjalan!"
    echo "[*] Membuka pelayar web terus ke Portal Staf..."
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5000/staff" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        open "http://localhost:5000/staff" 2>/dev/null || true
    fi
    exit 0
fi

# 1. Semak sama ada Docker terpasang
echo "[*] Langkah 1/6: Menyemak pemasangan Docker..."
if ! command -v docker &> /dev/null; then
    echo ""
    echo "============================================================"
    echo "[RALAT] Docker tidak dijumpai di peranti anda!"
    echo ""
    echo "Sila muat turun dan pasang Docker secara percuma dari:"
    echo "👉 https://www.docker.com/products/docker-desktop/"
    echo "============================================================"
    echo ""
    exit 1
fi

# 2. Semak sama ada Docker Daemon sedang berjalan
echo "[*] Langkah 2/6: Menyemak status enjin Docker..."
if ! docker info &> /dev/null; then
    echo ""
    echo "============================================================"
    echo "[RALAT] Enjin Docker BELUM BERJALAN!"
    echo ""
    echo "Sila buka/mulakan perkhidmatan Docker (contoh: sudo systemctl start docker)"
    echo "dan jalankan skrip ini semula."
    echo "============================================================"
    echo ""
    exit 1
fi
echo "[OK] Docker sedia digunakan."

# 3. Semak & Cipta fail .env
echo ""
echo "[*] Langkah 3/6: Menyemak fail konfigurasi (.env)..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[INFO] Fail .env baharu dicipta daripada templat .env.example."
    else
        cat << 'EOF' > .env
PORT=5000
NODE_ENV=production
DB_PATH=/app/fb-order-backend/data/fb_ordering.db
EOF
    fi
else
    echo "[OK] Fail .env sedia wujud."
fi

# 4. Semak konflik port 5000
echo ""
echo "[*] Langkah 4/6: Menyemak penggunaan Port 5000..."
PORT_5000_USED=false
if command -v lsof &> /dev/null; then
    if lsof -i :5000 >/dev/null 2>&1; then PORT_5000_USED=true; fi
elif command -v ss &> /dev/null; then
    if ss -tlpn | grep -q ":5000"; then PORT_5000_USED=true; fi
fi

if [ "$PORT_5000_USED" = true ]; then
    if ! docker ps --filter "name=lajuq-system" --format "{{.Names}}" 2>/dev/null | grep -q "lajuq-system"; then
        echo ""
        echo "============================================================"
        echo "[AMARAN] Port 5000 sedang digunakan oleh aplikasi lain!"
        echo "Sila tutup aplikasi tersebut atau tukar PORT di dalam fail .env."
        echo "============================================================"
        echo ""
        exit 1
    fi
fi
echo "[OK] Port 5000 sedia digunakan."

# 5. Import Docker Image Pra-Bina (lajuq-system.tar)
echo ""
echo "[*] Langkah 5/6: Menyemak pakej imej sistem LajuQ..."
if ! docker image inspect lajuq-system:latest >/dev/null 2>&1; then
    if [ -f "lajuq-system.tar" ]; then
        echo "[*] Mengimport imej pra-bina dari lajuq-system.tar ke dalam Docker..."
        if ! docker load -i lajuq-system.tar; then
            echo "[RALAT] Gagal memuatkan imej lajuq-system.tar. Sila pastikan fail tidak rosak."
            exit 1
        fi
        echo "[OK] Imej sistem berjaya dimuatkan ke dalam Docker."
    else
        if [ -f "Dockerfile" ]; then
            echo "[*] lajuq-system.tar tidak dijumpai. Membina imej daripada source..."
            docker build -t lajuq-system:latest .
        else
            echo ""
            echo "[RALAT] Fail pakej 'lajuq-system.tar' tidak dijumpai di dalam folder ini!"
            echo "Sila pastikan fail lajuq-system.tar diletakkan bersama fail install.sh."
            exit 1
        fi
    fi
else
    echo "[OK] Imej lajuq-system sedia wujud di dalam Docker."
fi

# 6. Jalankan Container Docker (dengan auto-detect Cloudflare Tunnel)
echo ""
echo "[*] Langkah 6/6: Memulakan sistem LajuQ..."

DOCKER_PROFILES=""
if grep -q "CLOUDFLARE_TUNNEL_TOKEN=ey" .env 2>/dev/null; then
    DOCKER_PROFILES="--profile tunnel"
    echo "[OK] Token Cloudflare Named Tunnel dikesan. Mengaktifkan mod HTTPS Online..."
else
    echo "[INFO] CLOUDFLARE_TUNNEL_TOKEN belum diisi di dalam fail .env."
    echo "       Sistem akan berjalan dalam mod LOKAL SAHAJA (http://localhost:5000)."
    echo "       Untuk akses online pelanggan & QR Code di luar kedai,"
    echo "       sila masukkan token Cloudflare Tunnel di dalam fail .env."
fi

docker compose $DOCKER_PROFILES up -d

echo ""
echo "[*] Menunggu server bersedia..."
sleep 3

echo ""
echo "============================================================"
echo "[BERJAYA] Sistem LajuQ F&B kini SEDANG BERJALAN!"
echo ""
echo "🌐 Pautan Sistem:"
echo "   - Portal Staf / POS / KDS : http://localhost:5000/staff"
echo "   - Menu Pelanggan (Meja 1) : http://localhost:5000/order?table=1"
echo ""
echo "------------------------------------------------------------"
echo "💡 PANDUAN PENTING SANDARAN DATA (BACKUP):"
echo "   1. Untuk buat sandaran harian: Jalankan './backup.sh'."
echo "   2. Salin fail .tar.gz yang terhasil ke Pendrive / Cloud Storage."
echo "   3. Untuk automasi harian: Tambah cron job (crontab -e):"
echo "      0 0 * * * cd $(pwd) && ./backup.sh"
echo ""
echo "⛔ AMARAN: Jangan sesekali guna 'docker compose down -v'"
echo "           kerana ia akan memadamkan database anda!"
echo "============================================================"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000/staff" 2>/dev/null || true
elif command -v open &> /dev/null; then
    open "http://localhost:5000/staff" 2>/dev/null || true
fi
