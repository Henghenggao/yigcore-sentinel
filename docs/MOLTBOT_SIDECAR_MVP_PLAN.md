# Moltbot Sidecar MVP 专项计划书

**项目代号**: Yigcore Sentinel
**战略定位**: 从 Yigcore 核心架构中抽取治理子集，作为开源 Sidecar 快速适配 Moltbot
**商业目标**: 蹭 Moltbot 热度，建立"AI Agent 治理"品牌认知，为闭源 Yigcore 引流
**时间单位**: 小时级迭代（总计 48-60 小时完成 MVP → 发布）

---

## 0. 双线战略架构

```
┌─────────────────────────────────────────────────────────────┐
│ Yigcore Core（主线 - 闭源/Private Repo）                      │
│ - 完整的 Orchestrator Engine                                 │
│ - Bandit Router（UCB1 自适应路由）                           │
│ - DAG Analytics + Advisor                                    │
│ - Conflict Resolution Engine                                 │
│ - Enterprise Session Store                                   │
│ - Multi-Round Workflow                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓ 抽取子集
┌─────────────────────────────────────────────────────────────┐
│ Yigcore Sentinel（支线 - 开源/Public Repo）                  │
│ ✅ Budget Guard（预算控制）                                   │
│ ✅ Audit Logger（审计日志）                                   │
│ ✅ Rate Limiter（速率限制）                                   │
│ ✅ Policy Engine（简化版，基于规则）                          │
│ ✅ Sidecar HTTP Server（Fastify）                            │
│ ❌ Bandit Router（核心 IP，不开源）                          │
│ ❌ DAG Orchestration（核心 IP，不开源）                      │
│ ❌ LLM-as-Judge（核心 IP，不开源）                           │
└─────────────────────────────────────────────────────────────┘
                          ↓ Python 集成
┌─────────────────────────────────────────────────────────────┐
│ Moltbot / OpenClaw / 任何 Python Agent                       │
│ - 通过轻量级 Python SDK 调用 Sentinel                        │
│ - 使用装饰器模式拦截危险操作                                  │
└─────────────────────────────────────────────────────────────┘
```

**商业逻辑**:
- **开源 Sentinel**: 吸引开发者试用，建立品牌，获取 GitHub Star
- **闭源 Core**: 企业用户需要完整编排能力时，引导付费/授权

---

## 1. 功能边界划分

### 1.1 Sentinel（开源）包含的功能

| 功能模块 | 来源 | 说明 | 商业价值 |
|---------|------|------|---------|
| **Budget Guard** | `packages/orchestrator/src/budget_guard.ts` | 用户/会话级别的预算上限控制 | 基础治理，易理解，是"钩子" |
| **Audit Logger** | `packages/orchestrator/src/audit_logger.ts` | 结构化日志，支持自定义 sink | 合规需求，企业刚需 |
| **Rate Limiter** | `packages/orchestrator/src/rate_limiter.ts` | Token Bucket + Semaphore | 防止 API 滥用 |
| **Policy Engine (Lite)** | 新建 `sentinel/policy_lite.ts` | 基于 JSON 配置的规则引擎（允许/拒绝操作） | 展示治理能力 |
| **Sidecar Server** | 增强 `packages/server/src/index.ts` | Fastify HTTP 服务，暴露治理 API | 跨语言集成的桥梁 |

### 1.2 Yigcore Core（闭源）保留的功能

| 功能模块 | 不开源理由 |
|---------|-----------|
| **Bandit Router** | 核心 IP，算法创新，直接产生成本节省（ROI） |
| **DAG Orchestration** | 企业级编排逻辑，复杂度高，护城河 |
| **Conflict Resolution** | 多智能体协作的核心，加权评分 + LLM-as-Judge |
| **Provider Adapter SDK** | 支持多 LLM 提供商的抽象层 |
| **Session Store (Full)** | 完整的会话管理、回溯、replay |

---

## 2. MVP 时间轴（48-60 小时）

### Phase 1: 代码抽取与重构（16 小时）

#### Hour 0-4: 创建 Sentinel 仓库结构
```bash
# 创建独立仓库（稍后说明 GitHub 设置）
yigcore-sentinel/
├── src/
│   ├── budget_guard.ts      # 从 Yigcore 复制
│   ├── audit_logger.ts      # 从 Yigcore 复制
│   ├── rate_limiter.ts      # 从 Yigcore 复制
│   ├── policy_lite.ts       # 新建（简化版）
│   └── server.ts            # 从 packages/server 增强
├── python/
│   └── yigcore_sentinel/
│       ├── __init__.py
│       ├── client.py        # HTTP 客户端
│       └── decorators.py    # @governed 装饰器
├── examples/
│   └── moltbot_integration/
│       ├── governed_moltbot.py
│       └── demo_config.json
├── package.json
├── tsconfig.json
└── README.md
```

**任务清单**:
- [ ] 从 Yigcore 复制 `budget_guard.ts`, `audit_logger.ts`, `rate_limiter.ts`
- [ ] 移除对 Yigcore 内部模块的依赖（解耦）
- [ ] 创建 `policy_lite.ts`（见下文设计）
- [ ] 初始化 npm + Python 项目结构

#### Hour 4-8: 实现 Policy Engine (Lite)
```typescript
// sentinel/src/policy_lite.ts
export interface PolicyRule {
  id: string;
  action: string;              // e.g., "delete_file", "execute_shell"
  effect: 'allow' | 'deny' | 'warn';
  conditions?: {
    pathPattern?: string;      // e.g., "/tmp/*" 允许, "/system/*" 拒绝
    maxCost?: number;          // 单次操作成本上限
  };
}

export interface PolicyConfig {
  defaultEffect: 'allow' | 'deny';
  rules: PolicyRule[];
}

export class PolicyEngine {
  constructor(private config: PolicyConfig) {}

  evaluate(action: string, context: Record<string, any>): {
    effect: 'allow' | 'deny' | 'warn';
    matchedRule?: string;
  } {
    // 遍历规则，匹配 action 和 conditions
    for (const rule of this.config.rules) {
      if (this.matchAction(rule.action, action) && this.matchConditions(rule.conditions, context)) {
        return { effect: rule.effect, matchedRule: rule.id };
      }
    }
    return { effect: this.config.defaultEffect };
  }

  private matchAction(pattern: string, action: string): boolean {
    // 支持通配符: "delete_*" 匹配 "delete_file"
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(action);
  }

  private matchConditions(conditions: PolicyRule['conditions'], context: Record<string, any>): boolean {
    if (!conditions) return true;

    if (conditions.pathPattern && context.path) {
      const regex = new RegExp('^' + conditions.pathPattern.replace('*', '.*') + '$');
      if (!regex.test(context.path)) return false;
    }

    if (conditions.maxCost && context.cost > conditions.maxCost) {
      return false;
    }

    return true;
  }
}
```

**任务清单**:
- [ ] 实现 `PolicyEngine` 类
- [ ] 编写单元测试（10 个测试用例）
- [ ] 创建默认策略配置示例

#### Hour 8-12: 增强 Sidecar Server
```typescript
// sentinel/src/server.ts
import fastify from 'fastify';
import { BudgetGuard } from './budget_guard';
import { StructuredAuditLogger } from './audit_logger';
import { PolicyEngine, PolicyConfig } from './policy_lite';
import { TokenBucket } from './rate_limiter';

const server = fastify({ logger: true });

// 初始化治理组件
const budgetGuard = new BudgetGuard(10.0); // 默认每用户 $10/day
const auditLogger = new StructuredAuditLogger({
  sink: (entry) => server.log.info({ audit: entry })
});

// 加载策略配置（从文件或环境变量）
const policyConfig: PolicyConfig = loadPolicyConfig();
const policyEngine = new PolicyEngine(policyConfig);

// 速率限制器（每个 userId 独立）
const rateLimiters = new Map<string, TokenBucket>();

function getRateLimiter(userId: string): TokenBucket {
  if (!rateLimiters.has(userId)) {
    rateLimiters.set(userId, new TokenBucket({ capacity: 100, refillRate: 10 }));
  }
  return rateLimiters.get(userId)!;
}

// 核心治理端点
server.post('/governance/check', async (request, reply) => {
  const { userId, action, context, costEstimate } = request.body as {
    userId: string;
    action: string;
    context?: Record<string, any>;
    costEstimate?: number;
  };

  const result = {
    allowed: true,
    reasons: [] as string[],
    warnings: [] as string[],
  };

  // 1. 速率限制检查
  const rateLimiter = getRateLimiter(userId);
  if (!rateLimiter.tryConsume(1)) {
    result.allowed = false;
    result.reasons.push('Rate limit exceeded');
    auditLogger.logEvent({
      type: 'governance_block',
      timestamp: Date.now(),
      agentId: userId,
      details: { action, reason: 'rate_limit' },
    });
    return reply.code(200).send(result);
  }

  // 2. 预算检查
  if (costEstimate && !budgetGuard.check(userId, costEstimate)) {
    result.allowed = false;
    result.reasons.push('Budget exceeded');
    auditLogger.logEvent({
      type: 'governance_block',
      timestamp: Date.now(),
      agentId: userId,
      details: { action, reason: 'budget_exceeded', costEstimate },
    });
    return reply.code(200).send(result);
  }

  // 3. 策略检查
  const policyDecision = policyEngine.evaluate(action, context || {});
  if (policyDecision.effect === 'deny') {
    result.allowed = false;
    result.reasons.push(`Policy violation: ${policyDecision.matchedRule}`);
    auditLogger.logEvent({
      type: 'governance_block',
      timestamp: Date.now(),
      agentId: userId,
      details: { action, context, matchedRule: policyDecision.matchedRule },
    });
  } else if (policyDecision.effect === 'warn') {
    result.warnings.push(`Dangerous action: ${policyDecision.matchedRule}`);
    auditLogger.logEvent({
      type: 'governance_warning',
      timestamp: Date.now(),
      agentId: userId,
      details: { action, context, matchedRule: policyDecision.matchedRule },
    });
  }

  // 4. 如果允许，记录审计并扣除预算
  if (result.allowed && costEstimate) {
    budgetGuard.deduct(userId, costEstimate);
    auditLogger.logEvent({
      type: 'governance_allow',
      timestamp: Date.now(),
      agentId: userId,
      details: { action, context, costEstimate },
    });
  }

  return reply.code(200).send(result);
});

// 查询审计日志
server.get('/governance/audit', async (request, reply) => {
  const { userId, limit = 100 } = request.query as { userId?: string; limit?: number };
  // 实现：从审计日志中筛选
  // （简化版：返回内存中最近的日志）
  return reply.send({ logs: [] }); // TODO: 实现持久化存储
});

// 健康检查（用于心跳）
server.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});

// 启动服务
server.listen({ port: 11435, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
```

**任务清单**:
- [ ] 实现 `/governance/check` 端点（集成 4 层检查）
- [ ] 实现 `/governance/audit` 端点（暂时返回模拟数据）
- [ ] 实现 `/health` 端点（心跳检测）
- [ ] 添加配置文件加载逻辑（`policy.json`）

#### Hour 12-16: Python SDK 开发
```python
# python/yigcore_sentinel/client.py
import requests
from typing import Optional, Dict, Any

class SentinelClient:
    def __init__(self, base_url: str = "http://localhost:11435"):
        self.base_url = base_url
        self._check_health()

    def _check_health(self):
        """启动时检查 Sentinel 是否运行"""
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=2)
            resp.raise_for_status()
        except Exception as e:
            raise ConnectionError(
                f"Sentinel Sidecar not running at {self.base_url}. "
                f"Start it with: yigcore-sentinel start"
            ) from e

    def check_action(
        self,
        user_id: str,
        action: str,
        context: Optional[Dict[str, Any]] = None,
        cost_estimate: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        检查操作是否被允许

        Returns:
            {
                "allowed": bool,
                "reasons": List[str],  # 如果被拒绝，原因列表
                "warnings": List[str]  # 如果允许但有警告
            }
        """
        resp = requests.post(
            f"{self.base_url}/governance/check",
            json={
                "userId": user_id,
                "action": action,
                "context": context or {},
                "costEstimate": cost_estimate,
            },
            timeout=1,  # 快速失败（1秒超时）
        )
        resp.raise_for_status()
        return resp.json()
```

```python
# python/yigcore_sentinel/decorators.py
from functools import wraps
from typing import Callable, Optional
from .client import SentinelClient

_global_client: Optional[SentinelClient] = None

def init_sentinel(base_url: str = "http://localhost:11435"):
    """初始化全局 Sentinel 客户端"""
    global _global_client
    _global_client = SentinelClient(base_url)

def governed(
    action: str,
    user_id: str = "default_agent",
    cost_estimate: Optional[float] = None,
    extract_context: Optional[Callable] = None,
):
    """
    装饰器：让函数受 Sentinel 治理

    Example:
        @governed("delete_file", cost_estimate=0.01)
        def delete_file(path: str):
            os.remove(path)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            if _global_client is None:
                raise RuntimeError("Call init_sentinel() first")

            # 提取上下文（如果提供了提取函数）
            context = {}
            if extract_context:
                context = extract_context(*args, **kwargs)

            # 请求许可
            decision = _global_client.check_action(
                user_id=user_id,
                action=action,
                context=context,
                cost_estimate=cost_estimate,
            )

            # 检查决策
            if not decision["allowed"]:
                reasons = ", ".join(decision["reasons"])
                raise PermissionError(f"Sentinel blocked: {reasons}")

            # 打印警告（如果有）
            for warning in decision.get("warnings", []):
                print(f"⚠️  Sentinel: {warning}")

            # 执行原函数
            return func(*args, **kwargs)

        return wrapper
    return decorator
```

**任务清单**:
- [ ] 实现 `SentinelClient` 类
- [ ] 实现 `@governed` 装饰器
- [ ] 编写 Python 测试用例
- [ ] 创建 `setup.py` 和 `pyproject.toml`

---

### Phase 2: Moltbot 集成示例（8 小时）

#### Hour 16-20: 创建集成示例
```python
# examples/moltbot_integration/governed_moltbot.py
"""
Moltbot + Yigcore Sentinel 集成示例

展示如何让 Moltbot 的危险操作受到治理
"""
import os
from yigcore_sentinel import init_sentinel, governed

# 初始化 Sentinel 客户端
init_sentinel("http://localhost:11435")

# 示例：治理文件操作
@governed(
    action="delete_file",
    cost_estimate=0.0,  # 文件操作不产生 LLM 成本
    extract_context=lambda path: {"path": path}
)
def delete_file(path: str):
    """删除文件（受治理）"""
    print(f"Deleting: {path}")
    os.remove(path)

@governed(
    action="execute_shell",
    cost_estimate=0.0,
    extract_context=lambda cmd: {"command": cmd}
)
def execute_shell(cmd: str):
    """执行 shell 命令（受治理）"""
    print(f"Executing: {cmd}")
    os.system(cmd)

@governed(
    action="llm_call",
    cost_estimate=0.002,  # GPT-4 Turbo 约 $0.002/call
)
def call_llm(prompt: str):
    """调用 LLM（受预算治理）"""
    print(f"Calling LLM with prompt: {prompt[:50]}...")
    # 实际的 LLM 调用逻辑
    return "LLM response here"

# 模拟 Moltbot 的危险操作序列
if __name__ == "__main__":
    print("=== Moltbot with Yigcore Sentinel ===\n")

    # 场景 1: 允许的操作
    try:
        delete_file("/tmp/test.txt")  # 假设 policy 允许删除 /tmp/*
        print("✅ File deleted successfully\n")
    except PermissionError as e:
        print(f"❌ Blocked: {e}\n")

    # 场景 2: 被拒绝的操作
    try:
        delete_file("/etc/passwd")  # 假设 policy 拒绝删除 /etc/*
        print("✅ File deleted successfully\n")
    except PermissionError as e:
        print(f"❌ Blocked: {e}\n")

    # 场景 3: 预算控制
    try:
        for i in range(6000):  # 尝试调用 6000 次（超出 $10 预算）
            call_llm(f"Request {i}")
            if i % 1000 == 0:
                print(f"  Completed {i} LLM calls...")
    except PermissionError as e:
        print(f"❌ Budget exhausted: {e}\n")

    # 场景 4: 速率限制
    try:
        for i in range(200):  # 超过 100/秒 的速率限制
            execute_shell("echo test")
    except PermissionError as e:
        print(f"❌ Rate limited: {e}\n")
```

```json
// examples/moltbot_integration/policy.json
{
  "defaultEffect": "allow",
  "rules": [
    {
      "id": "block_system_files",
      "action": "delete_file",
      "effect": "deny",
      "conditions": {
        "pathPattern": "/etc/*"
      }
    },
    {
      "id": "warn_shell_execution",
      "action": "execute_shell",
      "effect": "warn"
    },
    {
      "id": "limit_expensive_calls",
      "action": "llm_call",
      "effect": "allow",
      "conditions": {
        "maxCost": 0.01
      }
    }
  ]
}
```

**任务清单**:
- [ ] 编写 `governed_moltbot.py` 示例
- [ ] 创建 `policy.json` 配置
- [ ] 编写 `README.md`（如何运行示例）
- [ ] 测试所有 4 个场景

#### Hour 20-24: 集成测试与 Debug
**任务清单**:
- [ ] 启动 Sentinel Server
- [ ] 运行 `governed_moltbot.py`
- [ ] 验证 4 个场景的输出
- [ ] 修复发现的 Bug
- [ ] 记录集成遇到的问题

---

### Phase 3: 文档与营销素材（16 小时）

#### Hour 24-32: 编写技术文档
**任务清单**:
- [ ] 编写 `README.md`（包括：简介、快速开始、架构图）
- [ ] 编写 `ARCHITECTURE.md`（技术架构、设计决策）
- [ ] 编写 `API.md`（HTTP API 文档）
- [ ] 编写 `PYTHON_GUIDE.md`（Python SDK 使用指南）
- [ ] 编写 `MOLTBOT_INTEGRATION.md`（Moltbot 集成教程）

#### Hour 32-40: 制作 Demo 视频
**脚本结构**（3-5 分钟）:
```
[00:00-00:30] 问题陈述
- 展示 Moltbot 无限制运行的风险
- 演示：删除重要文件、无限 API 调用

[00:30-01:30] 解决方案介绍
- Yigcore Sentinel 架构图
- Sidecar 模式说明
- 4 层治理机制

[01:30-03:00] 实时演示
- 启动 Sentinel Server
- 运行 governed_moltbot.py
- 展示 4 个场景（允许、拒绝、预算、速率）
- 查看审计日志

[03:00-03:30] 代码展示
- 展示装饰器的简洁性（3 行代码）
- 展示 policy.json 的可读性

[03:30-04:00] Call to Action
- GitHub Star
- 阅读文档
- 加入社区讨论
```

**任务清单**:
- [ ] 准备演示环境（录屏软件、终端主题）
- [ ] 录制视频（可能需要 2-3 次）
- [ ] 编辑视频（添加字幕、标注）
- [ ] 导出多个版本（YouTube 长版、Twitter 短版）

#### Hour 40-48: 营销内容创作
**任务清单**:
- [ ] 撰写 Show HN 帖子（300-500 字）
- [ ] 撰写 Dev.to 技术博客（1500-2000 字）
- [ ] 制作架构图（Excalidraw/Figma）
- [ ] 创建 Twitter Thread（10-15 条推文）
- [ ] 准备 Reddit 帖子（r/LocalLLaMA, r/MachineLearning）

---

### Phase 4: 发布与迭代（8 小时）

#### Hour 48-52: GitHub 发布准备
**任务清单**:
- [ ] 完善 README（添加 Badge、截图、GIF）
- [ ] 创建 GitHub Release（v0.1.0）
- [ ] 配置 GitHub Actions（CI/CD）
- [ ] 添加 LICENSE（MIT）
- [ ] 添加 CONTRIBUTING.md

#### Hour 52-56: 多平台发布
**时间选择**（最大化曝光）:
- **Hacker News**: 美东时间周一-周四 8-10am
- **Reddit**: 美东时间周二-周四 9am-12pm
- **Twitter**: 美东时间工作日 10am-2pm

**任务清单**:
- [ ] 发布到 Hacker News（Show HN）
- [ ] 发布到 Reddit（3 个子版块）
- [ ] 发布 Twitter Thread
- [ ] 发布到 Dev.to
- [ ] 通知相关社区（Discord, Slack）

#### Hour 56-60: 社区响应与快速迭代
**任务清单**:
- [ ] 监控 HN/Reddit 评论，及时回复
- [ ] 收集反馈（功能请求、Bug 报告）
- [ ] 修复高优先级 Bug（如果有）
- [ ] 更新 FAQ（根据常见问题）
- [ ] 发布 v0.1.1（Hotfix）

---

## 3. GitHub 架构方案：开源 Sidecar + 闭源 Core

### 方案 A: Multi-Repo（推荐）

```
GitHub 组织: YigcoreHQ（或你的 GitHub 用户名）

┌─────────────────────────────────────────┐
│ Repo 1: yigcore（Private）               │  ← 闭源主仓库
│ - packages/orchestrator/                 │
│ - packages/core/                         │
│ - packages/session-store/                │
│ - 包含 Bandit Router, DAG, Conflict...  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Repo 2: yigcore-sentinel（Public）       │  ← 开源子项目
│ - src/budget_guard.ts                    │
│ - src/audit_logger.ts                    │
│ - src/policy_lite.ts                     │
│ - python/yigcore_sentinel/               │
│ - examples/moltbot_integration/          │
│ - README: "Lightweight governance for    │
│   AI agents. Part of Yigcore ecosystem."│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Repo 3: yigcore-examples（Public）       │  ← 示例与教程
│ - moltbot-integration/                   │
│ - langgraph-integration/                 │
│ - enterprise-deployment/                 │
└─────────────────────────────────────────┘
```

**优点**:
- 清晰分离开源/闭源代码
- Sentinel 可以独立迭代、接受社区贡献
- 核心代码不会意外泄露

**实施步骤**:
1. 保持现有 `Yigcore` 仓库为 Private
2. 创建新仓库 `yigcore-sentinel`（Public）
3. 从 Yigcore 复制需要开源的文件（不保留 Git 历史）
4. 在 Sentinel README 中添加链接：
   ```markdown
   ## About Yigcore

   Yigcore Sentinel is the open-source governance layer extracted from
   [Yigcore](https://yigcore.dev), an enterprise-grade orchestration
   runtime for multi-agent AI systems.

   **Need more?** Yigcore Core includes:
   - Adaptive cost-optimized routing (Bandit Router)
   - DAG workflow orchestration
   - Multi-agent conflict resolution
   - Enterprise session management

   [Request access to Yigcore Core →](https://yigcore.dev/early-access)
   ```

### 方案 B: Monorepo with Submodule（不推荐）

```
yigcore（Private）
├── packages/
│   ├── orchestrator/（Private）
│   ├── core/（Private）
│   └── sentinel/（Git Submodule → Public Repo）
```

**缺点**:
- 容易误操作导致闭源代码泄露
- Submodule 管理复杂
- 社区贡献者需要处理 Submodule

---

## 4. 行业最佳实践：开源-闭源混合策略

### 4.1 成功案例参考

| 公司 | 开源项目 | 闭源产品 | 策略 |
|------|---------|---------|------|
| **GitLab** | GitLab CE（Community Edition） | GitLab EE（Enterprise Edition） | 开源版本功能完整但缺少企业功能 |
| **Sentry** | Sentry OSS | Sentry Cloud | 开源自托管版，闭源 SaaS |
| **Elastic** | Elasticsearch（SSPL License） | Elastic Cloud | 改用限制性许可证 |
| **HashiCorp** | Terraform, Vault（OSS） | Terraform Cloud, Vault Enterprise | 开源 CLI，闭源 SaaS |

### 4.2 你的策略定位

```
开源 Sentinel = GitLab CE 的定位
- 功能完整但范围受限（仅治理层）
- 适合个人开发者和小团队
- 社区驱动，MIT License

闭源 Yigcore Core = GitLab EE 的定位
- 企业级功能（Bandit Router, DAG, Conflict Resolution）
- 适合企业客户和高级用户
- 商业授权或 SaaS 订阅
```

### 4.3 License 选择

**Sentinel（开源）建议使用**: MIT License
```
理由:
- 最宽松，吸引最多开发者
- 允许商业使用（不冲突）
- 社区友好，易于贡献
```

**Yigcore Core（闭源）**: 专有许可证（Proprietary License）
```
示例声明（在 LICENSE 文件中）:
Copyright (c) 2026 Yigcore Team

This software and associated documentation files (the "Software") are
proprietary and confidential. Unauthorized copying, distribution, or
use of this Software is strictly prohibited.

For licensing inquiries, contact: license@yigcore.dev
```

### 4.4 README 中的关键信息

**Sentinel README 必须包含**:
1. **明确说明这是子集**: "Lightweight governance layer extracted from Yigcore"
2. **引导升级路径**: "Need orchestration and routing? See Yigcore Core"
3. **避免过度承诺**: 不要在开源版承诺未来会开源核心功能
4. **社区贡献指南**: 欢迎 PR，但说明范围限制

**示例**:
```markdown
## Yigcore Sentinel vs Yigcore Core

| Feature | Sentinel (OSS) | Core (Enterprise) |
|---------|---------------|-------------------|
| Budget Control | ✅ | ✅ |
| Audit Logging | ✅ | ✅ |
| Rate Limiting | ✅ | ✅ |
| Policy Engine | ✅ Basic rules | ✅ Advanced + LLM-as-Judge |
| Provider Routing | ❌ | ✅ Adaptive (Bandit Router) |
| DAG Orchestration | ❌ | ✅ Full DAG + Analytics |
| Conflict Resolution | ❌ | ✅ Multi-strategy |
| Session Management | ❌ | ✅ Replay + Time-travel |

[Request access to Yigcore Core →](https://yigcore.dev/early-access)
```

---

## 5. 风险控制清单

| 风险 | 预防措施 |
|------|---------|
| **意外泄露核心代码** | 使用独立仓库；不共享 Git 历史；代码审查 |
| **社区要求开源更多功能** | README 明确说明范围；提供升级路径 |
| **竞争对手复制开源代码** | MIT License 允许这样做；核心 IP 在闭源部分 |
| **维护两个代码库的成本** | Sentinel 尽量独立；定期同步 Bug 修复 |
| **品牌混淆** | 清晰命名（Sentinel vs Core）；统一文档站点 |

---

## 6. 成功指标（KPI）

### 发布后 7 天
- [ ] GitHub Star > 100
- [ ] HN 帖子 > 50 upvotes
- [ ] Reddit 总互动 > 200
- [ ] Demo 视频观看 > 1000

### 发布后 30 天
- [ ] GitHub Star > 500
- [ ] 至少 5 个社区贡献的 PR
- [ ] 至少 3 个集成案例（非官方）
- [ ] 至少 10 个关于 Yigcore Core 的咨询邮件

### 发布后 90 天
- [ ] GitHub Star > 2000
- [ ] PyPI 下载 > 5000/月
- [ ] 至少 1 篇第三方技术博客
- [ ] 至少 1 个企业客户签约 Yigcore Core

---

## 7. 下一步行动（立即开始）

**今天（Hour 0-4）**:
1. 创建 `yigcore-sentinel` GitHub 仓库（Public）
2. 初始化项目结构
3. 复制 `budget_guard.ts`, `audit_logger.ts`, `rate_limiter.ts`

**明天（Hour 4-16）**:
1. 实现 `policy_lite.ts`
2. 增强 `server.ts`
3. 开始 Python SDK 开发

**本周末（Hour 16-48）**:
1. 完成 Moltbot 集成示例
2. 录制 Demo 视频
3. 编写营销内容

**下周一（Hour 48-60）**:
1. 发布到多个平台
2. 监控社区反馈
3. 快速迭代

---

## 附录：GitHub 仓库设置步骤

### A. 创建 yigcore-sentinel 仓库

1. 访问 https://github.com/new
2. 填写信息:
   - **Repository name**: `yigcore-sentinel`
   - **Description**: "Lightweight governance layer for AI agents - budget control, audit logging, policy engine"
   - **Visibility**: **Public** ✅
   - **Initialize with**: ✅ README, ❌ .gitignore (手动创建), ✅ MIT License
3. 点击 "Create repository"

### B. 保护核心仓库

1. 进入 `yigcore` 仓库（闭源）
2. Settings → Danger Zone → Change repository visibility
3. 确认设置为 **Private** ✅
4. Settings → Collaborators → 只添加信任的团队成员
5. Settings → Branches → 添加分支保护规则（main/master）

### C. 设置组织（可选但推荐）

1. 创建 GitHub Organization: "YigcoreHQ"
2. 将 `yigcore`（Private）和 `yigcore-sentinel`（Public）转移到组织
3. 好处:
   - 统一品牌形象
   - 更专业的印象
   - 方便管理多个仓库

---

**准备好开始了吗？我可以立即帮你：**
1. 创建 `yigcore-sentinel` 仓库结构
2. 编写 `policy_lite.ts` 代码
3. 增强 `server.ts` 代码
4. 编写 Python 装饰器

选择一个，我们开始 48 小时冲刺！
