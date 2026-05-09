/**
 * Zenith Shadow Engine - Level 3: The Guardian
 *
 * Responsibilities:
 * 1. Continuous GitHub Sync (Hot-Reload)
 * 2. Risk Guard & Daily Hard Stop
 * 3. Signal Monitoring & Automated Execution
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const MCPClient = require('./lib/mcp-client');
require('dotenv').config();

const BRIDGE_URL = process.env.MCP_BRIDGE_URL || 'http://localhost:3000';

class Guardian {
    constructor() {
        this.config = JSON.parse(fs.readFileSync('./execution_params.json', 'utf8'));
        this.initialBalance = this.config.risk_management.initial_capital;
        this.drawdownLimit = this.config.risk_management.max_drawdown_percent / 100;
        this.dailyLossLimit = this.config.risk_management.daily_loss_limit_percent / 100;

        this.mcp = new MCPClient(BRIDGE_URL);
        this.isHalted = false;
        this.dailyStartingBalance = this.initialBalance;
        this.lastDayReset = new Date().toDateString();

        this.setupWatchers();
    }

    setupWatchers() {
        // Hot-reload when script changes (pulled from Git)
        fs.watch(path.join(__dirname, 'scripts'), (eventType, filename) => {
            if (filename === 'strategy.pine') {
                console.log(`[GUARDIAN] Detected change in ${filename}. Re-syncing to TradingView...`);
                this.syncStrategyToTV();
            }
        });
    }

    async pullUpdates() {
        if (this.isHalted) return;
        console.log("[GUARDIAN] Syncing with GitHub...");
        exec('git pull origin main --rebase', (err) => {
            if (err) console.warn("[GUARDIAN] git pull failed.");
            else console.log("[GUARDIAN] GitHub sync successful.");
        });
    }

    async checkSafety() {
        const status = await this.mcp.callTool("tradingview-mcp", "get_status", {});
        // Fail-safe check
        if (!status || status.success === false || status.is_focused === false || status.layout_matched === false) {
            console.warn("[SAFETY] TradingView UI Safety check failed.");
            return false;
        }
        return true;
    }

    async monitorRiskAndSignals() {
        if (this.isHalted) return;

        // 1. Risk Management
        const balanceData = await this.mcp.callTool("tradingview-mcp", "get_balance", {});
        if (balanceData && balanceData.success) {
            const currentBalance = balanceData.balance;
            this.checkDailyReset(currentBalance);
            await this.enforceRiskLimits(currentBalance);
        }

        // 2. Signal Execution (Requirement 4)
        if (!this.isHalted) {
            const signalData = await this.mcp.callTool("tradingview-mcp", "get_signals", { strategy: "EMA Crossover" });
            if (signalData && signalData.success && signalData.signal) {
                await this.executeTrade(signalData.signal);
            }
        }
    }

    checkDailyReset(currentBalance) {
        const today = new Date().toDateString();
        if (this.lastDayReset !== today) {
            this.dailyStartingBalance = currentBalance;
            this.lastDayReset = today;
        }
    }

    async enforceRiskLimits(currentBalance) {
        const totalDrawdown = (this.initialBalance - currentBalance) / this.initialBalance;
        const dailyLoss = (this.dailyStartingBalance - currentBalance) / this.dailyStartingBalance;

        if (totalDrawdown >= this.drawdownLimit) {
            await this.emergencyHalt(`Max drawdown limit reached: ${(totalDrawdown * 100).toFixed(2)}%`);
        } else if (dailyLoss >= this.dailyLossLimit) {
            await this.emergencyHalt(`Daily loss limit reached: ${(dailyLoss * 100).toFixed(2)}%`);
        }
    }

    async executeTrade(signal) {
        console.log(`[GUARDIAN] SIGNAL DETECTED: ${signal.type} @ ${signal.price}`);
        // MCP ui_click to operate the TradingView Paper Trading panel (Requirement 3.3)
        const target = signal.type === 'buy' ? 'buy_button' : 'sell_button';
        await this.mcp.callTool("tradingview-mcp", "ui_click", { target });
        this.logExecution(`Trade Executed: ${signal.type} for ${this.config.ticker}`);
    }

    async emergencyHalt(reason) {
        this.isHalted = true;
        console.error(`[GUARDIAN] EMERGENCY HALT: ${reason}`);
        await this.mcp.callTool("tradingview-mcp", "ui_click", { target: "close_all_positions" });
        this.logExecution(`EMERGENCY HALT: ${reason}`);
    }

    async syncStrategyToTV() {
        if (!await this.checkSafety()) return;
        const scriptContent = fs.readFileSync(path.join(__dirname, 'scripts', 'strategy.pine'), 'utf8');
        await this.mcp.callTool("tradingview-mcp", "set_script", { content: scriptContent, addToChart: true });
        this.logExecution("Strategy Hot-Reloaded to TradingView.");
    }

    logExecution(message) {
        const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
        const logEntry = `[${timestamp}] ${message}\n`;
        fs.appendFileSync('./GUARDIAN.log', logEntry);
    }

    start() {
        console.log("Zenith Shadow Guardian active.");
        this.syncStrategyToTV();

        // Continuous GitHub Sync every 2 minutes
        setInterval(() => this.pullUpdates(), 120000);

        // Risk & Signal monitoring loop (every 5 seconds)
        setInterval(() => {
            this.checkSafety().then(safe => {
                if (safe) this.monitorRiskAndSignals();
            });
        }, 5000);
    }
}

const guardian = new Guardian();
guardian.start();
