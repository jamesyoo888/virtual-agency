# One-shot scheduled task that runs nProtect uninstaller as SYSTEM.
# Registers, runs immediately, polls for completion, then deletes itself.

$ErrorActionPreference = 'Continue'

$exe = 'C:\Program Files (x86)\INCAInternet UnInstall\nProtect Online Security\nProtectUninstaller.exe'
if (-not (Test-Path -LiteralPath $exe)) {
    Write-Host "MISSING: $exe"
    exit 2
}

# Try several silent-flag conventions vendor uninstallers commonly accept.
# nProtect's uninstaller is a custom installer, so we attempt /S first
# (NSIS) then /silent (Inno Setup). Stop after the first one that
# removes the registry uninstall entry.
$attempts = @('/S', '/silent', '/quiet', '/Q')

foreach ($flag in $attempts) {
    Write-Host "ATTEMPT: $flag"
    $action = New-ScheduledTaskAction -Execute $exe -Argument $flag
    $trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddSeconds(5))
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName 'nProtect-Uninstall' -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
    Start-Sleep -Seconds 90

    # Poll the registry — uninstall entry vanishes once the uninstaller
    # finishes a successful removal.
    $stillThere = Get-ItemProperty 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -match 'nProtect' }

    Unregister-ScheduledTask -TaskName 'nProtect-Uninstall' -Confirm:$false -ErrorAction SilentlyContinue

    if (-not $stillThere) {
        Write-Host "SUCCESS with flag: $flag"
        exit 0
    }
}

Write-Host "FAILED: nProtect still present after silent attempts"
exit 1
