/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GenericApiClient } from '../client'

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

    type AdminApiClient = GenericApiClient<AdminOperations>

    export {
        AdminQueries,
        AdminMutations,
        AdminOperations,
        AdminApiClient,
    }
}
