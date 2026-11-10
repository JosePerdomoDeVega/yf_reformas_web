# Instalacion de una sola vez: deja preparado el comando "blog" para cualquier
# ventana de PowerShell que abras a partir de ahora. Se ejecuta con instalar.cmd.

. "$PSScriptRoot\_bootstrap.ps1"

Write-Host "Preparando todo para poder publicar en el blog..."
Write-Host ""

Refresh-Path
Ensure-Git | Out-Null
Ensure-Python | Out-Null
Ensure-EnvFile -ScriptsDir $PSScriptRoot

$blogScript = Join-Path $PSScriptRoot "blog.ps1"
$marker = "# --- YF Reformas: comando blog ---"
$markerEnd = "# --- fin comando blog ---"
$block = @"
$marker
function blog { & powershell -NoProfile -ExecutionPolicy Bypass -File "$blogScript" }
$markerEnd
"@

$perfiles = @(
    "$HOME\Documents\WindowsPowerShell\profile.ps1",
    "$HOME\Documents\PowerShell\profile.ps1"
)

foreach ($perfil in $perfiles) {
    $dir = Split-Path $perfil
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if (-not (Test-Path $perfil)) { New-Item -ItemType File -Path $perfil -Force | Out-Null }
    $contenido = Get-Content $perfil -Raw -ErrorAction SilentlyContinue
    if ($contenido -and $contenido.Contains($marker)) {
        $patron = [regex]::Escape($marker) + "(.|\n|\r)*?" + [regex]::Escape($markerEnd)
        $contenido = [regex]::Replace($contenido, $patron, $block)
        Set-Content $perfil $contenido
    } else {
        Add-Content $perfil "`n$block`n"
    }
}

Write-Host ""
Write-Host "Todo listo."
Write-Host "Cierra esta ventana y abre una nueva de PowerShell."
Write-Host "Desde ahora, para publicar un post solo tienes que escribir: blog"
Read-Host "Pulsa Enter para cerrar"
