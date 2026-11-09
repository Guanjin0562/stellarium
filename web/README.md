# 东亚星空 · 离线 HTML 浏览器 / Offline skyculture viewer

**Mac HTML 适配 / adaptation: [Wenshuishi0528](https://github.com/Wenshuishi0528).**

基于本分支已有的恒星、星空文化和古星表数据，提供无需安装 Qt 的浏览入口。保留 Stellarium、观津邀月（Kwantsin）以及各文化与星表原作者的署名和许可。

## 打开 / Open

下载本仓库后，直接用 Safari、Chrome 或 Edge 打开 [`index.html`](index.html)。它是独立的离线 HTML 文件，不依赖服务器、CDN 或运行时下载；需要分享时可连同 `COPYING` 一起复制。

Open `web/index.html` in a browser after downloading the repository. The checked-in HTML is self-contained: no Qt installation, web server, CDN, or network fetch is required. Safari on macOS has been tested; other browser/platform combinations have not yet been manually verified.

## 功能 / Features

- 33 套星空文化，包括中国历代、满族、彝族、傣族、日本、朝鲜等及现代星座对照。
- 来自本仓库的 45,757 颗 Hipparcos/Gaia 恒星，星官连线与名称，中文星名与 HIP 编号搜索。
- 拖动、滚轮与双指缩放、方向键平移，赤道网格、黄道和指定观测地的地平线。
- 60 组内置星表、28,633 条原始记录，保留原始文件与元数据；可导入相同格式 JSON。
- 传统入宿度／去极度、赤道、黄道、银道、超星系与地平坐标换算；古星表与 HIP 证认星连线。
- 星表坐标 CSV 导出、PNG 星图保存和红光模式。

Use the **观星** tab for culture selection and search; **古星表** for historical catalogs, JSON import and coordinate export; **说明** for scope, attribution and the original culture descriptions. Select a search result to center it. Drag to pan; use the wheel, pinch, or +/− to zoom.

## 范围和坐标精度 / Scope and precision

这是主要功能的浏览器适配，桌面程序的行星星历、写实大气、地景、星座图绘、插件和望远镜控制未移植。

星官直接取自 `skycultures/*/index.json`，恒星解析 `stars/hip_gaia3/stars_*_0v0_*.cat` 的 Star1 记录（依据 `src/core/modules/Star.hpp`），目录历元 JD 2457389.0。古星表取自 `starcatalog/`；继承历元、传统周天度数与距星配置依据 `src/gui/SearchDialog.cpp` 处理。

This is an approximate visualization, not a replacement for the native astrometric engine. It uses Cartesian linear proper motion, IAU 1976 precession and mean obliquity. Nutation, aberration, refraction, parallax and full 6D propagation are not implemented; ancient epochs in particular require checking in the native application before quantitative use. The viewer frame follows the selected year; exported coordinates are in the J2000 frame.

全量核验有 28,189 条记录可换算，444 条因缺少坐标、坐标系或坐标不合法而跳过。原生版中未指定坐标系的文件取决于搜索窗口的当前选项，本网页会说明并跳过这些记录。每组星表显示有效和跳过数量，展开元数据可查记录及原因。

## 生成和核验 / Build and verify

Python 3 builds the HTML from this checkout; Node.js runs the coordinate and dataset checks. Neither is needed just to open the generated page. No third-party packages are required.

```sh
python3 web/build.py
node --check web/viewer.js
node web/verify.cjs
```

`build-report.json` and `verification-report.json` are local, ignored outputs. The HTML embeds the last commit that changed input data. All HIP, Gaia and DSO references in the included cultures resolve in the current dataset.

Checks cover angle and epoch parsing, precession round trips, a solstice control point, the traditional mansion defining-star identity, Sirius/Polaris sanity checks, finite normalized coordinates for every convertible catalog record, all constellation references, and absence of external runtime dependencies.

Manual Safari checks on macOS cover opening with `file://`, 北斗 search and details, switching to the Japanese Yasui map, the Jingyou catalog at epoch 1034.5 (288/294 valid), HIP comparison lines, marker details and local import of the two groups in `starcatalog/test.json`. The native C++ application was not built or tested for this additive viewer change.

## 作者与许可 / Attribution and license

Mac HTML adaptation by **Wenshuishi0528**. The viewer code is GPL-2.0-or-later; see [`COPYING`](COPYING). The original Stellarium and enhanced-branch authors retain their existing credits. Skyculture and catalog data retain their original authors and licenses; the bundled culture descriptions and original catalog metadata are preserved in the HTML and available in its **说明** and **古星表** tabs. Original relative illustration links in descriptions refer to their source culture folders; artworks are not bundled into this viewer.
