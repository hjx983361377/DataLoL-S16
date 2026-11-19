# S16 数据中心 · Apple 风格重设计 Spec

## 1. 判断（决定，不再问）
- **是什么/给谁**：2026 全球总决赛（S16）的数据档案站。给看完比赛、想知道"为什么"的观众；也给自己做开发练手。
- **三个词**：calm / precise / luminous（安静、精确、通透）。
- **签名**：把 Apple 产品页的语言搬到电竞数据上——超大紧字距标题 + 一块全幅 "hero 产品图"（总决赛英雄原画），数据用发丝线、接近黑白灰的层级，只用一种强调色。
- **输出**：沿用现有 React 18 + Vite + 手写 CSS 栈（web/），不引入 Tailwind / 组件库，保持零外网依赖。
- **范围**：整站（总览 + 比赛列表），含导航、页脚。

## 2. 参考（读过全文）
- examples/halo-usd-landing.md：浅色高级感、#F5F5F5 页面底、黑色胶囊按钮 + 白色箭头圆、卡片圆角 16–24、大标题 letter-spacing −0.03em。→ 借**按钮/圆角/浅底**。
- examples/network-hero.md：入场编排（nav 下移、内容上浮、stagger）、下划线 hover。→ 借**入场节奏**，不借旋转渐变边框（太"AI 味"）。
- examples/neo-museum.md 的编辑式排版意识：眉标 + 大标题 + 发丝线分层。
- 明确不借：紫/靛渐变、发光球、玻璃拟态堆叠、金色电竞装饰、卡片阴影堆满。

## 3. Design tokens
~~~css
--bg:#fbfbfd; --card:#ffffff; --tile:#f5f5f7;
--ink:#1d1d1f; --ink-2:#6e6e73; --ink-3:#86868b;
--line:rgba(0,0,0,.085); --line-soft:rgba(0,0,0,.05);
--accent:#0071e3; --win:#0e7a46; --loss:#b3261e;
--r-lg:28px; --r-md:18px; --r-sm:10px;  --max:1180px;
font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
      "Helvetica Neue", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
~~~
字体只用系统栈（Apple 自己的做法），不加载 webfont：断网、无 CDN 也能跑，Windows 回退到 Segoe UI / 微软雅黑，仍是同一套几何无衬线气质。

## 4. 排版尺度
| 角色 | 规格 |
|---|---|
| H1 hero | clamp(44px, 7.2vw, 96px) / 600 / -0.035em / 1.04 |
| H2 区块 | clamp(30px, 3.4vw, 52px) / 600 / -0.03em / 1.08 |
| H3 子块 | 21px / 600 / -0.01em |
| 正文 | 17px / 1.55 / -0.011em；次要 #6e6e73 |
| 大数字（KPI） | clamp(40px, 4.6vw, 60px) / 600 / -0.03em / tabular-nums |
| 眉标 | 12px / 600 / +0.14em / uppercase / #86868b |
| 表格数字 | 17px / 400 tabular-nums；次要 #6e6e73 |

## 5. 结构
### 导航（fixed 48px）
rgba(251,251,253,.72) + backdrop-filter blur(20px) saturate(180%)，底部 1px 发丝线；左"S16 世界赛数据中心"，右：赛事总览 · 比赛列表（12px，#6e6e73，active #1d1d1f）。

### 总览
1. **Hero**（白底居中）：眉标 → H1「九十八局。一个赛季。」→ 副标（21px）→ 黑色胶囊「浏览全部比赛」+ 文本链接「先看总览 ↓」→ **全幅 hero 卡**（圆角 32，16:8.5，右侧 Ezreal 原画，左侧黑→透明渐变），卡内左下：总决赛 · 2026-11-14 / **BLG 3 – 1 Gen.G**（72px 白）/ 4 局 · 补丁 16.20。
2. **赛季概览**：6 个 KPI（98 局 / 46 系列赛 / 19 队 / 96 位选手 / 33:40 场均 / 103 英雄），一句说明。
3. **赛程与战报**：左右两栏，左=阶段分布（细条 3px，#1d1d1f 填充），右=最新 8 个系列赛（行 hover #f5f5f7）。
4. **队伍战绩**：19 行表格，发丝线分隔，胜率带 56px 细条；胜/负用 #0e7a46 / #b3261e。
5. **英雄焦点**：4 张原画大卡（4:5，圆角 24，底部黑渐变），显示中文名 + 出场数 + 胜率。
6. **BP 榜**：出场最多 / Ban 最热两列，行内 32px 图标，无进度条。
7. **页脚**：三行法律/来源小字，发丝线上边框。

### 比赛列表
眉标 → H1「46 个系列赛」→ 说明 → **筛选条**（sticky top:48，白底毛玻璃）：三个圆角下拉 + 重置 + 计数 → **行列表**：日期 / 阶段小标签 / 队伍 logo+名 / 比分（大号 tabular）/ 局数 / 箭头；hover 底色 #f5f5f7，发丝线分隔。

## 6. 动效
- Hero 入场：眉标 0s、H1 .08s、副标 .16s、按钮 .24s、媒体卡 .34s；opacity 0→1 + translateY 18px，0.9s cubic-bezier(.22,1,.36,1)，**纯 CSS 动画**（JS 挂了也不会白屏）。
- 滚动揭示：IntersectionObserver 一次触发，y 24px，0.8s，同 easing，卡片 stagger 80ms。
- hover：行底色 180ms；卡片 scale 1.015 / 240ms；按钮 #1d1d1f → #000；focus-visible 2px #0071e3 外圈。
- prefers-reduced-motion：全部 transform 取消、只保留透明度直接到位；不做无限循环动画。

## 7. 可访问性 & 边界
- 语义标签、真实 alt（队伍名/英雄中文名）、lang="zh-CN"、color-scheme: light。
- 数据为空/加载失败时给安静的状态页，不用骨架闪烁。
- 移动端：导航收起为品牌 + 两个链接；KPI 2×2；表格横向滚动；hero 卡改 4:5，文字在底部渐变上。