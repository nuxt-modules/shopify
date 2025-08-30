/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GenericApiClient } from '../shopify'

declare module '#shopify/clients/admin' {
    interface AdminQueries {
        [key: string]: {
            variables: any
            return: any
        }
        [key: number | symbol]: never
    }

    interface AdminMutations {
        [key: string]: {
            variables: any
            return: any
        }
        [key: number | symbol]: never
    }

    interface AdminOperations extends AdminQueries, AdminMutations {}

    export type AdminApiClient = GenericApiClient<AdminOperations>
}
