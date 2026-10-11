import path from 'node:path'
import { initSchema, openDb, seedDemo } from './db'
import { createApp } from './app'
import { BRAND } from '../shared/brand'

// The host environment may export PORT=0 (ephemeral) — fall back to a real port.
const envPort = Number(process.env.PORT)
const port = Number.isInteger(envPort) && envPort > 0 ? envPort : 3001
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'store.db')

const db = openDb(dbPath)
initSchema(db)
seedDemo(db)

const app = createApp(db)
const server = app.listen(port, () => {
  const address = server.address()
  const boundPort = typeof address === 'object' && address ? address.port : port
  console.log(`✔ براند «${BRAND.name}» (${BRAND.latin}) يعمل على  http://localhost:${boundPort}`)
  console.log('  حساب المدير : admin@demo.local  /  admin1234')
  console.log('  حساب عميل   : customer@demo.local  /  customer1234')
})
