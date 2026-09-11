Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\medos\assets\branding\medos-logo-source.png"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source file not found: $sourcePath"
    exit 1
}

$src = [System.Drawing.Bitmap]::FromFile($sourcePath)

Write-Output "Processing source: $($src.Width)x$($src.Height)"

# -------------------------------------------------------------
# 1. GENERATE medos-icon.png (1024x1024)
# -------------------------------------------------------------
Write-Output "Generating medos-icon.png..."
$iconBmp = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt 1024; $y++) {
    $targetBgR = [int][Math]::Round(24.0 - 14.0 * ($y / 1024.0)) # 24 down to 10
    $targetBgG = [int][Math]::Round(28.0 - 15.0 * ($y / 1024.0)) # 28 down to 13
    $targetBgB = [int][Math]::Round(30.0 - 16.0 * ($y / 1024.0)) # 30 down to 14
    
    for ($x = 0; $x -lt 1024; $x++) {
        $inRod = ($x -ge 415 -and $x -le 645 -and $y -ge 165 -and $y -le 705)
        $inText = ($x -ge 235 -and $x -le 785 -and $y -ge 715 -and $y -le 805)
        
        if ($inRod -or $inText) {
            $p = $src.GetPixel($x, $y)
            $srcBgR = 42.435567 - 0.020414 * $x - 0.031978 * $y
            $srcBgG = 53.618538 - 0.023431 * $x - 0.037880 * $y
            $srcBgB = 63.828452 - 0.025027 * $x - 0.041913 * $y
            
            $lumP = 0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B
            $lumBg = 0.299 * $srcBgR + 0.587 * $srcBgG + 0.114 * $srcBgB
            
            $diff = $lumP - $lumBg
            if ($diff -gt 6.0) {
                $alpha = [Math]::Min(1.0, ($diff - 6.0) / (240.0 - $lumBg))
                
                $fgR = [Math]::Min(255.0, [Math]::Max(0.0, $srcBgR + ($p.R - $srcBgR) / [Math]::Max(0.1, $alpha)))
                $fgG = [Math]::Min(255.0, [Math]::Max(0.0, $srcBgG + ($p.G - $srcBgG) / [Math]::Max(0.1, $alpha)))
                $fgB = [Math]::Min(255.0, [Math]::Max(0.0, $srcBgB + ($p.B - $srcBgB) / [Math]::Max(0.1, $alpha)))
                
                $compR = [int][Math]::Round($alpha * $fgR + (1.0 - $alpha) * $targetBgR)
                $compG = [int][Math]::Round($alpha * $fgG + (1.0 - $alpha) * $targetBgG)
                $compB = [int][Math]::Round($alpha * $fgB + (1.0 - $alpha) * $targetBgB)
                
                $iconBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $compR, $compG, $compB))
                continue
            }
        }
        $iconBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $targetBgR, $targetBgG, $targetBgB))
    }
}

$iconPath = "C:\medos\assets\branding\medos-icon.png"
$iconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$iconBmp.Dispose()
Write-Output "Saved medos-icon.png"

# -------------------------------------------------------------
# 2. GENERATE medos-adaptive-foreground.png (1024x1024)
# Transparent background, Rod of Asclepius centered at (512, 512)
# Shifting: dx = +2 (staff axis at 510 -> 512), dy = +78 (midpoint at 434 -> 512)
# -------------------------------------------------------------
Write-Output "Generating medos-adaptive-foreground.png..."
$adaptiveBmp = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$monoBmp = New-Object System.Drawing.Bitmap 1024, 1024, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Initialize with transparent
$gAdapt = [System.Drawing.Graphics]::FromImage($adaptiveBmp)
$gAdapt.Clear([System.Drawing.Color]::Transparent)
$gAdapt.Dispose()

$gMono = [System.Drawing.Graphics]::FromImage($monoBmp)
$gMono.Clear([System.Drawing.Color]::Transparent)
$gMono.Dispose()

$shiftX = 2
$shiftY = 78

# Rod is within X in [415, 645], Y in [165, 705]
for ($srcY = 165; $srcY -le 705; $srcY++) {
    for ($srcX = 415; $srcX -le 645; $srcX++) {
        $p = $src.GetPixel($srcX, $srcY)
        
        $srcBgR = 42.435567 - 0.020414 * $srcX - 0.031978 * $srcY
        $srcBgG = 53.618538 - 0.023431 * $srcX - 0.037880 * $srcY
        $srcBgB = 63.828452 - 0.025027 * $srcX - 0.041913 * $srcY
        
        $lumP = 0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B
        $lumBg = 0.299 * $srcBgR + 0.587 * $srcBgG + 0.114 * $srcBgB
        
        $diff = $lumP - $lumBg
        if ($diff -gt 6.0) {
            $alphaNorm = [Math]::Min(1.0, ($diff - 6.0) / (240.0 - $lumBg))
            $alphaByte = [int][Math]::Round($alphaNorm * 255.0)
            
            $fgR = [int][Math]::Round([Math]::Min(255.0, [Math]::Max(0.0, $srcBgR + ($p.R - $srcBgR) / [Math]::Max(0.1, $alphaNorm))))
            $fgG = [int][Math]::Round([Math]::Min(255.0, [Math]::Max(0.0, $srcBgG + ($p.G - $srcBgG) / [Math]::Max(0.1, $alphaNorm))))
            $fgB = [int][Math]::Round([Math]::Min(255.0, [Math]::Max(0.0, $srcBgB + ($p.B - $srcBgB) / [Math]::Max(0.1, $alphaNorm))))
            
            $dstX = $srcX + $shiftX
            $dstY = $srcY + $shiftY
            
            if ($dstX -ge 0 -and $dstX -lt 1024 -and $dstY -ge 0 -and $dstY -lt 1024) {
                # Color adaptive foreground
                $adaptiveColor = [System.Drawing.Color]::FromArgb($alphaByte, $fgR, $fgG, $fgB)
                $adaptiveBmp.SetPixel($dstX, $dstY, $adaptiveColor)
                
                # Monochrome adaptive foreground (#FFFFFF with alpha)
                $monoColor = [System.Drawing.Color]::FromArgb($alphaByte, 255, 255, 255)
                $monoBmp.SetPixel($dstX, $dstY, $monoColor)
            }
        }
    }
}

$adaptivePath = "C:\medos\assets\branding\medos-adaptive-foreground.png"
$adaptiveBmp.Save($adaptivePath, [System.Drawing.Imaging.ImageFormat]::Png)
$adaptiveBmp.Dispose()
Write-Output "Saved medos-adaptive-foreground.png"

$monoPath = "C:\medos\assets\branding\medos-adaptive-monochrome.png"
$monoBmp.Save($monoPath, [System.Drawing.Imaging.ImageFormat]::Png)
$monoBmp.Dispose()
Write-Output "Saved medos-adaptive-monochrome.png"

# -------------------------------------------------------------
# 3. GENERATE medos-favicon.png (48x48)
# Center Rod of Asclepius on solid #111412 background
# -------------------------------------------------------------
Write-Output "Generating medos-favicon.png..."
# Load the newly created adaptive foreground to downscale smoothly
$adaptImg = [System.Drawing.Bitmap]::FromFile($adaptivePath)
$faviconBmp = New-Object System.Drawing.Bitmap 48, 48, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gFav = [System.Drawing.Graphics]::FromImage($faviconBmp)
$gFav.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFav.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gFav.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Background #111412 (R=17, G=20, B=18)
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 17, 20, 18))
$gFav.FillRectangle($bgBrush, 0, 0, 48, 48)
$bgBrush.Dispose()

# Draw the Rod icon with 4px padding so it is ~40px high
# The rod in adaptive foreground occupies Y from 243 to 783 (height=540) inside 1024x1024
# When drawing entire 1024x1024 into 48x48:
# Height = 540 * (48 / 1024) = 25.3px.
# To make it crisp and visible in a 48x48 favicon, we crop to the Rod's bounding box and center it!
# Rod bounds in adaptive foreground:
# X in [417, 647] (width 230), Y in [243, 783] (height 540)
# We want to draw this into a rectangle of height 42, width = 42 * (230 / 540) = 17.8 ~ 18px.
# Centered at X = (48 - 18) / 2 = 15, Y = (48 - 42) / 2 = 3.
$srcRect = New-Object System.Drawing.Rectangle 417, 243, 230, 540
$dstRect = New-Object System.Drawing.Rectangle 15, 3, 18, 42
$gFav.DrawImage($adaptImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$gFav.Dispose()
$adaptImg.Dispose()

$faviconPath = "C:\medos\assets\branding\medos-favicon.png"
$faviconBmp.Save($faviconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$faviconBmp.Dispose()
Write-Output "Saved medos-favicon.png"

$src.Dispose()
Write-Output "All production branding assets generated successfully."
