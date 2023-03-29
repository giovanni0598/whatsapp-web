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
  maxConcurrent: 5,
  minTime: 30000
})

interface destinations {
  text: string
  phoneNumber: string
}

export default (broker: RMQ, sock: typeof startSockWebWSP) => {
  broker.on(
    'sendMessageGeneric',
    async (
      c: {
        listDestination: Array<destinations>
        aggrID: string
      },
      ack,
      nack
    ) => {
      logger.info(c, 'sendMessageGeneric')

      try {
        c.listDestination.forEach(async destination => {
          const text = textForRecomend(destination.text)
          console.log(destination.phoneNumber)
          const id = `${destination.phoneNumber.slice(1)}@s.whatsapp.net`

          limiter.schedule(async () => (await sock).sendMessage(id, text ))
        })
      } catch (e) {
        reportError(e, {
          command: 'sendMessageGeneric',
          data: c
        })
        logger.error(e)
      }
      await ack()
    }
  )
}



function textForRecomend(name: string) {
  // send a template message!
  const text = `Hola ${name} tienes un préstamo aprobado en Kashin 💸\n
Solamente nos faltaron tus datos para realizar la transferencia.\n
¿Por favor, podrías ayudarnos respondiendo la siguiente pregunta para mejorar nuestra aplicación?\n
https://bit.ly/kashin_info\n
Recuerda que cuando desees puedes ingresar a la aplicación y completar tus datos para recibir tu primer préstamo Kashin.\n
¡Muchas gracias!`
  
  const listMessage = {
    text
  }


  return listMessage
}
