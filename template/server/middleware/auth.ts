export default defineEventHandler(async (event) => {
    if (event.path.includes('/account/')) {
        const session = await getUserSession(event)

        if (!session || !session.user) {
            throw createError({
                statusCode: 401,
                fatal: true,
                message: 'Unauthorized',
            })
        }
    }
})
