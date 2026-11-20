# S16 赛事数据分析站（Worlds 2026）

LoL S16 世界赛（入围赛 + 瑞士轮 + 淘汰赛）的离线数据集与站点工程。数据已全量落地（**98 局 / 46 个系列赛 / 19 支队伍**），站点本身尚未开工，下一步是 P0 骨架。

## 目录结构

~~~
data/
  games.json              98 局完整记录（前端只读这一个就够）
  series.json             46 个系列赛的赛程、阶段、比分、补丁、日期
  summary.json            聚合榜：队伍场次 / 英雄出场 / 英雄被 ban
  raw/                    146 份原始 HTML 快照（85 MB，git 忽略，可重解析）
tools/
  collector/              采集器：抓取 → 解析 → 校验（详见其 README）
  assets/fetch_assets.py  静态素材本地化：英雄 / 装备 / 技能 / 队伍 logo
public/assets/
  champions/              107 个出场英雄头像（DataDragon 16.20.1）
  items/                  193 个出场装备图标
  spells/                 9 个召唤师技能图标
  teams/                  18 支队伍 logo（lolesports API；Los Grandes 暂无）
  data/champion_map.json  gol.gg 名 → DataDragon key / Riot id / 中文名 / 图标路径
  data/team_map.json      gol.gg 队名 → logo 路径
~~~

## 数据管线

~~~bash
cd tools/collector
python build.py        # data/raw/*.html  ->  data/games.json + data/summary.json
python validate.py     # 字段完整率 + 系列赛比分一致性，失败时退出码 1
~~~

刷新数据（世界赛已结束，平时不需要跑）：

~~~bash
python collect.py --season S16 --prefix "Worlds 2026"
~~~

依赖 Python 3.10+ 与 beautifulsoup4、lxml。整条管线离线可跑，build/validate 不联网。

## 静态素材（public/assets）

~~~bash
python tools/assets/fetch_assets.py            # 图标 + 元数据，约 11 MB，已本地化
python tools/assets/fetch_assets.py --splash   # 追加英雄原画（107 张，+16.8 MB），已本地化
~~~

素材一次性下到本地，站点断网也能跑。**注意**：`data/games.json` 里的 `id` 是 gol.gg 自己的英雄编号（不是 Riot id，例如 Olaf 在 gol.gg 是 66、在 Riot 是 2），所以图标一律通过 `name` 归一化后用 `champion_map.json` 查，别拿 `id` 直接对 DataDragon。

## 单局数据契约（data/games.json）

| 字段 | 说明 |
|---|---|
| game_id | gol.gg 对局 id |
| duration_seconds | 时长（秒） |
| patch | 版本，如 16.20 |
| gold_diff | {minutes:[0..N], diff:[蓝-红经济差]} 逐分钟曲线，场均 35 个点位 |
| teams | 两队：name / side / win / kills / towers / dragons / barons / gold / first_blood / first_tower / dragon_types |
| bans | {blue:[10 个内前 5], red:[...]}，元素 {name, id}，保留顺序 |
| picks | 同上，选人顺序 |
| players | 10 人：team / name / champion / champion_id / kda[3] / cs / items[] / spells[] / stats |
| players[].stats | 来自页面 Gold distribution / Damage distribution 两表：gold（总经济）/ gold_share（占全队 %）/ gpm / damage（总伤害）/ damage_share / dpm / damage_per_gold（伤转 = 伤害 ÷ 经济）。damage = DPM × 分钟数，gold = 队伍总经济 × 占比，两者已与原始占比交叉校验（98 局误差 < 0.1pp） |
| timeline | 事件流：{time:"mm:ss", event:"First blood|Hextech Drake|...", side} |
| series_id / stage / date / tournament / series_score / series_teams | 所属系列赛元信息 |

stage 取值：ROUND1..ROUND5、QUARTERFINALS、SEMIFINALS、FINALS。

## 站点（web/，全容器化开发）

~~~bash
docker compose up -d      # 起 node:22-alpine 容器跑 Vite dev，http://localhost:5173
docker compose logs -f web  # 看编译日志
~~~

宿主机不需要装 Node，只留 Docker 和浏览器；源码挂在容器里，改文件即时 HMR。当前 P0 页：

- `/` 赛事总览：6 项 KPI、阶段分布、最新战报、19 队战绩表（胜率/蓝红方/场均大小龙）、出场最多与 Ban 最热
- `/matches` 比赛列表：按赛事 / 阶段 / 队伍筛选，46 个系列赛

规划中：`/stage/:stage`、`/match/:seriesId?game=n`（BP + 选手表 + 经济曲线）、`/team/:id`、`/player/:id`、`/champion/:id`、`/compare`。
- 路由：/ 总览、/stage/:stage、/matches、/match/:seriesId?game=n、/team/:id、/player/:id、/champion/:id、/compare
- 素材本地化：DataDragon 英雄头像 / 装备 / 技能图标、队伍 logo 一次性下到 public/assets，避免断网白屏
- 升华点（P1/P2）：一句话复盘、BP 桑基图、风格画像、中文观赛黑话、"如果"模拟

## 数据来源与版权

- 赛事数据：gol.gg（页面抓取，已限速，快照存 data/raw/）
- 英雄 / 装备等静态素材：DataDragon、CommunityDragon
- 赛事与游戏内容版权归 Riot Games；站点页脚需署名数据来源，勿商用转售
