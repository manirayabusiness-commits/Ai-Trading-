const axios = require('axios');

class MCPClient {
    constructor(url) {
        this.url = url;
    }

    async callTool(server, tool, params) {
        console.log(`[MCP] Calling ${server}:${tool}...`);
        try {
            const response = await axios.post(this.url, {
                jsonrpc: "2.0",
                method: "call_tool",
                params: {
                    name: tool,
                    arguments: params
                },
                id: Date.now()
            }, { timeout: 5000 });
            return response.data.result || { success: false, error: "No result returned" };
        } catch (err) {
            console.error(`[MCP ERROR] Failed to call ${tool}:`, err.message);
            return { success: false, error: err.message };
        }
    }
}

module.exports = MCPClient;
