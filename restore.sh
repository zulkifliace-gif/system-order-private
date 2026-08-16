#!/bin/bash
# ============================================================
# LajuQ F&B System — Skrip Pemulihan Data (Linux / macOS)
# Dilengkapi Ujian Integriti Arkib & Auto Safety-Backup
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
echo "Sistem akan membuat salinan keselamatan automatik sebelum memulihkan data."
echo "============================================================"
read -rp "Adakah anda pasti untuk teruskan? (y/n): " confirm

if [[ ! "$confirm" =~ ^[yY]$ ]]; then
    echo "Pemulihan dibatalkan."
    exit 0
fi

echo ""
echo "[*] Langkah 1/4: Menguji integriti fail sandaran..."
if ! docker run --rm -v "$(pwd)":/backup alpine tar tzf "/backup/${SELECTED_FILE}" >/dev/null 2>&1; then
    echo ""
    echo "[RALAT KRITIKAL] Fail backup rosak atau tidak lengkap (corrupted)!"
    echo "[BATAL] Pemulihan DIBATALKAN. Data semasa anda TIDAK disentuh."
    echo ""
    exit 1
fi
echo "[OK] Integriti fail sandaran sah dan boleh dibaca."

echo ""
echo "[*] Langkah 2/4: Memberhentikan sistem seketika..."
docker compose stop lajuq 2>/dev/null || docker stop lajuq-system 2>/dev/null || true

SAFETY_FILE="pre-restore-safety-$(date +%Y%m%d-%H%M%S).tar.gz"

echo ""
echo "[*] Langkah 3/4: Membuat salinan keselamatan data semasa (${SAFETY_FILE})..."
if ! docker run --rm \
  -v lajuq_data:/backup_data \
  -v lajuq_uploads:/backup_uploads \
  -v "$(pwd)":/backup \
  alpine tar czf "/backup/${SAFETY_FILE}" -C / backup_data backup_uploads >/dev/null 2>&1; then

    echo ""
    echo "[RALAT KRITIKAL] Gagal mencipta salinan keselamatan (${SAFETY_FILE})!"
    echo "[BATAL] Pemulihan DIBATALKAN demi keselamatan data anda."
    echo "        Sila pastikan ruang cakera (disk space) mencukupi."
    echo ""
    echo "[*] Menghidupkan semula sistem LajuQ..."
    docker compose up -d 2>/dev/null || docker start lajuq-system 2>/dev/null || true
    exit 1
fi
echo "[OK] Salinan keselamatan berjaya dicipta (${SAFETY_FILE})."

echo ""
echo "[*] Langkah 4/4: Memulihkan pangkalan data dan gambar hidangan..."
if docker run --rm \
  -v lajuq_data:/backup_data \
  -v lajuq_uploads:/backup_uploads \
  -v "$(pwd)":/backup \
  alpine sh -c "rm -rf /backup_data/* /backup_uploads/* && tar xzf \"/backup/${SELECTED_FILE}\" -C /"; then

    echo "[*] Memulakan semula sistem LajuQ..."
    docker compose up -d 2>/dev/null || docker start lajuq-system 2>/dev/null || true

    echo ""
    echo "============================================================"
    echo "[BERJAYA] Data sistem telah berjaya dipulihkan sepenuhnya!"
    echo "Salinan keselamatan data sebelumnya disimpan sebagai:"
    echo "  ${SAFETY_FILE}"
    echo ""
    echo "Sistem sedia diakses seperti biasa di:"
    echo "  http://localhost:5000/staff"
    echo "============================================================"
    echo ""
else
    echo ""
    echo "[RALAT] Gagal mengekstrak data. Memulihkan semula data asal dari ${SAFETY_FILE}..."
    docker run --rm \
      -v lajuq_data:/backup_data \
      -v lajuq_uploads:/backup_uploads \
      -v "$(pwd)":/backup \
      alpine sh -c "tar xzf \"/backup/${SAFETY_FILE}\" -C /" || true
    docker compose up -d 2>/dev/null || docker start lajuq-system 2>/dev/null || true
    echo "[MAKLUMAN] Data asal telah dipulihkan semula untuk keselamatan."
    exit 1
fi
