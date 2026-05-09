/**
 * Zenith Shadow Engine - Level 3: The Guardian
 *
 * Integrates with tradingview-mcp via a standard MCP client pattern.
 * Enforces Risk Guard (1% drawdown) and Daily Hard Stop (2% loss).
 * Monitors UI focus safety.
 */

const fs = require('fs');
require('dotenv').config();

class MCPClient {
    async callTool(server, tool, params) {
        console.log(`[MCP] Calling ${server}:${tool} with`, params);
        return { success: true };
    }
}

class Guardian {
    constructor() {
        this.config = JSON.parse(fs.readFileSync('./execution_params.json', 'utf8'));
        this.initialBalance = this.config.risk_management.initial_capital;
        this.drawdownLimit = this.config.risk_management.max_drawdown_percent / 100;
        this.dailyLossLimit = this.config.risk_management.daily_loss_limit_percent / 100;

        this.mcp = new MCPClient();
        this.isHalted = false;
        this.dailyStartingBalance = this.initialBalance; // Should be fetched from persistent storage in real app
    }

    async checkUIFocus() {
        // PRD Requirement 5: TradingView Desktop must remain the focused window.
        // In real implementation, use MCP to check active window title or focus state.
        const isFocused = true; // Mock focus state
        if (!isFocused) {
            console.warn("[SAFETY] TradingView focus lost! Pausing execution.");
            return false;
        }
        return true;
    }

    async monitorRisk(currentBalance) {
        const totalLoss = this.initialBalance - currentBalance;
        const totalDrawdownPercent = totalLoss / this.initialBalance;

        const dailyLoss = this.dailyStartingBalance - currentBalance;
        const dailyLossPercent = dailyLoss / this.dailyStartingBalance;

        // 1% Max Drawdown Guard
        if (totalDrawdownPercent >= this.drawdownLimit) {
            console.error(`[RISK GUARD] Max drawdown limit exceeded: ${(totalDrawdownPercent * 100).toFixed(2)}%.`);
            await this.emergencyHalt("Max drawdown limit reached");
            return;
        }

        // 2% Daily Hard Stop
        if (dailyLossPercent >= this.dailyLossLimit) {
            console.error(`[RISK GUARD] Daily loss limit reached: ${(dailyLossPercent * 100).toFixed(2)}%.`);
            await this.emergencyHalt("Daily loss limit reached");
            return;
        }
    }

    async emergencyHalt(reason) {
        if (this.isHalted) return;
        this.isHalted = true;

        console.log(`[GUARDIAN] EMERGENCY HALT: ${reason}`);

        // Call MCP to close all positions immediately
        await this.mcp.callTool("tradingview-mcp", "ui_click", { target: "close_all_positions" });

        this.logDecision("EMERGENCY HALT", reason);
    }

    async syncStrategy() {
        if (!await this.checkUIFocus()) return;

        const scriptContent = fs.readFileSync('./scripts/strategy.pine', 'utf8');
        console.log(`[GUARDIAN] Syncing Pine Script to TradingView Editor...`);

        await this.mcp.callTool("tradingview-mcp", "set_script", {
            content: scriptContent,
            addToChart: true
        });
    }

    logDecision(action, reason) {
        const timestamp = new Date().toISOString().split('T')[0];
        const logEntry = `| ${timestamp} | Guardian | ${action} | ${reason} |\n`;
        fs.appendFileSync('./DECISIONS.log', logEntry);
    }

    async start() {
        console.log("Zenith Shadow Guardian starting...");
        await this.syncStrategy();

        setInterval(async () => {
            if (this.isHalted) return;
            if (!await this.checkUIFocus()) return;

            // Mocking balance fetch for risk check
            let currentBalance = 98500; // Mock 1.5% loss for demo
            await this.monitorRisk(currentBalance);
        }, 5000);
    }
}

const guardian = new Guardian();
guardian.start();
