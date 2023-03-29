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
          limiter.schedule(async () => (await sock).sendMessage(`51940135775@s.whatsapp.net`, {text:"hola mundo"}))
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
        url: 'https://bit.ly/kashin-recomendado'
      }
    }
  ]

  const templateMessage = {
    text: `¡Hola! Tu amigo ${nameUser}, está utilizando Kashin, la aplicación de préstamos inmediatos, y está teniendo tan buena experiencia que nos recomendó invitarte a descargar la app.

¡Qué esperas, descarga la aplicación y comienza a disfrutar de los mejores préstamos del Perú!`,
    footer: '',
    templateButtons
  }

  return templateMessage
}
