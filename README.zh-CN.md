# PipeSonata

PipeSonata 把 CI 工作流的耗时、失败和并行度转换成可操作的可视乐谱。

项目正在开发 `v0.1.0`。默认采用本地优先架构：导入的工作流数据只在浏览器中处理，除非用户明确选择在线适配器。

## 开发

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

更多信息见[架构](docs/ARCHITECTURE.md)、[隐私与安全](docs/PRIVACY_AND_SECURITY.md)和
[公开仓库抽样检索](docs/COMPETITOR_SCAN.md)。

## 许可证

MIT
