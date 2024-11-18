import { defineEventHandler, send, setResponseHeader } from '#imports'

export default defineEventHandler(async (event) => {
    setResponseHeader(event, 'Content-Type', 'text/html')

    const accessToken = 'abcd1234'
    const endpoint = 'http://localhost:3000/'

    return send(event, `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>nuxt-shopify | Apollo Sandbox</title>

                <style>
                    html, body {
                        margin: 0;
                        overscroll-behavior: none;
                    }
                    
                    #sandbox {
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        left: 0;
                        top: 0;
                    }
                </style>
            </head>

            <body>
                <div id="sandbox"></div>

                <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>

                <script>
                    new window.EmbeddedSandbox({
                        target: "#sandbox",
                        handleRequest: (endpointUrl, options) => {
                            return fetch(endpointUrl, {
                                ...options,
                                headers: {
                                    Authorization: "Bearer ${accessToken}",
                                    ...options.headers,
                                },
                            })
                        },
                        endpointIsEditable: false,
                        initialEndpoint: "${endpoint}",
                    });
                </script>
            </body>
        </html>
    `)
})
