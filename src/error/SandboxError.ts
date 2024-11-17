export class SandboxError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SandboxError'
    }

    static missingClientType() {
        return new SandboxError('Could not find client type')
    }

    static missingClientConfig() {
        return new SandboxError('Could not find client config')
    }
}
