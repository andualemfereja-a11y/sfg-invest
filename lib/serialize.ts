// lib/serialize.ts
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recursively convert Decimal and BigInt to JSON-serializable types
 */
export function serializeData(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (data instanceof Decimal) {
    return data.toString()
  }

  if (typeof data === 'bigint') {
    return Number(data)
  }

  if (data instanceof Date) {
    return data.toISOString()
  }

  if (Array.isArray(data)) {
    return data.map(serializeData)
  }

  if (typeof data === 'object') {
    const serialized: any = {}
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeData(value)
    }
    return serialized
  }

  return data
}
