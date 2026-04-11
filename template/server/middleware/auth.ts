export default defineEventHandler(async (event) => {
    if (event.path.includes('/account/')) {
        await requireUserSession(event)
    }
})
