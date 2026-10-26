---
name: 幸运时刻
description: 以同场姓名球、克制黑红与轻玻璃控件呈现现场抽奖。
colors:
  primary: '#d83243'
  primary-hover: '#e44757'
  orbit-accent: '#f77582'
  scene-ground: '#101013'
  scene-ink: '#f6f5f7'
  muted: '#aaa9b3'
  surface: '#242329'
  scene-line: '#45454d'
  dock-glass: '#25252ddb'
  settings-glass: '#202027f5'
  field: '#29262f'
  field-line: '#46414d'
  segment-ground: '#15151b'
  segment-selected: '#46404f'
  next-surface: '#f1eff4'
  next-ink: '#15151a'
  focus: '#ff6c7e'
typography:
  display:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
    fontSize: clamp(48px, 5vw, 76px)
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.05em
  headline:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
    fontSize: clamp(34px, 3.1vw, 52px)
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: -0.025em
  title:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
    fontSize: 15px
    fontWeight: 500
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
    fontSize: 14px
    lineHeight: 1.8
  label:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
    fontSize: 12px
  action:
    fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif
    fontSize: 18px
    fontWeight: 550
    letterSpacing: 0em
rounded:
  badge: 6px
  segment-item: 7px
  header-action: 9px
  field: 10px
  segmented: 11px
  dock-setting: 12px
  action: 15px
  winner: 16px
  popover: 18px
  dock: 23px
  circle: 50%
spacing:
  space-4: 4px
  space-8: 8px
  space-10: 10px
  space-12: 12px
  space-16: 16px
  space-18: 18px
  space-20: 20px
  space-23: 23px
  space-24: 24px
  space-26: 26px
components:
  button-draw:
    backgroundColor: '{colors.primary}'
    textColor: '#fff'
    typography: '{typography.action}'
    rounded: '{rounded.action}'
    padding: 15px 24px
  button-draw-hover:
    backgroundColor: '{colors.primary-hover}'
  button-next:
    backgroundColor: '{colors.next-surface}'
    textColor: '{colors.next-ink}'
    typography: '{typography.action}'
    rounded: '{rounded.action}'
    padding: 15px 24px
  button-secondary:
    backgroundColor: '#34303d'
    textColor: '#ede5f4'
    rounded: '{rounded.field}'
    padding: 10px 17px
  header-action:
    backgroundColor: transparent
    textColor: '#c4c2cc'
    rounded: '{rounded.header-action}'
    padding: 11px 12px
  field:
    backgroundColor: '{colors.field}'
    textColor: '#f4f3f5'
    rounded: '{rounded.field}'
    height: 42px
    padding: 0 13px
  segmented:
    backgroundColor: '{colors.segment-ground}'
    rounded: '{rounded.segmented}'
    padding: 4px
  round-badge:
    backgroundColor: '#3a303f'
    textColor: '#d5c7dd'
    rounded: '{rounded.badge}'
    padding: 4px 7px
  winner-card:
    backgroundColor: '{colors.surface}'
    textColor: '#f6f3f8'
    rounded: '{rounded.winner}'
    padding: 30px 20px
  control-dock:
    backgroundColor: '{colors.dock-glass}'
    rounded: '{rounded.dock}'
    padding: 9px
  settings-popover:
    backgroundColor: '{colors.settings-glass}'
    rounded: '{rounded.popover}'
    width: 342px
    padding: 0 0 16px
---

# Design System: 幸运时刻

## Overview

**Creative North Star: "同场等待"**

幸运时刻的视觉中心是共同参与：姓名在同一个有边界的圆形空间内运动，主持人的操作停靠在下方，结果在前景清楚显现。近黑底、柔白姓名与少量红色把期待感留给内容本身。

密度集中在姓名与必要设置中，其余区域保留呼吸。沿用用户明确选择的 iOS 风格系统字体；轻玻璃只服务于浮动操作条和设置浮层。此记录提取自已完成的方案 A 实现，源代码的最终样式级联为准。

**Key Characteristics:**

- 共同圆形边界内的姓名与细微轨道红色。
- 近黑舞台、柔白主信息、低对比次要信息。
- 柔和圆角、低幅度阴影、有限范围的玻璃。
- 主持人操作清楚，结果与保存状态相互呼应。

实际依据：`src/immersive.css` 在 `src/styles.css` 之后加载；组件依据为 `Stage.tsx`、`NameUniverse.tsx` 与 `App.tsx`。本系统为代码实现后的记录；没有使用生成式效果图建立新的资产规范。场景由 Canvas 绘制，图标来自 Lucide SVG；既有应用图标早于本次页面改动。

## Colors

色彩由克制的动作红与带轻微紫调的近黑中性色组成；上方 frontmatter 是精确值的规范来源。

### Primary

- **动作红**（`primary`）：开始、停止与通用主要操作；悬停采用 `primary-hover`。
- **轨道珊瑚红**（`orbit-accent`）：球面外缘短弧及端点，用于显示运动方向而非填满球面。
- **焦点红**（`focus`）：键盘焦点轮廓，保持与悬停状态独立。

### Neutral

- **舞台近黑**（`scene-ground`）：整页底色。
- **姓名柔白**（`scene-ink`）：主信息；姓名在画布内另以深度调节透明度。
- **静谧灰**（`muted`）：轮次、说明与辅助状态。
- **结果炭灰**（`surface`）：中奖结果实色卡片。
- **细边界灰**（`scene-line`）：操作条轮廓。
- **烟灰玻璃**（`dock-glass`、`settings-glass`）：浮动控制与设置层。
- **表单灰**（`field`、`field-line`）：输入底色与轮廓。
- **分段灰**（`segment-ground`、`segment-selected`）：设置分段背景与选中面。
- **下一轮柔白／深墨**（`next-surface`、`next-ink`）：已保存结果之后的继续动作。

**The Reserved Red Rule.** 主红用于主要抽奖动作及开关状态；轨道与状态使用较轻的红色。大片背景保持近黑，避免把红色扩成全场光晕。

## Typography

**Display Font / Body Font:** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif`。

**Character:** 系统字体是用户钉住的 iOS 参考例外；以中等字重、紧凑主标题和自然中文姓名保持原生感。Canvas 姓名字族省略 `SF Pro Display`，其余系统与中文回退一致，字重为 (450)。

### Hierarchy

- **Display**（`display`）：单一中奖姓名；普通多名结果使用 (500)、`clamp(27px, 2.9vw, 44px)`、行高 (1.5)、字距 (.05em)。
- **Headline**（`headline`）：轮次名称；限制最大宽度 (900px)，允许长标题换行并在自身区域滚动。
- **Title**（`title`）：设置浮层标题；品牌为 (17px / 600)，设置分区标题为 (13px)。
- **Body**（`body`）：粘贴名单等输入正文；辅助解释为 (12px)，行高 (1.7)。
- **Label**（`label`）：字段、候选数量与辅助说明；最次要标记为 (11px)。
- **Action**（`action`）：舞台主操作；操作条的小设置值为 (15px / 450)，上方小标签为 (11px)。
- **Canvas names**：字号随球体半径与深度变化，最低 (12px)。完整姓名超过九个字符时画布取首尾各四字并加省略号；中奖结果仍展示完整姓名。长结果姓名使用独立缩小、换行处理，六名以上使用紧凑结果样式。

**The Native Type Rule.** 保留用户明确认可的 iOS 风格系统字族，不把另加的装饰展示字体引入当前界面。姓名的字形、字距和完整可读性优先。

## Layout

采用占满窗口的舞台，而不是左右分栏。上方品牌与管理操作、中央标题／轮次、圆形姓名空间、底部居中操作条构成主轴。统计与保存状态贴近下边缘，视觉层级低于舞台动作。

桌面标题起点为 (100px)，姓名区域为上 (187px)、左右 (48px)、下 (180px)。操作区距底 (48px)。结果区域独立覆盖前景（上 205px、左右 9%、下 190px），在自身区域滚动；结果卡片居中换行，最大总宽 (1080px)，常规间隙 (18px)。设置浮层宽 (342px)，距右 (24px)、距顶 (82px)，以窗口高度限制自身滚动。最小桌面窗口下浮层仍保留主抽奖按钮可见。

间距不是推导出的等比系统：沿用 frontmatter 的实际间距步骤。字段组间距为 (23px)，浮层左右内边距为 (24px)，操作条间隙为 (10px)，结果内部依层级使用 (18px / 27px) 间隙。

Native Electron 默认窗口为 (1380×900)，最小为 (960×680)。高度不超过 (820px) 且宽度至少 (801px) 时，标题与球体上移、主按钮高度收为 (50px)；宽度不超过 (1100px) 时简化顶部图标和底部状态。宽度不超过 (800px) 时缩小操作条、标题与边距，并隐藏低优先管理项；(480px) 再压缩品牌与按钮。较窄浏览器是补充适配，不改变桌面产品定位。已复核 (879×984) 预览。

**The Shared Bounds Rule.** 可见姓名的完整文字边界必须落在同一个球体内；球外不散落候选姓名，圆心不放遮挡姓名的装饰实体。

球体半径取 `min(width × .37, height × .445, 360)`，圆心为区域宽度的 (.5)、高度的 (.48)。Canvas 最多建立 (128) 个视觉采样点；碰撞与完整文字边界筛选后，可见姓名数会更少。绘制像素比最多 (2)。这套显示采样与实际随机抽取独立。

全屏隐藏常规顶部管理、底部统计及状态，保留舞台动作、左上品牌和退出全屏控件。设置浮层显式打开时仍可使用。

## Elevation & Depth

背景平静，深度集中在姓名球的微妙明暗、有限的玻璃和柔软阴影。球体以低对比径向灰阶与细经线表达体积；结果出现时背景姓名降低至 (.10) 透明度，避免竞争。

### Shadow Vocabulary

- **操作条悬浮**（`0 14px 40px #0004`）：浮动玻璃下的环境阴影。
- **主要动作**（`0 4px 12px #0002`）：按钮的轻微重量感。
- **结果前景**（`0 18px 44px #0004`）：实色中奖卡片。
- **设置浮层**（`0 20px 60px #0006`）：临时设置层。
- **模态对话框**（`0 30px 100px #0009`）：名单、导入与历史对话框。

操作条模糊为 (24px)，设置为 (28px)。对话框遮罩另以暗色和 (10px) 模糊建立任务层级。细边界与顶部柔暗线可与阴影并用。

**The Quiet Glass Rule.** 玻璃用于浮动操作条和设置浮层；结果卡片以实色承载姓名。深度来自透明层、细边界和柔软阴影。

## Shapes

圆是候选范围与运动的核心形状；控件采用柔和矩形。操作条、设置／模态、结果、主按钮、输入、分段选项按 frontmatter 中的角色圆角区分层级，不把所有元素处理成胶囊。圆形头像、微小状态点与球体边界是实际已有的圆形语言。品牌保留四瓣小方块及轻微旋转。

常规结果卡片只有顶部 (1px) 细线，输入与玻璃层使用完整细轮廓；不是统一的无边框系统。紧凑结果卡片改用 (12px) 圆角。

## Components

### Buttons

主动作清楚、柔和、有分量。抽奖按钮的最小尺寸为 (206×58px)，形状与内边距见 `button-draw`；悬停只更换动作红，按下缩放至 (.98)。背景和变换使用 (.15s) 过渡。禁用舞台动作透明度为 (.45)。结果后的 `button-next` 使用柔白底深字。对话框使用较小的主要与次要按钮；顶部管理动作保持透明，悬停或打开状态增加暗灰底。

所有按钮、链接、输入、文本域保留 (2px) 焦点轮廓与 (4px) 外偏移；数值步进输入的焦点偏移为 (1px)。

### Navigation

顶栏是低调的管理动作列，常规字号为 (13px)，最小高度为 (42px)。设置内容通过“抽奖规则”与“动效与揭晓”两页分段切换；分段外壳暗、选中面稍亮，无额外阴影。选项最小高度为 (38px)，内圆角为 (7px)。隐藏面板与隐藏浮层使用真实 `display: none`，不可盖住舞台交互。

### Chips

轮次标签是紧凑圆角标记（`round-badge`）；历史次数为小方形数字徽章。它们传递次要计数，不作为舞台标题上方的装饰标语。

### Cards / Containers

中奖卡片实色、居中、无姓名卡壳式候选展示。普通卡片弹性基准宽 (210px)、最小高 (145px)，六名以上收为 (146px / 102px)。单人结果最小宽 (260px)，增加内边距；超过六字符的结果姓名缩小且允许换行。初次最多呈现 (120) 个结果，继续按钮按 (120) 个增加，结果区域保持可滚动。

设置浮层与模态沿用同一深色表面家族，但分别使用局部玻璃与实色。设置浮层的分区用细线分隔，字段与名单管理自然垂直排列。

### Inputs / Fields

单行字段高度 (42px)，横向内边距 (13px)，字号 (14px)，圆角见 `field`；获得焦点时边界变为暗红，并保留独立的可见焦点圈。步进器高 (48px)，中间数值为 (25px / 600)，使用等宽数字。滑杆保留原生轨道，红色强调值与拇指。

动画滑杆为 (0.5–2×)，步长 (.25)；只改变姓名球运动。全部揭晓／逐个揭晓与重复中奖采用分段按钮、开关表达，不引入额外装饰控件。

### Shared Name Sphere

姓名形成共享空间，前后深度通过字号、透明度与缓慢旋转表达。细灰球面和一段珊瑚轨道提供边界；不覆盖中央姓名。静止准备、滚动、收束、结果的目标角速度分别为 (.09 / 1.8 / .025 / .04)，由用户速度倍率调整；速度向目标渐变。

动画在页面隐藏时暂停请求帧。系统请求减少动态效果时，球体保持静态绘制，状态变化仍重绘，CSS 动画和过渡收至 (.01ms)，动画延迟清零；开奖收束等待由 (1100ms) 缩至 (100ms)。普通结果入场使用 (.65s) 的透明度、位移 (20px)、缩放 (.95) 与模糊 (6px) 收束；舞台姓名淡出／模糊使用 (.7s)。缓动为 `cubic-bezier(.16, 1, .3, 1)`。

结果先完整保存再展示。逐个揭晓间隔为 (700ms)，可立即显示全部；重启恢复已保存的完整结果。减少动态效果保留该信息揭晓顺序，去掉视觉运动。

### Floating Control Dock

三段式准备状态把人数、主要动作与停止方式收在一个玻璃外壳中；小设置是透明按钮，悬停有轻微底色。滚动时收为状态与停止动作，揭晓后收为保存／显示全部与下一轮。键盘提示及规则说明位于下方，避免与动作争夺主位。

## Do's and Don'ts

### Do:

- Do 先保证姓名、中奖结果和开始／停止／下一轮操作的可读性，再安排装饰。
- Do 让所有可见候选姓名的完整边界属于同一个球体；大名单使用有上限的视觉样本。
- Do 在抽奖规则与动效／揭晓之间使用明确的设置标签页，并保持隐藏浮层真正不显示。
- Do 保留清晰的键盘焦点、长姓名适配、可滚动结果，以及系统减少动态效果设置。
- Do 以桌面默认窗口和最小窗口检验布局，同时把较窄浏览器预览当作补充验证。

### Don't:

- Don't 在候选姓名周围增加姓名卡壳、球外散落、中央遮挡物、彩纸或宽泛红色光晕。
- Don't 把轻玻璃扩展到每个容器，或用强发光和硬阴影争夺姓名的注意力。
- Don't 用画布上的样本数量、运动速度或显示顺序暗示中奖概率发生变化。
- Don't 把旧样式中未被当前组件使用的装饰模式当作新页面的设计规范。

未固化或修复的缺陷／漂移：无已确认的实质遗留项。系统展示字体是用户明确选择的例外；旧基础样式里未被当前界面采用的发光、彩纸与卡片舞台规则不继承为当前规范。
