$ErrorActionPreference = 'Stop'
$pagesDir = Join-Path $PSScriptRoot '..\pages'
$pages = Get-ChildItem -LiteralPath $pagesDir -Filter '*evaluacion*.html' -File |
  Where-Object { $_.Name -ne 'evaluaciones.html' }
if (-not $pages) { throw 'No se encontraron páginas de evaluación para validar.' }
$errors = [System.Collections.Generic.List[string]]::new()
foreach ($page in $pages) {
  $html = [IO.File]::ReadAllText($page.FullName)
  $name = $page.Name
  if ($html -notmatch 'js/lib/historial-intentos\.js') { $errors.Add("$name no carga el componente AttemptHistory.") }
  if ($html -notmatch 'js/lib/servicio-historial-intentos\.js') { $errors.Add("$name no carga el servicio compartido de historial.") }
  $wrapper = [regex]::Match($html, '<section\b[^>]*class="[^"]*evaluationPreparation[^"]*"[^>]*>([\s\S]*?)</section>')
  if (-not $wrapper.Success) { $errors.Add("$name no define el wrapper evaluationPreparation."); continue }
  if ($wrapper.Groups[1].Value -notmatch 'id="historial\w+"') { $errors.Add("$name no coloca el historial dentro del wrapper.") }
  if ($wrapper.Groups[1].Value -notmatch 'data-evaluation-start') { $errors.Add("$name no coloca el CTA de inicio dentro del wrapper.") }
}
if ($errors.Count) { $errors | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output "Validación correcta: $($pages.Count) páginas usan el componente, servicio y wrapper compartidos."
