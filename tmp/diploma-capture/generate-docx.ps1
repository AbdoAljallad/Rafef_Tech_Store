$ErrorActionPreference = 'Stop'

$repoRoot = 'D:\University\doplome\Rafef_Tech_Store'
$markdownPath = Join-Path $repoRoot 'docs\diploma-thesis-ru.md'
$outputPath = Join-Path $repoRoot 'docs\diploma-thesis-ru.docx'
$screenshotsDir = Join-Path $repoRoot 'docs\screenshots'

$imageMap = @{
  10 = (Join-Path $screenshotsDir '01-login.png')
  11 = (Join-Path $screenshotsDir '02-home.png')
  13 = (Join-Path $screenshotsDir '04-products.png')
  14 = (Join-Path $screenshotsDir '03-customers.png')
  15 = (Join-Path $screenshotsDir '07-sales-pos.png')
  16 = (Join-Path $screenshotsDir '05-inventory-stock.png')
  17 = (Join-Path $screenshotsDir '10-settings-users.png')
  18 = (Join-Path $screenshotsDir '09-integrations.png')
  20 = (Join-Path $screenshotsDir '06-repair-orders.png')
  21 = (Join-Path $screenshotsDir '08-reports.png')
}

function Clean-InlineMarkdown {
  param([string]$Text)

  $value = $Text -replace '`', ''
  $value = $value -replace '\*\*', ''
  $value = $value -replace '\*', ''
  return $value.Trim()
}

function Split-MarkdownRow {
  param([string]$Line)

  $trimmed = $Line.Trim()
  if (-not $trimmed.StartsWith('|')) {
    return @()
  }

  $parts = $trimmed.Split('|')
  $cells = @()

  for ($i = 1; $i -lt ($parts.Length - 1); $i++) {
    $cells += (Clean-InlineMarkdown $parts[$i])
  }

  return $cells
}

function Add-Paragraph {
  param(
    $Selection,
    [string]$Text,
    [int]$Size = 14,
    [bool]$Bold = $false,
    [bool]$Italic = $false,
    [int]$Alignment = 0,
    [int]$SpaceAfter = 6
  )

  $Selection.Style = $Selection.Document.Styles.Item('Normal')
  $Selection.Font.Name = 'Times New Roman'
  $Selection.Font.Size = $Size
  $Selection.Font.Bold = if ($Bold) { 1 } else { 0 }
  $Selection.Font.Italic = if ($Italic) { 1 } else { 0 }
  $Selection.ParagraphFormat.Alignment = $Alignment
  $Selection.ParagraphFormat.SpaceAfter = $SpaceAfter
  $Selection.TypeText($Text)
  $Selection.TypeParagraph()
}

function Add-Image {
  param(
    $Selection,
    [string]$ImagePath
  )

  if (-not (Test-Path $ImagePath)) {
    Add-Paragraph -Selection $Selection -Text '[Image missing]' -Italic $true -Alignment 1
    return
  }

  $Selection.ParagraphFormat.Alignment = 1
  $shape = $Selection.InlineShapes.AddPicture($ImagePath)
  $shape.LockAspectRatio = -1

  if ($shape.Width -gt 430) {
    $shape.Width = 430
  }

  $Selection.TypeParagraph()
  $Selection.TypeParagraph()
}

function Add-Table {
  param(
    $Document,
    $Selection,
    [string[]]$TableLines
  )

  $rows = @()
  foreach ($line in $TableLines) {
    if ($line -match '^\|\s*[-:]+\s*\|') {
      continue
    }

    $cells = Split-MarkdownRow $line
    if ($cells.Count -gt 0) {
      $rows += ,$cells
    }
  }

  if ($rows.Count -eq 0) {
    return
  }

  $columnCount = $rows[0].Count
  $range = $Selection.Range
  $table = $Document.Tables.Add($range, $rows.Count, $columnCount)
  $table.Borders.Enable = 1
  $table.Range.Font.Name = 'Times New Roman'
  $table.Range.Font.Size = 12

  for ($r = 1; $r -le $rows.Count; $r++) {
    for ($c = 1; $c -le $columnCount; $c++) {
      $table.Cell($r, $c).Range.Text = $rows[$r - 1][$c - 1]
    }
  }

  $table.Rows.Item(1).Range.Bold = 1
  $table.Rows.Alignment = 1
  $Selection.SetRange($table.Range.End, $table.Range.End)
  $Selection.TypeParagraph()
  $Selection.TypeParagraph()
}

$lines = Get-Content -Path $markdownPath -Encoding UTF8

$word = $null
$document = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Add()
  $selection = $word.Selection

  $selection.Font.Name = 'Times New Roman'
  $selection.Font.Size = 14

  $index = 0
  while ($index -lt $lines.Count) {
    $line = $lines[$index]
    $trimmed = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      $index++
      continue
    }

    if ($trimmed.StartsWith('|')) {
      $tableLines = @()
      while ($index -lt $lines.Count -and $lines[$index].Trim().StartsWith('|')) {
        $tableLines += $lines[$index]
        $index++
      }
      Add-Table -Document $document -Selection $selection -TableLines $tableLines
      continue
    }

    if ($trimmed -match '^###\s+') {
      Add-Paragraph -Selection $selection -Text (Clean-InlineMarkdown ($trimmed -replace '^###\s+', '')) -Size 14 -Bold $true
      $index++
      continue
    }

    if ($trimmed -match '^##\s+') {
      Add-Paragraph -Selection $selection -Text (Clean-InlineMarkdown ($trimmed -replace '^##\s+', '')) -Size 15 -Bold $true -Alignment 1 -SpaceAfter 10
      $index++
      continue
    }

    if ($trimmed -match '^#\s+') {
      Add-Paragraph -Selection $selection -Text (Clean-InlineMarkdown ($trimmed -replace '^#\s+', '')) -Size 16 -Bold $true -Alignment 1 -SpaceAfter 12
      $index++
      continue
    }

    $nextLine = if ($index + 1 -lt $lines.Count) { $lines[$index + 1].Trim() } else { '' }
    if ($trimmed -match '^\S+\s+\d+\.') {
      if ($nextLine.StartsWith('[') -and $nextLine.EndsWith(']')) {
        $caption = Clean-InlineMarkdown $trimmed
        Add-Paragraph -Selection $selection -Text $caption -Size 12 -Bold $true -Alignment 1

        $figureNumber = $null
        if ($caption -match '^\S+\s+(\d+)\.') {
          $figureNumber = [int]$matches[1]
        }

        if ($figureNumber -ne $null -and $imageMap.ContainsKey($figureNumber)) {
          Add-Image -Selection $selection -ImagePath $imageMap[$figureNumber]
        } else {
          Add-Paragraph -Selection $selection -Text '[Figure placeholder]' -Italic $true -Alignment 1
        }

        $index += 2
        continue
      }

      if ($nextLine.StartsWith('|')) {
        Add-Paragraph -Selection $selection -Text (Clean-InlineMarkdown $trimmed) -Size 12 -Bold $true -Alignment 1
        $index++
        continue
      }
    }

    if ($trimmed -match '^\d+\.\s+') {
      Add-Paragraph -Selection $selection -Text (Clean-InlineMarkdown $trimmed) -Size 14
      $index++
      continue
    }

    if ($trimmed -match '^- ') {
      Add-Paragraph -Selection $selection -Text ('- ' + (Clean-InlineMarkdown ($trimmed -replace '^- ', ''))) -Size 14
      $index++
      continue
    }

    Add-Paragraph -Selection $selection -Text (Clean-InlineMarkdown $trimmed) -Size 14
    $index++
  }

  if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
  }

  $wdFormatDocumentDefault = 16
  $document.SaveAs([string]$outputPath, [int]$wdFormatDocumentDefault)
}
finally {
  if ($document -ne $null) {
    $document.Close([ref]0)
  }

  if ($word -ne $null) {
    $word.Quit()
  }

  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}

Write-Output "DOCX_CREATED: $outputPath"
