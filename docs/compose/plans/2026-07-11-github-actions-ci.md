# GitHub Actions CI 自动打包实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建GitHub Actions工作流，在创建版本标签时自动打包并发布Release

**Architecture:** 使用GitHub Actions工作流，监听v*标签推送事件，运行现有的package.sh脚本，然后创建GitHub Release并上传ZIP文件

**Tech Stack:** GitHub Actions, Node.js, npm, bash

## Global Constraints

- 触发条件：创建v*格式的标签时（如v0.2.0）
- 运行环境：Ubuntu最新版
- 打包脚本：使用现有的scripts/package.sh
- Release标题：使用标签名
- Release描述：留空

---

### Task 1: 创建GitHub Actions工作流目录结构

**Covers:** S1 (触发条件)

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: 无
- Produces: GitHub Actions工作流配置文件

- [ ] **Step 1: 创建.github/workflows目录**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: 创建release.yml工作流文件**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Build and Release
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: ui/package-lock.json
      
      - name: Install dependencies
        run: npm ci
        working-directory: ui
      
      - name: Build frontend
        run: npm run build
        working-directory: ui
      
      - name: Package plugin
        run: ./scripts/package.sh --skip-install
      
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*.zip
          generate_release_notes: false
```

- [ ] **Step 3: 验证文件创建**

```bash
ls -la .github/workflows/
```

Expected: 看到release.yml文件

- [ ] **Step 4: 提交更改**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add GitHub Actions workflow for automated releases"
```

---

### Task 2: 验证工作流配置

**Covers:** S2 (工作流配置)

**Files:**
- Modify: `.github/workflows/release.yml` (如果需要)

**Interfaces:**
- Consumes: Task 1创建的工作流文件
- Produces: 验证通过的工作流配置

- [ ] **Step 1: 检查YAML语法**

```bash
# 安装yamllint（如果未安装）
pip install yamllint

# 检查YAML语法
yamllint .github/workflows/release.yml
```

Expected: 无语法错误

- [ ] **Step 2: 验证工作流触发条件**

检查release.yml中的触发条件是否正确：
- 监听push事件
- 只对v*标签触发
- 使用ubuntu-latest运行器

- [ ] **Step 3: 验证打包脚本兼容性**

```bash
# 测试打包脚本是否支持--skip-install参数
./scripts/package.sh --skip-install
```

Expected: 脚本正常运行，生成ZIP文件

- [ ] **Step 4: 提交验证结果**

```bash
git add -A
git commit -m "ci: verify workflow configuration"
```

---

### Task 3: 测试工作流（本地模拟）

**Covers:** S3 (测试验证)

**Files:**
- 无新增文件

**Interfaces:**
- Consumes: Task 2验证通过的工作流配置
- Produces: 测试结果

- [ ] **Step 1: 创建测试标签**

```bash
git tag v0.2.0-test
```

- [ ] **Step 2: 模拟工作流执行**

```bash
# 模拟工作流步骤
git checkout v0.2.0-test
cd ui && npm ci && npm run build
cd .. && ./scripts/package.sh --skip-install
```

Expected: 生成dist/qwenpaw-remote-plugin-0.2.0.zip文件

- [ ] **Step 3: 验证ZIP文件内容**

```bash
# 检查ZIP文件内容
unzip -l dist/qwenpaw-remote-plugin-0.2.0.zip
```

Expected: 包含plugin.json, plugin.py, remote/, ui/dist/index.js等文件

- [ ] **Step 4: 清理测试标签**

```bash
git tag -d v0.2.0-test
git checkout main
```

- [ ] **Step 5: 提交测试结果**

```bash
git add -A
git commit -m "test: verify CI workflow locally"
```

---

### Task 4: 创建使用文档

**Covers:** S4 (文档)

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 完成的工作流配置
- Produces: 更新后的README文档

- [ ] **Step 1: 在README中添加CI使用说明**

在README.md中添加以下内容：

```markdown
## 自动打包发布

本项目使用GitHub Actions自动打包发布。当创建版本标签时，会自动触发CI流程：

### 发布步骤

1. 更新`plugin.json`中的版本号
2. 提交更改：`git commit -am "bump version to X.Y.Z"`
3. 创建标签：`git tag vX.Y.Z`
4. 推送标签：`git push origin vX.Y.Z`
5. GitHub Actions会自动打包并创建Release

### 手动打包

如果需要手动打包，可以运行：

```bash
./scripts/package.sh
```

打包后的文件在`dist/`目录中。
```

- [ ] **Step 2: 提交文档更新**

```bash
git add README.md
git commit -m "docs: add CI/CD usage instructions"
```

---

### Task 5: 最终验证和清理

**Covers:** S5 (最终验证)

**Files:**
- 无新增文件

**Interfaces:**
- Consumes: 所有之前的任务
- Produces: 完成的CI配置

- [ ] **Step 1: 检查所有文件**

```bash
# 检查工作流文件
cat .github/workflows/release.yml

# 检查README更新
grep -A 20 "自动打包发布" README.md
```

Expected: 所有文件内容正确

- [ ] **Step 2: 运行最终测试**

```bash
# 创建最终测试标签
git tag v0.2.0-final-test

# 模拟完整流程
git checkout v0.2.0-final-test
cd ui && npm ci && npm run build
cd .. && ./scripts/package.sh --skip-install

# 验证生成的文件
ls -la dist/
unzip -l dist/qwenpaw-remote-plugin-0.2.0.zip

# 清理
git tag -d v0.2.0-final-test
git checkout main
rm -rf dist/
```

Expected: 所有步骤成功，生成正确的ZIP文件

- [ ] **Step 3: 提交最终更改**

```bash
git add -A
git commit -m "ci: complete GitHub Actions CI setup"
```

- [ ] **Step 4: 推送到GitHub**

```bash
git push origin main
```

---

## 完成检查清单

- [ ] GitHub Actions工作流文件创建完成
- [ ] 工作流配置验证通过
- [ ] 本地测试成功
- [ ] README文档更新完成
- [ ] 所有更改已提交并推送

## 下一步

1. 创建版本标签：`git tag v0.2.0`
2. 推送标签：`git push origin v0.2.0`
3. 在GitHub上查看Actions标签页，确认工作流运行
4. 检查Releases标签页，确认ZIP文件已上传
