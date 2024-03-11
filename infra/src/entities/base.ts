export type Item<T = Record<string, unknown>> = T & {
  pk: `#TENANT#${string}#USER#${string}`
}
