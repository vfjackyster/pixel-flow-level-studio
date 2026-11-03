# Pixel Flow 0.37.1：IL2CPP 核心逻辑与难度缓和证据

本文件基于实际安装包的未加密 metadata v31 与 ARMv7 libil2cpp.so 静态分析。未启动游戏，未请求线上配置。REA 完成归档检查与安全提取；Windows REA 的 Ghidra provider 不接受 ARM ELF，以下方法映射/反汇编由本目录 Python 脚本直接解析 ELF、IL2CPP 模块表并使用 Capstone 完成。不是完整 C# 源码恢复。

## 结论

**确认包内存在接入正式建关/失败事件链的、基于重试及历史失败队列位置缓和关卡的系统。不是只有一个 DDA 字符串。** 它能解除射手连接/锁链、降低冰块血量、提前特殊射手、去除惊喜射手隐藏标记、减少牛图腾计数。**客户端缺省配置 Enabled=false；是否对某个线上用户启用、分组阈值和实际参数未知。** 本次未证实同局实时救场、必败/保过、命中作弊或付费用户差别待遇。

## 证据身份与恢复方法

- 原生库 SHA256 f37b3d205d8d55dcb39e18b32f40dd7878498948cda3d4af757a0cc4308a526c。
- metadata-tables.json：33614 类型、209550 方法、126753 字段、32419 字符串常量；保留 metadata 原始 method token 和 type index。
- native.py / native-modules.json：从 ELF 可写数据段中匹配程序集名指针、方法数和方法指针表；395 个匹配程序集，183311 个非零不同方法地址。每个模块须与 metadata 中最大 method token RID 一致。
- Assembly-CSharp.dll 模块 VA 0x89c0614，方法表 0x8d7d588，17105 条；Loom.LevelEase.Logic.dll 模块 VA 0x8c6406c，方法表 0x8f4c154，13 条。
- selected-native.txt：重点类342个方法反汇编；extra-native.txt：MapFail等补充；ease-nested-native.txt：闭包、选择条件及泛型配置调用体。
- 函数体以相邻已恢复方法地址界定，尾部可能含字面量池、跳板或冷区；这些字节的反汇编不应理解为实际执行路径。跨程序集跳板已人工跟踪关键3处。

## 正式事件与建关链

1. LevelEaseSystemController.OnEnable VA0x2634db4，selected-native.txt:12968：实际调用 CresciveLevelEvents.SubscribeToLevelFail (0x2634e54) 与 SubscribeToLevelWin (0x2634ea8)。不是DebugPage入口。
2. RecordFailure VA0x26350a0，selected-native.txt:13146：失败事件参数标志(+0x14)为真时，从当前queueGroup取剩余射手，尾调 LevelEaseProgress.RecordFailure VA0x2631b98。
3. ClearProgress VA0x2635158：相同事件标志为真时，胜利清理进度。
4. CreatorLevelSettingsEaseProcessor.Process VA0x262ef28，selected-native.txt:7456：获取运行时 LevelEaseSystem 后直接调用 EaseLevel VA0x262f000（调用点0x262efdc）。
5. EaseLevel VA0x262f000，selected-native.txt:12519：重新装载配置；从levelNumber委托取关卡号，取原始LevelData.ContentHash；检查get_IsEnabled；若启用，把tryCount委托、config、levelNumber传入EaseWithStartRow；最后BeginAttempt记录本次原始队列位置。
6. EaseWithStartRow VA0x2633858，selected-native.txt:11634：关卡区间检查→检查队列行数→Validate→CreatePipeline→CaptureOriginal→HasEnoughFailures→GetEaseProgress→按失败位置选择目标→以种子创建SystemRandom→FeaturePipeline.Apply→返回处理后的LevelData。
7. tryCount委托为 LevelEaseSystemController.<CreateSystem>b__11_1 VA0x2635220，selected-native.txt:13308：读 LevelSessionInfoData.LevelAttempNumber 字段(+0x20)。并非仅看到failureCount就推断DDA；LevelRemoteSystem.failureCount另有网络重试含义。

**作用时点：建关/重新加载关卡数据阶段。** SaveHandler还保存与恢复EaseAttempt（保证中断恢复可保留缓和结果）；本证据没有证明每帧按表现实时改局势。

## 历史失败位置究竟是什么

- LevelEaseProgress.BeginAttempt VA0x26315a4，selected-native.txt:9738：遍历 LevelData.QueueGroup(+0x1c).shooterQueues，再遍历每列shooters，将shooter.id映射为(rowIndex+1,columnIndex+1)。管道内容中的射手继承管道位置。这里的row/column是**射手队列中的原始位置**，不是像素画坐标。
- RecordFailure VA0x2631b98先从当前运行队列取剩余射手，再进入VA0x2631de0；通过预存locations取原始位置并追加FailureRows/FailureColumns（写入0x263214c—0x2632250），每次attempt有recorded防重复标记。
- LevelEaseProgress.Read按LevelNumber和ContentHash匹配历史；不能把另一内容版本的失败直接视为同一关数据。
- LevelEaseSelection.GetRowCount VA0x262af7c读QueueGroup，取最大队列长度。Select VA0x2632ee4将历史FailureRows、RowSpacingPercent、队列行数传入TryGetStartRow；成功后SelectFromRow VA0x2633044取该行及后面的射手，并扩展管道内容。
- TryGetStartRow完整稳健聚合公式本轮未完全高层恢复，不应编造“固定取最小/平均失败行”。已确认它处理有效失败队列行和spacingPercent。

## 触发公式与缺省配置

Loom.LevelEase.Logic.dll 的纯函数：

- HasEnoughFailures VA0x67d4524，selected-native.txt:27765：attemptCount > max(requiredFailures,0)，严格大于。
- GetEaseProgress VA0x67d453c，selected-native.txt:27773：attemptCount <= max(startTryCount,0) 时0；否则totalTryCountForAllEase<1时1；否则 clamp01((attemptCount-startTryCount-1)/totalTryCountForAllEase)。不要将attempt索引直接翻译成实机“第N次失败必触发”。
- GetPositionPercent VA0x67d4970：数量不足时走边界处理，正常为index/(count-1)。
- GetEaseProbability VA0x67d49a0，selected-native.txt:28058：bottomProbability+(topProbability-bottomProbability)*clamp01(positionPercent)。
- GetRandomSeed VA0x67d49e0，selected-native.txt:28076：levelNumber*1009+tryCount。相同关号和尝试数对应确定性种子，不等于完全随机发关。
- SelectTargets VA0x262fef4，selected-native.txt:8495：把位置概率、feature权重、easeProgress相乘，与IRandom产生值比较选目标；这表明概率性缓和，不等于每次必定修改。

LevelEaseConfig无参构造 VA0x2626e10，selected-native.txt:572：

| 字段 | 缺省值 |
|---|---:|
| Enabled | false（新对象清零，构造器未写true） |
| TotalTryCountForAllEase |15|
| RowSpacingPercent |0.1|
| TopEaseProbability / BottomEaseProbability |1 / 1|
| ConnectedShooterWeight |1|
| HammerWeight |约0.948|
| ShooterIceBlockWeight |约0.954|
| SurpriseShooterWeight |约0.955|
| ChainedShooterWeight / MalletWeight / BullTotemWeight |1 / 1 / 1|
| ShooterIceBlockMaxHealthReductionPercent |0.2|
| 初始IntervalConfigs |StartLevel=1, EndLevel=799, StartTryCount=15|

以上是fallback构造默认值，不是已捕获的线上配置，更不是对用户已生效的阈值。

配置入口 GetConfig VA0x2627fb0，selected-native.txt:1527：向设置助手传入key，返回null时new默认LevelEaseConfig；GetInitialConfig VA0x262805c在允许的debug模式下可读debug override，否则走GetConfig。

key已追到真实字节：0x2628004的PC-relative读取→GOT 0x8cbbe08→slot 0x8e3f668，其中encoded usage=0xa000d4ad，usage tag5=string literal，index=(value&0x1ffffffe)>>1=27222，对应global-metadata字符串 **level_ease_settings**。不依靠附近字符串推断。泛型设置助手完整实现未恢复；线上key内容本次未获取。

## 七类缓和效果

| 类型 | 实际静态效果 | 地址与证据 |
|---|---|---|
| ConnectedShooter | 对选中射手执行TryRemoveConnectionsOfShooters，解除连接 | Ease0x262d170；调用0x262d250；selected-native.txt:5847 |
| ChainedShooter | 找锁链数据并TryRemoveChainOfShooter，解除链 | Ease0x262cc80；调用0x262ce8c |
| ShooterIceBlock | 按原血量×clamp01(maxHealthReductionPercent)×easeProgress计算减少值，写回max(1,原血量-减少值) | Ease0x262e684；写0x262e8d0；selected-native.txt:6614 |
| Hammer | 选择关联射手并调用ShooterQueueEaseHelper.Advance | Ease0x262d834；调用0x262d960；selected-native.txt:6216 |
| Mallet | 选择关联射手并调用同一Advance | Ease0x262e1f8；调用0x262e40c；selected-native.txt:6386 |
| SurpriseShooter | 在LevelData.SurpriseShooters(+0x20)的ID集合中移除被选中的射手（泛型List.RemoveAll路径） | Ease0x262ebc4，读取0x262ec90，调用0x262ecfc；selected-native.txt:7278 |
| BullTotem | 对选中的BullTotemData.Count>=2者Count减1，保留至少1 | Ease0x262c7c0；0x262c9a0—0x262c9ac；selected-native.txt:5335 |

Advance VA0x262d98c，selected-native.txt:6898：在每列shooters中找到目标ID，做相邻元素交换使它前移；避开特定被排除ID、已处理目标，并调用BullTotemsData.Contains对相邻对象进行保护检查。交换写入在0x262de30及0x262de58。未完全恢复所有边界条件，不应描述成任意全队列洗牌、重发颜色或增发弹药。

## 失败判定的精确边界

MapFailController.OnSlotsFullAtConveyorExit VA0x28c185c，extra-native.txt:2510：先CanShootAnyTargetNew；返回真→TriggerOutOfSpaceFail，返回假→TryCheckForCannotShootFail。不要仅凭函数名把分支改写成更直观的相反含义。

MapFailController还订阅射手点击、进入槽、射手将消失、离开队列、最后一颗在途弹消失等事件；有延迟检查、BypassFail、suppressedFail。**“点下第五个等待槽立即失败”不是本次证据支持的完整规则。** 关卡机关还拥有锁死、冻结、UFO、幕帘、牛图腾、飞船、Octopig、障碍、计时等失败事件，不能把全部失败归为槽满。

## 未决事项

- 线上是否启用level_ease_settings，对哪些用户/版本/关段启用及其覆盖参数。
- LevelAttempNumber真实开局索引与UI“第几次失败”的对应，需运行时核查。
- 运行时各机关视觉表现、实际帧间顺序与延迟；本文件无实机观测。
- 未证实上调难度、付费分组操控、保过/必败、射击命中造假。

