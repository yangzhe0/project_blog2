---
title: AI 术语表
pubDatetime: 2025-03-15
description: '大模型与 AI 工程领域核心术语整理，持续更新'
tags: [AI, LLM]
draft: false
---

## 大模型与交互

| 术语 | 英文 | 说明 |
|------|------|------|
| 大语言模型 | LLM | 基于 Transformer 架构、在海量文本上训练的生成式语言模型，如 GPT、Claude、Gemini |
| 多模态大模型 | Multimodal LLM | 能同时处理文本、图像、音频等多种模态输入的大模型 |
| Token | Token | 模型处理文本的基本单位，约等于 0.75 个英文单词或 1-2 个汉字 |
| 上下文窗口 | Context Window | 模型单次能处理的最大 Token 数量，决定对话长度上限 |
| 提示词 | Prompt | 输入给模型的指令或问题文本 |
| 系统提示词 | System Prompt | 对话前预置的隐藏指令，用于设定模型角色和行为规范 |
| 温度 | Temperature | 控制输出随机性的参数，值越低越确定，值越高越发散（0~2） |
| 幻觉 | Hallucination | 模型生成事实上不存在或错误的内容，是当前 LLM 的主要缺陷之一 |
| 推理 | Inference | 模型根据输入生成输出的过程 |
| 对齐 | Alignment | 让模型行为符合人类意图和价值观的训练目标 |

## 技术与方法论

| 术语 | 英文 | 说明 |
|------|------|------|
| 检索增强生成 | RAG | 在模型生成前先从外部知识库检索相关内容，减少幻觉、注入实时知识 |
| 函数调用 | Function Calling | 模型识别意图后调用外部函数/API，实现与真实系统的交互 |
| 模型上下文协议 | MCP | Anthropic 提出的开放标准，规范 AI 模型与外部工具/数据源之间的通信接口 |
| 智能体 | Agent | 能自主规划、调用工具、循环执行任务直到目标完成的 AI 系统 |
| 工作流 | Workflow | AI 执行任务的固定步骤编排，区别于 Agent 的自主决策 |
| 嵌入向量 | Embedding | 将文本/图像等映射为高维数值向量，用于语义相似度计算 |
| 向量数据库 | Vector Database | 专门存储和检索 Embedding 向量的数据库，如 Pinecone、Chroma、Faiss |
| 微调 | Fine-tuning | 在预训练模型基础上用特定领域数据继续训练，使其适应特定任务 |
| 指令微调 | Instruction Tuning | 用「指令-回答」格式数据微调，使模型更好地遵从人类指令 |
| 思维链 | Chain-of-Thought | 让模型逐步推理、显式写出中间步骤，提升复杂任务准确率 |
| 并行执行 | Parallel Execution | 多个 Agent 或工具同时运行，提高效率 |
| 技能 | Skill | Agent 可调用的封装能力单元，类似插件或工具包 |
| 长上下文 | Long Context | 支持超长输入（如 100K+ Token）的模型能力 |
| 蒸馏 | Distillation | 用大模型的输出训练小模型，在保留能力的同时降低计算成本 |
| 量化 | Quantization | 降低模型权重精度（如 FP16→INT4），减小体积、加速推理 |

## 推理与规划

| 术语 | 英文 | 说明 |
|------|------|------|
| ReAct | ReAct | 结合推理（Reasoning）和行动（Acting）的 Agent 框架，交替思考与调用工具 |
| 规划 | Planning | Agent 将复杂目标分解为子任务并排列执行顺序的能力 |
| 反思 | Reflection | Agent 对自身输出进行自我评估和修正的机制 |
| 记忆 | Memory | Agent 存储和检索历史信息的机制，分短期（上下文）和长期（外部存储）|
| 多智能体 | Multi-Agent | 多个 Agent 协作完成任务，各自负责不同子任务 |

## 应用与工具生态

| 术语 | 英文 | 说明 |
|------|------|------|
| 代码助手 | Code Assistant | 辅助编写、调试、解释代码的 AI 工具，如 GitHub Copilot |
| 提示词工程 | Prompt Engineering | 设计和优化 Prompt 以获得更好模型输出的方法论 |
| AI 网关 | AI Gateway | 统一管理多个 LLM API 调用、限流、日志的中间层服务 |
| 护栏 | Guardrails | 限制模型输出范围、过滤有害内容的安全机制 |
| 评估框架 | Evaluation Framework | 系统性测试模型能力和对齐程度的方法体系 |
| 人机协作 | Human-AI Collaboration | 人类与 AI 分工配合完成任务，发挥各自优势 |
| AI 治理 | AI Governance | 规范 AI 开发和使用的制度、流程和技术框架 |
