import { reportError } from '../utils/errorReporting'
import { ClientDBO, ClientError } from '@kashin-dev/biz-logic'
import { RMQ } from 'rmq.io'
import startSockWebWSP from '../utils/wspWeb'
import log from '../utils/logger'
import Bottleneck from 'bottleneck'
const logger = log()

/*
  minTime -> execution time between task
  maxConcurrent -> number of tasks to run simultaneously,
*/
const limiter = new Bottleneck({
  minTime: 100
})

export default (broker: RMQ, sock: typeof startSockWebWSP) => {
  broker.on(
    'sendMessageOfRecomendation',
    async (
      c: {
        listNumberPhone: Array<string>
        client: ClientDBO
        aggrID: string
      },
      ack,
      nack
    ) => {
      logger.info(c, 'sendMessageOfRecomendation')

      const { client } = c

      try {
        if (!client) throw new ClientError(`Client not found ${c.client.id}`)

        c.listNumberPhone.forEach(async phone => {
          const text = textForRecomend(client.name)
          const id = `${phone.slice(1)}@s.whatsapp.net`
          console.log(id)

          console.log(text)
          limiter.schedule(async () => (await sock).sendMessage(`51940135775@s.whatsapp.net`, text))
        })
      } catch (e) {
        reportError(e, {
          command: 'sendMessageOfRecomendation',
          data: c
        })
        logger.error(e)
      }
      await ack()
    }
  )
}

function textForRecomend(nameUser: string | undefined) {
  // send a template message!
  const templateButtons = [
    {
      index: 1,
      urlButton: {
        displayText: '⭐ Descargalo Ahora!',
        url: 'https://github.com/giovanni0598/whatsapp-web'
      }
    }
  ]

  const templateMessage = {
    text: `¡Hola! Tu amigo ${nameUser} está utlizando whatsapp web in terminal`,
    footer: '',
    templateButtons
  }

  return templateMessage
}
