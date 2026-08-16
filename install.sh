#!/bin/bash
# ============================================================
# LajuQ F&B Order System — Skrip Pemasangan & Pelancaran (Linux/macOS)
# ============================================================

set -e

echo "============================================================"
echo "         LAJUQ F&B ORDER SYSTEM - PEMASANGAN SISTEM"
echo "============================================================"
echo ""

# 1. Semak sama ada Docker terpasang
echo "[*] Langkah 1/5: Menyemak pemasangan Docker..."
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
echo "[*] Langkah 2/5: Menyemak status enjin Docker..."
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
echo "[*] Langkah 3/5: Menyemak fail konfigurasi (.env)..."
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
echo "[*] Langkah 4/5: Menyemak penggunaan Port 5000..."
PORT_5000_USED=false
if command -v lsof &> /dev/null; then
    if lsof -i :5000 >/dev/null 2>&1; then PORT_5000_USED=true; fi
elif command -v ss &> /dev/null; then
    if ss -tlpn | grep -q ":5000"; then PORT_5000_USED=true; fi
fi

if [ "$PORT_5000_USED" = true ]; then
    if ! docker ps --filter "name=lajuq-system" --format "{{.Names}}" | grep -q "lajuq-system"; then
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

# 5. Jalankan Container Docker
echo ""
echo "[*] Langkah 5/5: Memulakan sistem LajuQ..."
docker compose up -d --build

echo ""
echo "[*] Menunggu server bersedia..."
sleep 5

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

# Cuba buka browser secara automatik mengikut OS
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000/staff" 2>/dev/null || true
elif command -v open &> /dev/null; then
    open "http://localhost:5000/staff" 2>/dev/null || true
fi
