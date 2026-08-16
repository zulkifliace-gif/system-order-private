#!/bin/bash
# ============================================================
# LajuQ F&B System — Skrip Pemulihan Data (Linux / macOS)
# ============================================================

set -e

echo "============================================================"
echo "        LAJUQ F&B SYSTEM - PEMULIHAN DATA (RESTORE)"
echo "============================================================"
echo ""

# Cari semua fail .tar.gz dalam folder semasa
shopt -s nullglob
FILES=(*.tar.gz)
shopt -u nullglob

if [ ${#FILES[@]} -eq 0 ]; then
    echo "[RALAT] Tiada fail sandaran (.tar.gz) dijumpai dalam folder ini."
    echo "Sila pastikan fail backup lajuq-backup-*.tar.gz berada di folder yang sama."
    echo ""
    exit 1
fi

echo "Senarai fail sandaran yang dijumpai:"
echo "------------------------------------------------------------"
for i in "${!FILES[@]}"; do
    FILE_SIZE=$(ls -lh "${FILES[$i]}" | awk '{print $5}')
    echo "  [$((i+1))] ${FILES[$i]} (${FILE_SIZE})"
done
echo "------------------------------------------------------------"
echo ""

while true; do
    read -rp "Pilih nombor fail yang ingin dipulihkan (1-${#FILES[@]}) atau tekan [Q] untuk batal: " choice
    if [[ "$choice" =~ ^[qQ]$ ]]; then
        echo "Pemulihan dibatalkan."
        exit 0
    fi
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#FILES[@]}" ]; then
        SELECTED_FILE="${FILES[$((choice-1))]}"
        break
    else
        echo "Pilihan tidak sah. Sila masukkan nombor antara 1 hingga ${#FILES[@]}."
    fi
done

echo ""
echo "============================================================"
echo "[AMARAN] Anda memilih untuk memulihkan:"
echo "         ${SELECTED_FILE}"
echo ""
echo "Data semasa dalam sistem akan DIGANTIKAN dengan fail ini."
echo "============================================================"
read -rp "Adakah anda pasti untuk teruskan? (y/n): " confirm

if [[ ! "$confirm" =~ ^[yY]$ ]]; then
    echo "Pemulihan dibatalkan."
    exit 0
fi

echo ""
echo "[*] Memberhentikan sistem seketika untuk mengelakkan kunci fail..."
docker compose stop lajuq 2>/dev/null || docker stop lajuq-system 2>/dev/null || true

echo "[*] Sedang mengekstrak pangkalan data dan gambar hidangan..."
docker run --rm \
  -v lajuq_data:/backup_data \
  -v lajuq_uploads:/backup_uploads \
  -v "$(pwd)":/backup \
  alpine sh -c "rm -rf /backup_data/* /backup_uploads/* && tar xzf \"/backup/${SELECTED_FILE}\" -C /"

echo "[*] Memulakan semula sistem LajuQ..."
docker compose up -d 2>/dev/null || docker start lajuq-system 2>/dev/null || true

echo ""
echo "============================================================"
echo "[BERJAYA] Data sistem telah berjaya dipulihkan sepenuhnya!"
echo "Sistem boleh diakses seperti biasa di:"
echo "  http://localhost:5000/staff"
echo "============================================================"
echo ""
