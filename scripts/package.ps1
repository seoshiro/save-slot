$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$deliveryRoot=Join-Path $projectRoot 'delivery'
$stageRoot=Join-Path $deliveryRoot 'save-slot'
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
foreach($name in @('src','tests','scripts','docs','.github','public')){
 Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $stageRoot -Recurse -Force
}
foreach($name in @('README.md','AGENTS.md','.gitignore','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts')){
 Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination $stageRoot -Force
}
foreach($name in @('art/references','art/source','art/blender','evidence')){
 New-Item -ItemType Directory -Path (Join-Path $stageRoot $name) -Force | Out-Null
}
foreach($name in @('art/references/worlds-sheet.png','art/references/console-reference.png','art/source/meshy-console-original.glb','art/source/console-report.json','art/source/console-cleanup.png','art/blender/save-slot-console.blend')){
 Copy-Item -LiteralPath (Join-Path $projectRoot $name) -Destination (Join-Path $stageRoot $name) -Force
}
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'evidence') -File | Where-Object Extension -In @('.png','.json','.webm') | ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $stageRoot 'evidence') -Force}
Compress-Archive -LiteralPath $stageRoot -DestinationPath (Join-Path $deliveryRoot 'SAVE-SLOT-source.zip') -CompressionLevel Optimal -Force
Get-Item -LiteralPath (Join-Path $deliveryRoot 'SAVE-SLOT-source.zip') | Select-Object FullName,Length
