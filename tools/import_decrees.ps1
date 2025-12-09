Param(
  [string]$RelatedLawCode = "52/2014/QH13",
  [string]$DbHost = "mysql",
  [int]$DbPort = 3306,
  [string]$DbName = "laws",
  [string]$DbUser = "app",
  [string]$DbPass = "app",
  [string]$EffectiveStart = "2015-01-01"
)

# This script is intended to be run inside the rag-service container, or adjust paths accordingly.
function Import-Decree($path, $title){
  Write-Host "Importing: $path"
  python /app/import_pdf.py `
    --file $path `
    --title $title `
    --doc-type DECREE `
    --related-law-code $RelatedLawCode `
    --effective-start $EffectiveStart `
    --replace `
    --db-host $DbHost --db-port $DbPort --db-name $DbName --db-user $DbUser --db-pass $DbPass
}

Import-Decree "/app/nghi-dinh-thu-thai-trong-ong-nghiem.pdf" "Nghị định (IVF & hỗ trợ sinh sản)"
Import-Decree "/app/sua-doi-nghi-dinh-thu-tinh.pdf" "Nghị định sửa đổi hỗ trợ sinh sản"
Import-Decree "/app/nghidinhphat-vi-pham-hanh-chinh.pdf" "Nghị định xử phạt vi phạm hành chính (lĩnh vực HN&GĐ)"
Import-Decree "/app/cach-thi-hanh-luat.pdf" "Nghị định quy định chi tiết thi hành Luật HN&GĐ"

Write-Host "Done. Now re-embed:"
Write-Host "  docker compose cp tools/embed_laws.py rag-service:/app/embed_laws.py"
Write-Host "  docker compose exec rag-service bash -lc \"DB_HOST=$DbHost DB_PORT=$DbPort DB_NAME=$DbName DB_USER=$DbUser DB_PASS=$DbPass CHROMA_PATH=/data/chroma python /app/embed_laws.py\""

