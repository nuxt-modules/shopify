import type { SerializeObject, Simplify } from 'nitropack'

// Convenience utility to use generated types after serialization with nitro
export type Serialized<T> = Simplify<SerializeObject<T>>
export type S<T> = Serialized<T>
