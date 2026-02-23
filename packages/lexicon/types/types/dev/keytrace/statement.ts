/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'dev.keytrace.statement'

export interface Main {
  $type: 'dev.keytrace.statement'
  /** The statement text that was signed. */
  content: string
  /** Optional short subject or title for the statement. */
  subject?: string
  /** AT URI of the dev.keytrace.userPublicKey record whose private key produced this signature (e.g., at://did:plc:xxx/dev.keytrace.userPublicKey/3k4...) */
  keyRef: string
  /** Cryptographic signature of the content field, produced by the key referenced in keyRef (PGP cleartext or detached, base64-encoded binary signature). */
  sig: string
  /** Datetime when this statement was retracted. Present only if the statement has been retracted (ISO 8601). */
  retractedAt?: string
  /** Datetime when this statement was created (ISO 8601). */
  createdAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}
