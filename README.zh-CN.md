# PipeSonata

[![CI](https://github.com/KanadeK/pipesonata/actions/workflows/ci.yml/badge.svg)](https://github.com/KanadeK/pipesonata/actions/workflows/ci.yml)
[![Security](https://github.com/KanadeK/pipesonata/actions/workflows/security.yml/badge.svg)](https://github.com/KanadeK/pipesonata/actions/workflows/security.yml)
[![Release](https://img.shields.io/github/v/release/KanadeK/pipesonata?color=abc42b)](https://github.com/KanadeK/pipesonata/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-abc42b.svg)](LICENSE)

**听见 CI 在哪里等待。** PipeSonata 把 GitHub Actions 一次运行中的耗时、排队、重试、失败和
并行度转化为可检查的可视乐谱、可选的 WebAudio 演奏，以及可以导出的工程证据。

[在线演示](https://kanadek.github.io/pipesonata/) ·
[English](README.md) ·
[输入格式](docs/INPUT_FORMAT.md) ·
[隐私与安全](docs/PRIVACY_AND_SECURITY.md)

![PipeSonata 正在分析内置的快速 GitHub Actions 样例](docs/assets/pipesonata-demo.png)

## 为什么做 PipeSonata

常见 CI 面板会告诉你运行是否通过。PipeSonata 是一个本地优先的分析仪器，用来回答运行究竟
在哪里等待，以及哪条依赖序列限制了完成时间。

- 使用 Zod 解析合并的 GitHub Actions 数据，或同时解析 run/jobs 两份标准响应。
- 保留任务和步骤耗时、排队时间、执行次数、重试次数、状态与结果。
- 计算观测并行度和基于依赖关系的关键路径。
- 识别重复安装、不稳定重试、失败工作和明显排队。
- 从同一个确定性分析结果生成 D3 时间线与 WebAudio 音符计划。
- 导出 SVG、2 倍分辨率 PNG、类 MIDI 音符 JSON 和已脱敏的 Markdown 工程报告。
- 导入文件只留在当前浏览器标签页中，不含上传接口、统计分析或遥测。

仓库自带快速扇出、串行瓶颈和浏览器测试抖动三个样例。集成测试会验证它们的预期关键路径、
峰值并行度和最终结果。

## 快速开始

环境要求：Node.js 22.12 或更高版本，以及 npm。

```bash
git clone https://github.com/KanadeK/pipesonata.git
cd pipesonata
npm ci
npm run dev
```

打开终端中显示的本地地址。无需联网即可加载快速样例。你可以切换其他样例、选择一份合并 JSON，
或一次选择 GitHub run 响应和 jobs 响应两份文件。

要验证生产构建并生成真实导出：

```bash
npm run demo
```

该命令会在 `demo-output/` 生成四类文件，并刷新 README 使用的真实界面截图。
生成文件清单和人工验收步骤见[可复现实演](docs/DEMO.md)。

## 导入 GitHub Actions 数据

PipeSonata 接受两种输入：

1. 同时包含 `run` 和 `jobs` 的合并对象，格式可参考 [`examples/`](examples/)。
2. 一份标准 GitHub workflow run 响应和一份标准 jobs 响应，在文件对话框中同时选择。

使用 GitHub CLI 获取数据：

```bash
gh api repos/OWNER/REPOSITORY/actions/runs/RUN_ID > run.json
gh api "repos/OWNER/REPOSITORY/actions/runs/RUN_ID/jobs?filter=all&per_page=100" > jobs.json
```

导入时同时选择这两份文件。run 响应本身不含步骤耗时和依赖数据，因此 PipeSonata 会明确提示
缺失内容，不会虚构依赖图。

字段、大小限制、依赖元数据和错误行为见[输入格式](docs/INPUT_FORMAT.md)。

## 如何阅读乐谱

| 信号       | 视觉映射                             | 音频映射                       |
| ---------- | ------------------------------------ | ------------------------------ |
| 任务       | 一条带名称的横向轨道                 | 一个乐器声道                   |
| 步骤耗时   | 从实际开始到结束的横向色块           | 音符开始时间和长度             |
| 成功       | 酸橙绿色块                           | C 小调五声音阶                 |
| 失败或超时 | 珊瑚红色块                           | 更低的锯齿波音符和失败终止式   |
| 关键路径   | 高亮描边和左侧标记                   | 稳定的声道分配                 |
| 排队与重试 | 摘要指标和按优先级排列的工程热点卡片 | 保留在音符来源信息和工程报告中 |

声音默认关闭。播放必须由用户主动点击，并且只使用浏览器 WebAudio API。长工作流会按比例压缩，
便于在合理时间内回顾。

## 导出内容

| 输出         | 用途                                              |
| ------------ | ------------------------------------------------- |
| SVG 乐谱     | 可编辑、带标签和提示信息的无障碍矢量时间线        |
| PNG 乐谱     | 使用当前主题背景生成的 2 倍分辨率分享图片         |
| 类 MIDI JSON | 含音高、MIDI 编号、声道、力度和时间的稳定音符计划 |
| 工程报告     | 汇总耗时、并行度、关键路径和热点的 Markdown 文档  |

所有输出都来自同一份不可变的 `WorkflowAnalysis`。具体格式见[输出格式](docs/OUTPUT_FORMATS.md)。

## 确定性样例

| 样例                                                        | 任务 / 步骤 | 预期关键路径                                           | 峰值并行 | 结果 |
| ----------------------------------------------------------- | ----------: | ------------------------------------------------------ | -------: | ---- |
| [`fast.json`](examples/fast.json)                           |       5 / 9 | `prepare -> test -> package`                           |        3 | 成功 |
| [`serial-bottleneck.json`](examples/serial-bottleneck.json) |       5 / 8 | `prepare -> compile -> unit -> integration -> package` |        1 | 成功 |
| [`flaky.json`](examples/flaky.json)                         |       4 / 8 | `prepare -> e2e -> report`                             |        2 | 失败 |

这些样例完全由项目合成并采用 MIT 许可，不包含生产数据或凭据。

## 架构

```text
GitHub Actions JSON 或确定性样例
                 |
               输入适配器
                 |
        Zod 验证后的规范化模型
                 |
      耗时、并行轨、关键路径、热点
                 |
            确定性乐谱模型
             /          \
          D3 视觉      WebAudio
             \          /
       SVG、PNG、音符 JSON、Markdown
```

纯领域逻辑位于 `src/core/`，外部格式从 `src/adapters/` 进入，浏览器服务和组件位于
`src/features/`。界面、音频引擎和导出器不会各自重新计算工作流语义。架构不变量和扩展边界见
[架构文档](docs/ARCHITECTURE.md)。

## 开发与验证

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:coverage
npm run test:e2e
npm run build
npm run benchmark
```

CI 使用的发布入口如下：

```bash
npm run verify
npm run audit:dependencies
npm run package
npm run release-check
```

`verify` 会执行 8 道本地质量门禁。`package` 会生成带版本号的静态站点、演示、源码、SBOM、
来源证明和校验和文件。`release-check` 会验证初始里程碑历史、作者与提交者身份、归档内容、
校验和、干净来源状态，以及从解压静态包启动的浏览器烟测。

当前发布基线包含 33 项 Vitest 测试和 5 条真实 Chromium 路径。核心代码行覆盖率 99.01%、
函数覆盖率 100%、分支覆盖率 90.5%、语句覆盖率 99.04%，各项门槛均为 80%。基准方法与实测
数据见[性能基准](docs/BENCHMARK.md)。

## 隐私与威胁边界

- 通过浏览器 `File` API 读取导入文件，不会上传。
- Markdown 报告会脱敏常见 Bearer Token、JWT、URL 凭据、密码、Cookie 和密钥赋值。
- 仓库名、提交标识、操作者名称和内部任务名称不一定属于密钥，分享前仍需人工检查。
- 静态应用不包含账号、后端、统计分析、广告或持久 Token 存储。

详情见[隐私与安全](docs/PRIVACY_AND_SECURITY.md)和 [SECURITY.md](SECURITY.md)。

## 范围和限制

v0.1.0 每次只分析一次已完成或正在进行的运行。它不会轮询 GitHub、对比历史运行、声称已经
确定根因、生成标准 MIDI 文件，也不会推断缺失的 `needs` 关系。缺少依赖元数据时，关键路径会
被明确标记为下界。

GitHub jobs 接口在超过 100 个任务时可能需要分页。PNG 质量依赖浏览器 Canvas 支持。音频是
解释辅助，不会代替视觉和文本形式的无障碍信息。

## 差异化

公开仓库扫描发现了相邻的工作流面板、遥测采集器、可视化工具和通用数据声音化项目，但没有同名
仓库，也没有高度同构且活跃的 MVP。PipeSonata 保留三条明确边界：确定性的离线输入、视觉与
音频共用一个模型、艺术表达旁边同时给出工程诊断。详情见[竞品扫描](docs/COMPETITOR_SCAN.md)。
该扫描不构成“全球唯一”的声明。

## 路线图

- 带明确数据来源的历史运行对比。
- 使用短期、最小权限凭据的可选 GitHub 适配器。
- 标准 MIDI 文件导出和更丰富的无障碍乐谱叙述。
- 面向超大任务图的 Web Worker 分析。

## 常见问题

**PipeSonata 会把工作流数据发送到其他地方吗？**
不会。发布的静态应用没有上传接口。通过浏览器开发者工具可以验证，导入样例的分析不需要网络请求。

**为什么需要两份 GitHub API 文件？**
run 接口描述工作流运行，jobs 接口包含任务和步骤。也可以直接使用一份合并文件。

**关键路径一定精确吗？**
对于输入中提供的 `needs` 图和实际耗时，它是精确的。缺少依赖元数据时，只报告最长观测任务作为下界。

**可以在自动化流水线里播放音频吗？**
浏览器播放需要用户手势。自动化场景应使用确定性的音符 JSON 导出。

## 参与贡献与许可

欢迎提交范围清晰的 Issue 和 Pull Request。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 和
[行为准则](CODE_OF_CONDUCT.md)。安全问题请按 [SECURITY.md](SECURITY.md) 报告。
维护者可参考[发布流程](docs/RELEASING.md)。

PipeSonata 采用 [MIT License](LICENSE) 开源。
