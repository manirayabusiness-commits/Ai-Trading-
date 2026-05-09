/**
 * Zenith Shadow Engine - Kill Switch
 */

const fs = require('fs');
const path = require('path');
const MCPClient = require('./lib/mcp-client');
require('dotenv').config();

const BRIDGE_URL = process.env.MCP_BRIDGE_URL || 'http://localhost:3000';

async function killAll() {
    console.log("!!! KILL SWITCH ACTIVATED !!!");
    const mcp = new MCPClient(BRIDGE_URL);

    try {
        const result = await mcp.callTool("tradingview-mcp", "ui_click", { target: "close_all_positions" });
        if (result.success) {
            console.log("SUCCESS: All positions closed.");
            const timestamp = new Date().toISOString().split('.')[0];
            fs.appendFileSync('./GUARDIAN.log', `[${timestamp}] MANUAL KILL SWITCH ACTIVATED\n`);
        }
    } catch (err) {
        console.error("Kill Switch Failed:", err.message);
    }
    process.exit(0);
}

killAll();
