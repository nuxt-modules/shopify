import { defineEventHandler, setResponseHeader, createError, send } from '#imports'

export default defineEventHandler(async (event) => {
    const clientType = event.node.req.url?.split('/').pop()
    if (!clientType) throw createError({
        statusCode: 404,
        message: 'Sandbox not found',
    })

    setResponseHeader(event, 'Content-Type', 'text/html')

    return send(event, `
        <!doctype html>
        <html lang="en">
            <head>
                <title>GraphiQL - ${clientType}</title>
                <style>
                    body {
                        height: 100%;
                        margin: 0;
                        width: 100%;
                        overflow: hidden;
                    }
                    
                    #graphiql {
                        height: 100vh;
                    }
                </style>
                
                <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
                <script src="https://unpkg.com/graphiql/graphiql.min.js" type="application/javascript"></script>
                <script src="https://unpkg.com/@graphiql/plugin-explorer/dist/index.umd.js" crossorigin></script>
                <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet"/>
                <link href="https://unpkg.com/@graphiql/plugin-explorer/dist/style.css" rel="stylesheet"/>
            </head>
            
            <body>
                <div id="graphiql">Loading...</div>
                <script>
                    const root = ReactDOM.createRoot(document.getElementById('graphiql'));
                    const explorerPlugin = GraphiQLPluginExplorer.explorerPlugin();
                    const fetcher = async (graphQLParams) => {
                    const response = await fetch('/api/_proxy/${clientType}', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(graphQLParams),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch data');
                    }

                    return response.json();
                };

                    root.render(
                        React.createElement(GraphiQL, {
                            fetcher,
                            defaultEditorToolsVisibility: true,
                            plugins: [explorerPlugin],
                        }),
                    );
                </script>
            </body>
        </html>
    `)
})
