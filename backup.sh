#!/bin/bash
# ============================================================
# LajuQ F&B System — Skrip Sandaran Data (Linux / macOS)
# ============================================================

set -e

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="lajuq-backup-${TIMESTAMP}.tar.gz"

echo "============================================================"
echo "         LAJUQ F&B SYSTEM - SANDARAN DATA (BACKUP)"
echo "============================================================"
echo ""
echo "[*] Sedang menyalin pangkalan data SQLite dan gambar hidangan..."
echo "[*] Fail sasaran: ${BACKUP_FILE}"
echo ""

docker run --rm \
  -v lajuq_data:/backup_data \
  -v lajuq_uploads:/backup_uploads \
  -v "$(pwd)":/backup \
  alpine tar czf "/backup/${BACKUP_FILE}" -C / backup_data backup_uploads

echo ""
echo "============================================================"
echo "[BERJAYA] Sandaran data telah selesai!"
echo "Fail disimpan sebagai: ${BACKUP_FILE}"
echo ""
echo "TIP: Sila salin fail ini ke Pendrive atau Cloud Storage anda"
echo "     sebagai salinan keselamatan luar talian."
echo "============================================================"
echo ""
