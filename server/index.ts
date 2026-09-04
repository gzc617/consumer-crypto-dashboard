import { createApp } from './app.ts'

const host = '0.0.0.0'
const port = Number(process.env.PORT) || 3000

const server = createApp()

server.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`)
})
