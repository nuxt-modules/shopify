declare module '#auth-utils' {
    interface User {
        firstName: string | null
        lastName: string | null
        email: string
    }

    interface SecureSessionData {
        accessToken: string
        refreshToken: string
    }
}

export {}
