declare module '#auth-utils' {
    interface User {
        firstName: string
        lastName: string
        email: string
        phone: string
        acceptsMarketing: boolean
    }

    interface SecureSessionData {
        customerAccessToken: string
    }
}

export {}
