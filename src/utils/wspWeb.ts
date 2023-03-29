import { Boom } from '@hapi/boom'
import makeWASocket, {
  AnyMessageContent,
  delay,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  MessageRetryMap,
  useMultiFileAuthState
} from '@adiwajshing/baileys'
import pino from 'pino'

const logger = pino({})
logger.level = 'info'

const useStore = !process.argv.includes('--no-store')
const doReplies = !process.argv.includes('--no-reply')

// external map to store retry counts of messages when decryption/encryption fails
// keep this out of the socket itself, so as to prevent a message decryption/encryption loop across socket restarts
const msgRetryCounterMap: MessageRetryMap = {}

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = useStore ? makeInMemoryStore({ logger }) : undefined

store?.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
  store?.writeToFile('./baileys_store_multi.json')
}, 10_000)

// start a connection
const startSockWebWSP = async () => {
  console.log(process.cwd(),'estoy en esta ruta')
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      /** caching makes the store faster to send/recv messages */
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    msgRetryCounterMap,
    generateHighQualityLinkPreview: true,
    // ignore all broadcast messages -- to receive the same
    // comment the line below out
    shouldIgnoreJid: jid => isJidBroadcast(jid),
    // implement to handle retries
    getMessage: async key => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid!, key.id!)

        return msg?.message || undefined
      }

      // only if store is present
      return {
        conversation: 'hello'
      }
    }
  })

  store?.bind(sock.ev)

  // the process function lets you process all events that just occurred
  // efficiently in a batch
  sock.ev.process(
    // events is a map for event name => event data
    async events => {
      // something about the connection changed
      // maybe it closed, or we received all offline message or connection opened
      if (events['connection.update']) {
        const update = events['connection.update']
        const { connection, lastDisconnect } = update

        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut

        switch (connection) {
          case 'close':
            logger.info('🔴 Conexion perdida: ', lastDisconnect?.error)
            if (shouldReconnect) {
              startSockWebWSP() // YOUR INIT FUNCTION
            }
            break

          case 'connecting':
            logger.info('🟡 Esperando conexion...')
            break

          case 'open':
            logger.info('🟢 Conectado.')
            await sock.sendPresenceUpdate('available')
            await sock.updateProfileStatus('🟢 Online')
            break

          default:
            break
        }
      }
      // credentials updated -- save them
      if (events['creds.update']) {
        await saveCreds()
      }
    }
  )

  return sock
}

export default startSockWebWSP()
