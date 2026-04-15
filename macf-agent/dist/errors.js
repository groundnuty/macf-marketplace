/**
 * Base error class for all MACF errors.
 * Each subclass provides a unique `code` string for programmatic handling.
 */
export class MacfError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'MacfError';
        this.code = code;
    }
}
export class ConfigError extends MacfError {
    constructor(message) {
        super('CONFIG_ERROR', message);
        this.name = 'ConfigError';
    }
}
export class McpChannelError extends MacfError {
    constructor(message) {
        super('MCP_CHANNEL_ERROR', message);
        this.name = 'McpChannelError';
    }
}
export class HttpsServerError extends MacfError {
    constructor(message) {
        super('HTTPS_SERVER_ERROR', message);
        this.name = 'HttpsServerError';
    }
}
export class PortUnavailableError extends MacfError {
    port;
    constructor(port) {
        super('PORT_UNAVAILABLE', `Port ${port} is already in use`);
        this.name = 'PortUnavailableError';
        this.port = port;
    }
}
export class PortExhaustedError extends MacfError {
    constructor() {
        super('PORT_EXHAUSTED', 'Failed to find available port after 10 attempts');
        this.name = 'PortExhaustedError';
    }
}
export class ValidationError extends MacfError {
    constructor(message) {
        super('VALIDATION_ERROR', message);
        this.name = 'ValidationError';
    }
}
//# sourceMappingURL=errors.js.map