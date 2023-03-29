import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0
})

interface ErrorData {
  command: string
  data: any
}

export const reportError = (e: unknown, data: ErrorData) => {
  const scope = new Sentry.Scope()
  scope.setTag('ms', process.env.SERV_NAME)
  scope.setTag('environment', process.env.NODE_ENV)
  scope.setTag('command', data.command)
  scope.setExtra('data', data.data)
  Sentry.captureException(e, scope)
}
