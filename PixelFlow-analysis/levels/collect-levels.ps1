$ErrorActionPreference='Stop'
$root='C:\Users\Admin\AppData\Local\Temp\rea-extracted-c32f2da8-4c2d-4d9a-ab63-2a218f53a32f\assets\Levels'
$out=$PSScriptRoot
function Read-Level($p){
 $t=[IO.File]::ReadAllText($p)
 $ms=[IO.MemoryStream]::new([Convert]::FromBase64String($t.Substring(5)))
 $gz=[IO.Compression.GzipStream]::new($ms,[IO.Compression.CompressionMode]::Decompress)
 $sr=[IO.StreamReader]::new($gz)
 try{return ($sr.ReadToEnd()|ConvertFrom-Json -Depth 100)}finally{$sr.Dispose();$gz.Dispose();$ms.Dispose()}
}
function Save-Json($name,$data){$data|ConvertTo-Json -Depth 100|Set-Content -LiteralPath (Join-Path $out $name) -Encoding utf8}
$manifest=Get-Content -LiteralPath (Join-Path $root 'manifest.json') -Raw|ConvertFrom-Json
$baseId='3db5681ee587345ad9a3cf8400a692d1'
$records=[Collections.Generic.List[object]]::new()
$mechanics=@{};$cache=@{};$variants=[Collections.Generic.List[object]]::new()
foreach($funnel in $manifest.funnels){
 $id=$funnel.funnelId
 foreach($f in Get-ChildItem -LiteralPath (Join-Path $root $id) -File|Sort-Object {[int]$_.BaseName}){
  $v=Read-Level $f.FullName
  if($id -eq $baseId){$cache[$f.BaseName]=$v}
  $ss=@($v.QueueGroup.shooterQueues.shooters)
  $record=[pscustomobject]@{funnel=$id;level=[int]$f.BaseName;sourceRelativePath="assets/Levels/$id/$($f.Name)";difficulty=$v.Difficulty;hasTimeLimit=$v.HasTimeLimit;timeLimit=$v.TimeLimit;slotCount=$v.SlotCount;conveyorLimit=$v.ConveyorLimit;queueCount=@($v.QueueGroup.shooterQueues).Count;shooterCount=$ss.Count;queueAmmo=($ss|Measure-Object ammo -Sum).Sum;ordinaryPixels=@($v.PixelImageData.pixels).Count;width=$v.PixelImageData.width;height=$v.PixelImageData.height;physicalWidth=$v.PixelImageData.physicalWidth;physicalHeight=$v.PixelImageData.physicalHeight;pixelMaterials=@($v.PixelImageData.pixels.material|Sort-Object -Unique);isValid=$v.isValid}
  $records.Add($record)
  if($id -eq $baseId){
   $props=@($v.PSObject.Properties)+@($v.PixelImageData.PSObject.Properties)
   foreach($p in $props){
    if($p.Name -in @('QueueGroup','PixelImageData','Difficulty','HasTimeLimit','TimeLimit','SlotCount','ConveyorLimit','contentHash','isValid','validationErrors','width','height','physicalWidth','physicalHeight','pixels','Preview')){continue}
    $n=0
    if($p.Value -is [pscustomobject]){foreach($q in $p.Value.PSObject.Properties){if($q.Value -is [array]){$n+=$q.Value.Count}}}elseif($p.Value -is [array]){$n=$p.Value.Count}
    if($n -gt 0){
     if(!$mechanics.ContainsKey($p.Name)){$mechanics[$p.Name]=[pscustomobject]@{name=$p.Name;firstLevel=[int]$f.BaseName;levels=0;sourceRelativePath=$record.sourceRelativePath;example=$p.Value}}
     $mechanics[$p.Name].levels++
    }
   }
  }else{
   $a=$cache[$f.BaseName]
   $changed=@();$pixelChanged=@()
   foreach($p in $v.PSObject.Properties){$n=$p.Name;if(($a.$n|ConvertTo-Json -Depth 100 -Compress) -cne ($p.Value|ConvertTo-Json -Depth 100 -Compress)){$changed+=$n}}
   foreach($p in $v.PixelImageData.PSObject.Properties){$n=$p.Name;if(($a.PixelImageData.$n|ConvertTo-Json -Depth 100 -Compress) -cne ($p.Value|ConvertTo-Json -Depth 100 -Compress)){$pixelChanged+=$n}}
   $variants.Add([pscustomobject]@{funnel=$id;level=[int]$f.BaseName;changedFields=$changed;changedPixelFields=$pixelChanged;baseDifficulty=$a.Difficulty;variantDifficulty=$v.Difficulty;baseQueueCount=@($a.QueueGroup.shooterQueues).Count;variantQueueCount=$record.queueCount;baseShooterCount=@($a.QueueGroup.shooterQueues.shooters).Count;variantShooterCount=$record.shooterCount;baseQueueAmmo=($a.QueueGroup.shooterQueues.shooters|Measure-Object ammo -Sum).Sum;variantQueueAmmo=$record.queueAmmo;baseOrdinaryPixels=@($a.PixelImageData.pixels).Count;variantOrdinaryPixels=$record.ordinaryPixels;baseSlotCount=$a.SlotCount;variantSlotCount=$v.SlotCount;baseConveyorLimit=$a.ConveyorLimit;variantConveyorLimit=$v.ConveyorLimit})
  }
  if(($id -eq $baseId -and [int]$f.BaseName -in @(1,100,499)) -or ($id -eq '34f390a30a78e434a8de91fc7b7334ee' -and [int]$f.BaseName -in @(1,100)) -or ($id -eq '40f0de0d9bdd74bb29d006cce51d7b75' -and [int]$f.BaseName -eq 100)){Save-Json "$id-$($f.BaseName).decoded.json" $v}
 }
}
Save-Json 'manifest.json' $manifest
Save-Json 'level-records.json' $records.ToArray()
Save-Json 'variant-comparisons.json' $variants.ToArray()
Save-Json 'mechanics.json' @($mechanics.GetEnumerator()|Sort-Object {$_.Value.firstLevel}|ForEach-Object {$_.Value})
$base=@($records|Where-Object funnel -eq $baseId)
$summary=[ordered]@{sourceRoot=$root;funnelCount=$manifest.funnels.Count;recordCount=$records.Count;baseFunnel=$baseId;baseCount=$base.Count;difficulty=@($base|Group-Object difficulty|Select-Object Name,Count);slotCount=@($base|Group-Object slotCount|Select-Object Name,Count);conveyorLimit=@($base|Group-Object conveyorLimit|Select-Object Name,Count);hasTimeLimit=@($base|Group-Object hasTimeLimit|Select-Object Name,Count);ranges=@('width','height','physicalWidth','physicalHeight','queueCount','shooterCount','queueAmmo','ordinaryPixels'|ForEach-Object {$n=$_;$m=$base|Measure-Object $n -Minimum -Maximum -Average;[pscustomobject]@{field=$n;min=$m.Minimum;max=$m.Maximum;mean=$m.Average}});variantChangedFields=@($variants.changedFields|Group-Object|Select-Object Name,Count);variantChangedPixelFields=@($variants.changedPixelFields|Group-Object|Select-Object Name,Count);capacityExceptions=@($base|Where-Object {$_.conveyorLimit -ne 5 -or $_.slotCount -ne 5});limitations=@('Static packaged data only. Funnel selection and priority are not established by this script.','Queue ammo excludes shooters embedded inside ShooterPipes and other mechanics. Ordinary pixel count excludes mechanic targets.','Difficulty is a stored label, not a proved solver score. First level means first within the base funnel; active funnel may differ.','isValid and validationErrors are authoring data and do not prove actual solvability.','Preview.instanceID and contentHash differences are metadata; changedPixelFields lists them explicitly.')}
Save-Json 'summary.json' $summary
$lines=@('# Pixel Flow 0.37.1：关卡静态数据核查','','来源：REA 主 APK 解包；只解码数据，不执行游戏。','','## 组织方式','','assets/Levels/manifest.json 声明 27 个 funnel，共 3500 条关卡记录。主集合 3db5681ee587345ad9a3cf8400a692d1 含连续 1–2700 号；其余 26 个集合合计 800 条稀疏同号变体。不能将 3500 当作独立关卡总数，也不能仅凭文件证明运行时选择策略。','','每个 funnel 对应 .idx，格式为 关卡号:32位十六进制值；该值的具体散列口径尚未确认。关卡 .json 是 gzip: 前缀 + Base64 + gzip 压缩 JSON。','','## 核心字段','','- Difficulty：预先存储的标签；主集合 Easy1314、Medium571、Hard509、Very Hard296、Very Easy10。','- HasTimeLimit/TimeLimit：主集合全部不启用关卡计时。','- SlotCount：全部为5。ConveyorLimit：2699关为5、1关为6，例外见 summary.json。','- QueueGroup.shooterQueues[].shooters[]：各列射手顺序，以及 id、ammo、material。','- PixelImageData：逻辑宽高、物理宽高、普通像素坐标与material、各机关配置。','- Preview.instanceID、contentHash、isValid、validationErrors：资源或编辑校验元数据；不等于经过真人或求解器证明可过关。','','## 样例与变体','','基础第1关：16×15画布、180普通像素、两列共6射手，颜色5与8；每色弹药40+40+10=90，普通像素每色90。','同号100关：主集合 Easy、13射手、队列总弹药240、178普通像素；34f390... 变体 Ultra Hard、51射手、760队列弹药、670普通像素；40f0de... 变体 Ultra Hard、46射手、1050队列弹药、1050普通像素。','这些是明确存在的作者编排差异，尚不证明会因玩家失败动态替换。','','## 复核文件','','- level-records.json：3500条摘要与源相对路径。','- variant-comparisons.json：800条同号对比，分别列出顶层字段与PixelImageData子字段变化，避免将Preview变化误当地图变化。','- mechanics.json：主集合各非空机关首次关、出现关数、完整首例数据。','- *.decoded.json：已解码关卡样例。','- summary.json：统计与边界。','- collect-levels.ps1：可复跑脚本；会覆盖本目录同名输出。','','注意：queueAmmo 不含管道或其他机关内嵌射手；ordinaryPixels 不含机关目标。因此不能用这两列的差直接判定弹药不足、补偿或DDA。')
$lines|Set-Content -LiteralPath (Join-Path $out '关卡核查.md') -Encoding utf8
[pscustomobject]@{written=$out;records=$records.Count;variants=$variants.Count;mechanics=$mechanics.Count;summary=$summary}|ConvertTo-Json -Depth 8
