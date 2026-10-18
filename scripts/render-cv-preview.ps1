<#
  Renders the portfolio-safe CV preview shown at /cv/ (cv/index.html).

  The original CV stays private: it lives in private/cv/ (ignored by git and
  by Vercel, so it is never committed or deployed). This script reads it
  locally and writes only flattened page images to cv/pages/:

    1. renders each PDF page with Windows' built-in PDF engine
       (Windows.Data.Pdf — no extra installs), at 2000px wide;
    2. applies the redactions below — information that doesn't need to be
       public is painted out of the pixels and, where useful, replaced;
    3. draws the watermark "GIL TEJANO CULAS — PORTFOLIO CV PREVIEW" into
       the artwork itself (a light diagonal repeat plus a footer line), so
       it can't be removed by deleting an HTML overlay;
    4. saves JPEGs at 2000px and 1100px wide (the viewer picks by size).

  No text layer survives: the published pages are images only.

  Run (Windows PowerShell 5.1) from the repository root:
    powershell -ExecutionPolicy Bypass -File scripts/render-cv-preview.ps1
  Optional: -Source <pdf> -Raw (writes unredacted renders to -RawDir for
  calibrating redaction boxes; never write those inside the site).

  After replacing the CV: re-check the redaction boxes against the new
  layout (use -Raw), re-run, and update the page list in cv/index.html if
  the page count or size changed.
#>
param(
  [string]$Source = (Join-Path $PSScriptRoot '..\private\cv\Gil-Tejano-CV.pdf'),
  [string]$OutDir = (Join-Path $PSScriptRoot '..\cv\pages'),
  [switch]$Raw,
  [string]$RawDir = (Join-Path $env:TEMP 'cv-raw')
)
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]

# --- WinRT async helpers -----------------------------------------------------
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  })[0]
function Await($op, [Type]$type) {
  $task = $asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $task.Wait() | Out-Null
  $task.Result
}
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
  })[0]
function AwaitAction($action) {
  $task = $asTaskAction.Invoke($null, @($action))
  $task.Wait() | Out-Null
}

# --- Settings ----------------------------------------------------------------
$WIDTHS = @(2000, 1100)          # output widths; the first is the render size
$JPEG_QUALITY = 82L
$WATERMARK = 'GIL TEJANO CULAS ' + [char]0x2014 + ' PORTFOLIO CV PREVIEW'

# Redactions, per page (1-based), as fractions of the page width/height so
# they hold at any render size. Each box is painted white; `text` (optional)
# is redrawn centred in it, in the CV's own style.
$REDACTIONS = @{
  1 = @(
    # Contact line: drop the personal phone number and the town; keep the
    # province and the public portfolio email.
    # Measured on the July 2025 CV: the line sits at 322-350px of 2828
    # (rule below at 372px), 31px Arial at a 2000px-wide render.
    @{ x = 0.08; y = 0.1103; w = 0.84; h = 0.0170; text = 'Cavite, Philippines   |   giltejano.visuals@gmail.com'; size = 0.0155 }
  )
}

# --- Rendering -----------------------------------------------------------------
$sourcePath = (Resolve-Path $Source).Path
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($sourcePath)) ([Windows.Storage.StorageFile])
$pdf = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])

function RenderPage($index, $width) {
  $page = $pdf.GetPage($index)
  $options = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $options.DestinationWidth = [uint32]$width
  $options.DestinationHeight = [uint32][math]::Round($width * $page.Size.Height / $page.Size.Width)
  $options.BackgroundColor = [Windows.UI.Color]::FromArgb(255, 255, 255, 255)
  $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitAction ($page.RenderToStreamAsync($stream, $options))
  $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream.GetInputStreamAt(0))
  $memory = New-Object System.IO.MemoryStream
  $net.CopyTo($memory)
  $page.Dispose()
  $bitmap = [System.Drawing.Bitmap]::FromStream($memory)
  # A copy that no longer depends on the stream.
  New-Object System.Drawing.Bitmap($bitmap)
}

if ($Raw) {
  New-Item -ItemType Directory -Force $RawDir | Out-Null
  for ($i = 0; $i -lt $pdf.PageCount; $i++) {
    $bmp = RenderPage $i $WIDTHS[0]
    $bmp.Save((Join-Path $RawDir ("raw-page-{0}.png" -f ($i + 1))), [System.Drawing.Imaging.ImageFormat]::Png)
    "raw page $($i + 1): $($bmp.Width)x$($bmp.Height)"
    $bmp.Dispose()
  }
  return
}

function Redact($bmp, $boxes) {
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $W = $bmp.Width; $H = $bmp.Height
  foreach ($box in $boxes) {
    $rect = New-Object System.Drawing.RectangleF(($box.x * $W), ($box.y * $H), ($box.w * $W), ($box.h * $H))
    $g.FillRectangle([System.Drawing.Brushes]::White, $rect)
    if ($box.text) {
      $font = New-Object System.Drawing.Font('Arial', [single]($box.size * $W), [System.Drawing.GraphicsUnit]::Pixel)
      $format = New-Object System.Drawing.StringFormat
      $format.Alignment = [System.Drawing.StringAlignment]::Center
      $format.LineAlignment = [System.Drawing.StringAlignment]::Center
      $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 20, 20))
      $g.DrawString($box.text, $font, $brush, $rect, $format)
      $brush.Dispose(); $font.Dispose(); $format.Dispose()
    }
  }
  $g.Dispose()
}

# A light diagonal repeat across the page, plus a clear footer line — part
# of the pixels, so it survives saving or screenshotting the image.
function Watermark($bmp) {
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  $W = $bmp.Width; $H = $bmp.Height
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  $font = New-Object System.Drawing.Font('Arial', [single]($W * 0.026), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 15, 76, 76))
  # Four rows at a shallow angle, evenly down the page.
  $angle = -30
  foreach ($t in @(0.17, 0.39, 0.61, 0.83)) {
    $state = $g.Save()
    $g.TranslateTransform([single]($W * 0.5), [single]($H * $t))
    $g.RotateTransform([single]$angle)
    $g.DrawString($WATERMARK, $font, $brush, 0, 0, $format)
    $g.Restore($state)
  }
  $brush.Dispose(); $font.Dispose()

  $footFont = New-Object System.Drawing.Font('Arial', [single]($W * 0.0085), [System.Drawing.GraphicsUnit]::Pixel)
  $footBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 15, 76, 76))
  $footRect = New-Object System.Drawing.RectangleF(0, [single]($H * 0.965), [single]$W, [single]($H * 0.02))
  $g.DrawString($WATERMARK, $footFont, $footBrush, $footRect, $format)
  $footBrush.Dispose(); $footFont.Dispose(); $format.Dispose()
  $g.Dispose()
}

function SaveJpeg($bmp, $path) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $JPEG_QUALITY)
  $bmp.Save($path, $codec, $params)
  $params.Dispose()
}

function Resize($bmp, $width) {
  $height = [int][math]::Round($bmp.Height * $width / $bmp.Width)
  $out = New-Object System.Drawing.Bitmap($width, $height)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($bmp, 0, 0, $width, $height)
  $g.Dispose()
  $out
}

New-Item -ItemType Directory -Force $OutDir | Out-Null
Get-ChildItem $OutDir -Filter 'cv-page-*.jpg' | Remove-Item
for ($i = 0; $i -lt $pdf.PageCount; $i++) {
  $n = $i + 1
  $bmp = RenderPage $i $WIDTHS[0]
  if ($REDACTIONS.ContainsKey($n)) { Redact $bmp $REDACTIONS[$n] }
  Watermark $bmp
  foreach ($width in $WIDTHS) {
    $sized = if ($width -eq $bmp.Width) { $bmp } else { Resize $bmp $width }
    $path = Join-Path $OutDir ("cv-page-{0}-{1}.jpg" -f $n, $width)
    SaveJpeg $sized $path
    "page ${n}: $($sized.Width)x$($sized.Height) -> $([math]::Round((Get-Item $path).Length / 1KB)) KB"
    if ($sized -ne $bmp) { $sized.Dispose() }
  }
  $bmp.Dispose()
}
