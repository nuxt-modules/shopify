import { defineEventHandler, send, setResponseHeader } from '#imports'

export default defineEventHandler(async (event) => {
    setResponseHeader(event, 'Content-Type', 'text/html')

    return send(event, `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Apollo Sandbox</title>
            </head>
            <body>
                <div id="sandbox"></div>

                <style>
                    body {
                        margin: 0;
                    }

                    iframe {
                        height: 100%;
                        width: 100%;
                        border: none;
                    }
                </style>
            </body>
        </html>
    `)
})
