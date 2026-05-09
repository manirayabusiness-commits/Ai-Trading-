# Zenith Shadow Engine (Jules Edition)

## Project Goal
To create an autonomous 3-level AI trading system that uses Google Jules for code generation, a local MCP bridge for TradingView integration, and TradingView Paper Trading for risk-free execution.

## System Architecture (The Three-Tier Agentic OS)

| Agent Level | Name | Platform | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Level 1** | The Strategist | Gemini 3 Flash/Ultra | Market analysis, news sentiment, and generating high-level "Plays." |
| **Level 2** | The Technician | Google Jules | Managing the GitHub repo, writing Pine Script v6, and debugging execution scripts. |
| **Level 3** | The Guardian | Local Node.js + MCP | Operating the TradingView UI, executing Buy/Sell orders, and monitoring live PnL. |

## Core Workflow
1. **Strategist (L1)** updates `STRATEGY.md`.
2. **Jules (L2)** monitors strategy and pushes new Pine Script to `/scripts`.
3. **Guardian (L3)** automatically pulls GitHub updates, hot-reloads the script to TradingView, monitors for signals, and executes trades.

## Quick Start Guide

### 1. Prerequisites
- **Node.js:** v18 or higher.
- **TradingView Desktop:** Launched with `--remote-debugging-port=9222`.
- **MCP Bridge:** `tradingview-mcp` server running locally.

### 2. Installation
```bash
npm install
cp .env.example .env
```

### 3. Running the System
```bash
npm start
```
The Guardian enforces a **1% Drawdown Guard** and **2% Daily Hard Stop**. It polls for signals every 5 seconds and syncs with GitHub every 2 minutes.

### 4. Safety & Manual Override
```bash
npm run kill
```

## Monitoring
- **Jules Decisions:** `DECISIONS.log` (Managed by Jules/Level 2).
- **Execution Logs:** `GUARDIAN.log` (Local execution trail).
- **Audit:** All risk-related halts and manual overrides are logged in both files where applicable.
