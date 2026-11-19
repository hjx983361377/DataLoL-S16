# collector —— S16 数据采集器

把 gol.gg 的赛事页面抓成不可变 HTML 快照（data/raw/），再解析成站点可读的 JSON。

## 三个入口

~~~bash
python collect.py --season S16 --list                       # 列出该赛季赛事
python collect.py --season S16 --prefix "Worlds 2026"        # 抓赛程 + 系列赛页 + 单局页
python collect.py --season S16 --series-only                 # 只刷新 series.json
~~~

~~~bash
python build.py      # data/raw/*.html -> data/games.json + data/summary.json
python validate.py   # 一致性校验，退出码非 0 表示数据有问题
~~~

常用参数：--refresh 忽略本地快照重新下载；--sleep 0.5 请求间隔；--tournament 指定单个赛事全名（可重复）。

## 文件

| 文件 | 职责 |
|---|---|
| paths.py | 目录常量（ROOT / DATA / RAW 及各 JSON 路径） |
| fetch.py | HTTP：UA、gzip、20 s 硬超时、2 次重试、缓存读写 |
| parse.py | 单局 HTML → 结构化记录（也可命令行单局调试） |
| collect.py | 赛事列表 → 赛程 → 系列赛 → 单局页面，写入 data/ |
| build.py | 全量解析 + 挂系列赛元信息 + 生成聚合 summary.json |
| validate.py | 字段完整率、系列赛比分与胜负一致性 |

## 数据源要点（gol.gg）

- 赛事列表：POST https://gol.gg/tournament/ajax.trlist.php，表单 season=S16&league=ALL
- 赛程页：https://gol.gg/tournament/tournament-matchlist/{赛事名}/ ，表格列 = 系列赛比分 / 队 / 阶段 / 补丁 / 日期
- 系列赛页：https://gol.gg/game/stats/{series_id}/page-summary/ ，内含各局链接 /game/stats/{gid}/page-game/
- 单局页：https://gol.gg/game/stats/{gid}/page-game/ ，约 600 KB HTML

两个容易踩的点：

1. **series_id 本身就是第一局的 game_id**，解析系列赛页时不要把与 series_id 相同的 gid 过滤掉，否则每个系列赛少一局。
2. **经济差曲线藏在页内内联 JS 里**（变量 golddatas 的第二个 data 数组），不在 HTML 表格中；换版本时优先检查这里。

## 反爬 / 限流（实测教训）

- 单请求 19–37 秒（600 KB 页面），必须用硬超时，否则会无限挂起。
- **不要并发**：6 线程会让 gol.gg 连接既不返回也不断开，全挂住；单线程 + 错开 0.5–1 s 才是稳定解（43 局 769 秒，0 失败）。
- 抓到的 HTML 一律留快照，重解析走缓存（命中即 0 秒），这样才能反复改解析器而不重新打站点。

## 解析器实现要点（parse.py）

- 时长：Game Time 后紧跟的 h1 里的 mm:ss
- 版本：col-3 text-right 区块的 v16.20；兜底正则要避开页面里 jQuery 的 v5.1
- 战队：blue-line-header / red-line-header 的父 div.col-12，比分是 span.score-box 内 img alt 上的数值（46.8k 要乘 1000）
- Bans / Picks：块内第一列为 Bans/Picks 的 row，链接里 champion-stats/{id} 是英雄 id
- 选手：两张大表（表头含 KDA），第 1 张蓝方、第 2 张红方；英雄在首列 champion_icon 的 alt；CS 取 KDA 之后第一个纯数字格
- 时间线：span.blue_action / span.red_action，文本前缀 mm:ss，img alt 是事件名

## 加新赛季 / 新赛事

~~~bash
python collect.py --season S17 --list
python collect.py --season S17 --tournament "Worlds 2027 Main Event"
python build.py && python validate.py
~~~

series.json 会被整体重写成"本次抓取的赛事集合"，所以换赛季时把该赛季的赛事一起传进去，避免只留一半。
