# Comprueba que todo lo necesario esta instalado y lanza el generador de posts.
# No se ejecuta con doble clic directamente: usa blog.cmd (o el comando "blog" tras instalar.cmd).

. "$PSScriptRoot\_bootstrap.ps1"

Refresh-Path

if (-not (Ensure-Git)) { Read-Host "Pulsa Enter para cerrar"; exit 1 }
if (-not (Ensure-Python)) { Read-Host "Pulsa Enter para cerrar"; exit 1 }

Ensure-EnvFile -ScriptsDir $PSScriptRoot

Set-Location (Join-Path $PSScriptRoot "..")
python "$PSScriptRoot\nuevo_post.py"

Read-Host "`nPulsa Enter para cerrar esta ventana"
