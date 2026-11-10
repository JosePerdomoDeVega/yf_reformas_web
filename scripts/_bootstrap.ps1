# Funciones compartidas por instalar.ps1 y blog.ps1. No se ejecuta directamente.

function Refresh-Path {
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

function Test-Winget {
    [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

function Ensure-Git {
    if (Get-Command git -ErrorAction SilentlyContinue) { return $true }
    Write-Host "Git no esta instalado. Instalandolo..."
    if (-not (Test-Winget)) {
        Write-Host "No se encuentra 'winget' en este equipo."
        Write-Host "Instala Git a mano desde https://git-scm.com/download/win y vuelve a intentarlo."
        return $false
    }
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
    if (Get-Command git -ErrorAction SilentlyContinue) { return $true }
    Write-Host "Git se ha instalado pero no se detecta todavia."
    Write-Host "Cierra esta ventana, abre una nueva y vuelve a escribir: blog"
    return $false
}

function Ensure-Python {
    if (Get-Command python -ErrorAction SilentlyContinue) { return $true }
    Write-Host "Python no esta instalado. Instalandolo..."
    if (-not (Test-Winget)) {
        Write-Host "No se encuentra 'winget' en este equipo."
        Write-Host "Instala Python a mano desde https://www.python.org/downloads/"
        Write-Host "(marca la casilla 'Add Python to PATH' durante la instalacion) y vuelve a intentarlo."
        return $false
    }
    $ids = @("Python.Python.3.13", "Python.Python.3.12", "Python.Python.3.11")
    foreach ($id in $ids) {
        winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -eq 0) { break }
    }
    Refresh-Path
    if (Get-Command python -ErrorAction SilentlyContinue) { return $true }
    Write-Host "Python se ha instalado pero no se detecta todavia."
    Write-Host "Cierra esta ventana, abre una nueva y vuelve a escribir: blog"
    return $false
}

function Ensure-EnvFile {
    param($ScriptsDir)
    $envPath = Join-Path $ScriptsDir ".env"
    $examplePath = Join-Path $ScriptsDir ".env.example"
    if (Test-Path $envPath) { return }
    Copy-Item $examplePath $envPath
    Write-Host ""
    Write-Host "Es la primera vez: hace falta una clave gratuita de OpenRouter para generar los posts."
    Write-Host "1. Entra en https://openrouter.ai y crea una cuenta gratuita."
    Write-Host "2. Copia tu clave desde https://openrouter.ai/keys"
    Write-Host "Se va a abrir el Bloc de notas: pega la clave despues de OPENROUTER_API_KEY= y guarda (Ctrl+S)."
    Read-Host "Pulsa Enter para abrir el Bloc de notas"
    Start-Process notepad.exe $envPath -Wait
}
