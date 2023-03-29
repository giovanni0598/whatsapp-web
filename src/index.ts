import { RMQ, rmqio } from 'rmq.io'
import loadCommands from './commands'
import log from './utils/logger'
import startSockWebWSP from './utils/wspWeb'
const logger = log()

let broker: RMQ
const start = async () => {
  try {
    broker = rmqio({
      url: process.env.RMQ_URL || 'localhost',
      preFetchingPolicy: 50,
      binarySerialization: true,
      log: true
    })
    const sock = startSockWebWSP
    await loadCommands(broker, sock)
    await broker
      .setServiceName(process.env.SERV_NAME || '')
      .setRoute(process.env.BROKER_ROUTE || '')
      .start()
    logger.info('Connected to broker')
  } catch (e) {
    logger.error(e)
  }
}
start()

process.on('SIGINT', () => {
  broker.closeConn(() => {
    process.exit(1)
  })
})
