# Pixel Flow! 0.37.1 美术与渲染静态拆解

证据来源：REA 解出的主 APK，assets/bin/Data/data.unity3d；UnityPy 1.25.4 解析。这里的 `文件#pathId` 指 UnityFS 内部序列化文件和对象编号。未运行游戏，数量是打包资源总量，含活动、库和可能未用资产，不是一帧开销。

## 结论

采用 Unity 6000.0.58f2 + URP、正交俯视 3D 玩法 + 2D UI/插画。玩法“像素”由立体低模块组成，而非仅把整幅像素图作为一张可消除图片；数据里每点存材质 ID，通过34种 PixelMaterial 映射复用颜色材质。圆角块、卡通猪、传送带、粗描边、分段光照、简化高光与平面投影阴影构成主风格。

- 引擎与场景：globalgamemanagers#11 BuildSettings，版本6000.0.58f2；Bootloader、Boot、Home、Gameplay四场景；启用dynamic batching。globalgamemanagers#7 GraphicsSettings→globalgamemanagers.assets#10987 UniversalRenderPipelineAsset；#10988 UniversalRendererData。图形API枚举[21,11]。
- 玩法相机：level3#599，GameObject Cinemachine Brain，orthographic=true，size=8，position=(0,25.043,-8.219)，quaternion=(0.573576,0,0,0.819152)（约绕X70°）。这是打包初始值，运行时Cinemachine可能改动。
- 光照：level3#730 Directional Light，intensity=1，soft shadows，shadow strength=0.4；另有平面阴影材质与复用同网格的Shadow子对象，不应把画面全部阴影归于实时光照。
- shader：resources.assets#1655 Loom/Toon Hybrid，#1546 Loom/Toon Hybrid Outlined，#1543 Loom/Toon Hybrid Transparent，#1598 Loom/Planar Shadow；sharedassets1.assets#613 Loom/Pixel Outline；还包含 Toony Colors Pro 2 Hybrid Shader 2。颜色材质Blue/Red及传送带材质启用 GPU instancing；实际draw call须运行时核查。
- Pixel1x1 prefab：sharedassets1.assets GameObject#11848→Model_Pixel→Mesh#572 Cube.035：88顶点，128三角；Shadow_Pixel复用此网格。
- Pixel1x1 Low Poly prefab：sharedassets1.assets GameObject#3553→Model_Pixel→Mesh#576 Cube.316：49顶点，68三角；其Shadow仍使用#572。
- Shooter prefab：resources.assets GameObject#4792→Scale Pivot→Model Pivot→Model_Shooter→Mesh#1309 Cube.011：1305顶点，1865三角；PlanarShadow复用该网格。另存在设计器展示子对象，不能直接把整prefab所有网格重复数当运行开销。
- 传送带模块：sharedassets3.assets Mesh#78 Conveyor1x1 140顶点108三角；#81 Conveyor1x1End 173顶点162三角；#86 Conveyor1x1Start 722顶点975三角；#97 ConveyorTurn 661顶点880三角。
- 调色系统：resources.assets#10233 PixelMaterialDataListSo Main Pixel Materials，34个 PixelMaterial资源，ID0–33。每个关联多个块/对象材质。基础BlueBlock(#18)/RedBlock(#576)不挂_BaseMap贴图，以_BaseColor/_SColor等属性调色。

## 主UnityFS资源规格

- 723 Texture2D、433 Mesh、1056 Material、1224 Sprite、24 SpriteAtlas、156 AudioClip、889 ParticleSystem、5 Animator、2 AnimationClip。这是主UnityFS，不含另外动态Bundle的合计。
- 607/723 Texture2D 为 ASTC_6x6（枚举50）；89 RGBA32（4）；14 Alpha8（1）；7 ASTC_4x4（48）；2 RGB24（3）；2 ETC2_RGBA8（45）；1 ASTC_8x8（51）；1 ETC2_RGBA8Crunched（47）。0×0尺寸纹理含占位资源，不作为有效美术图尺寸。
- 常见尺寸1024²(94)、256²(75)、512²(51)，2048²(14)，图集最大4096²。大量UI/插画贴图mipCount=1。
- 例：Splash Art 2048²；FeatureImage_ConveyorWall/HardPixel/PigCell 1024²；Button SpriteAtlas 2048²；Rush SpriteAtlas 4096²；ConveyorShadow 809×917；ConveyorTurn 1025²；Oculusion_Pig 468²。
- UI采用Canvas/RectTransform/SpriteAtlas，配TMP/SDF字体材质；大量粒子与Glow/Alpha/Additive材质增强消除、射击与奖励反馈。

## 可复用的制作思路（分析推断）

把成本集中在少量圆角基础块、一个可换色的猪模型、若干机关模型、传送带直线/弯角/起终点模块，再通过材质与关卡像素坐标组合扩充内容。UI与教学机关说明使用2D成图并打图集。不要为每关单独制作完整3D场景。

## 图像与限制

texture-contact-sheet.png 是包内原始贴图解码联系表，非实机截图。level-reconstruction.png 根据主funnel关卡1/10/50/100/500/1000的PixelImageData与实际材质_BaseColor重建，显示布局结构；不含3D几何、机关、灯光、shader色彩处理和相机。它不代表最终屏幕颜色或现场效果。

asset-summary.json保留完整结构化资源清单、材质shader关联、34色色表、相机序列化数据、候选配置对象头。

未确认：运行时画面最终分辨率、真实draw calls/FPS/内存、运行时相机覆盖、实际激活资源及材质选择；没有美术源文件，不能推断具体DCC工具与原始贴图绘制流程。自定义MonoBehaviour类型树被剥离，只能读标准头和原始字节；PlayerSettings布局与解析库有4字节差异，本轮未据此推断目标帧率或方向。
