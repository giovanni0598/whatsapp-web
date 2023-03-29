import { RMQ } from 'rmq.io'
import startSockWebWSP from '../utils/wspWeb'
import { getLibs, makeRelative } from '../utils/files'

export default async (broker: RMQ, sock: typeof startSockWebWSP) => {
  let libs = getLibs('src/commands')
  libs = makeRelative(libs, __dirname)
  libs
    .filter(f => !/index/.test(f))
    .map(async (l: string) => {
      const lib = await import('./' + l)
      lib.default(broker, sock)
    })
}
