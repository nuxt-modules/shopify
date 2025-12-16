export default defineWebhookEventHandler((event) => {
    console.log('Received test webhook without validation errors!', event)

    return { success: true }
})
