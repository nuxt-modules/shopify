export class SetupError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SetupError'
    }

    static missingClientType() {
        return new SetupError('Could not find client type')
    }

    static missingClientConfig() {
        return new SetupError('Could not find client config')
    }
}
