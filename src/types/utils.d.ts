import type { SerializeObject, Simplify } from 'nitropack/types'

// Convenience utility to use generated types after serialization with nitro
export type Serialized<T extends object> = Simplify<SerializeObject<T>>
export type S<T extends object> = Serialized<T>
