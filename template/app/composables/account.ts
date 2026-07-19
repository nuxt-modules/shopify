import type { AddressFieldsFragment, CustomerFieldsFragment } from '#shopify/customer-account'

type UserError = {
  field?: string[] | null
  message: string
}

type MutationResult<T> = {
  data?: T
  userErrors: UserError[]
}

export const useAccount = () => {
  const customerAccount = useCustomerAccount()
  const toast = useToast()
  const { t } = useI18n()

  const loading = useState('shopify-account-loading', () => false)

  const notify = (title: string, color: 'success' | 'error') => toast.add({
    title,
    ...(color === 'error' ? { description: t('account.toast.error.tryAgain') } : {}),
    color,
  })

  const mutate = async <T>(
    run: () => Promise<{ result?: T | null, userErrors?: UserError[] | null } | undefined>,
    messages: { success: string, error: string },
  ): Promise<MutationResult<T>> => {
    loading.value = true

    try {
      const payload = await run()

      const userErrors = payload?.userErrors ?? []

      if (userErrors.length) {
        notify(userErrors[0]?.message ?? t(messages.error), 'error')

        return { userErrors }
      }

      if (!payload?.result) {
        notify(t(messages.error), 'error')

        return { userErrors: [] }
      }

      notify(t(messages.success), 'success')

      return { data: payload.result, userErrors: [] }
    }
    catch {
      notify(t(messages.error), 'error')

      return { userErrors: [] }
    }
    finally {
      loading.value = false
    }
  }

  const updateProfile = (input: unknown) => mutate<CustomerFieldsFragment>(async () => {
    const { data } = await customerAccount.request(`#graphql
      mutation UpdateCustomer($input: CustomerUpdateInput!) {
        customerUpdate(input: $input) {
          customer {
            ...CustomerFields
          }
          userErrors {
            ...CustomerUserErrorFields
          }
        }
      }
      ${ADDRESS_FRAGMENT}
      ${CUSTOMER_FRAGMENT}
      ${CUSTOMER_USER_ERRORS_FRAGMENT}
    `, {
      variables: { input: customerUpdateInputSchema.parse(input) },
    })

    return {
      result: data?.customerUpdate?.customer,
      userErrors: data?.customerUpdate?.userErrors,
    }
  }, {
    success: 'account.profile.toast.updated',
    error: 'account.profile.toast.error',
  })

  const createAddress = (input: unknown) => mutate<AddressFieldsFragment>(async () => {
    const { address, defaultAddress } = customerAddressCreateInputSchema.parse(input)

    const { data } = await customerAccount.request(`#graphql
      mutation CreateCustomerAddress($address: CustomerAddressInput!, $defaultAddress: Boolean) {
        customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
          customerAddress {
            ...AddressFields
          }
          userErrors {
            ...AddressUserErrorFields
          }
        }
      }
      ${ADDRESS_FRAGMENT}
      ${ADDRESS_USER_ERRORS_FRAGMENT}
    `, {
      variables: { address, defaultAddress },
    })

    return {
      result: data?.customerAddressCreate?.customerAddress,
      userErrors: data?.customerAddressCreate?.userErrors,
    }
  }, {
    success: 'account.addresses.toast.created',
    error: 'account.addresses.toast.error',
  })

  const updateAddress = (input: unknown) => mutate<AddressFieldsFragment>(async () => {
    const { addressId, address, defaultAddress } = customerAddressUpdateInputSchema.parse(input)

    const { data } = await customerAccount.request(`#graphql
      mutation UpdateCustomerAddress($addressId: ID!, $address: CustomerAddressInput, $defaultAddress: Boolean) {
        customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
          customerAddress {
            ...AddressFields
          }
          userErrors {
            ...AddressUserErrorFields
          }
        }
      }
      ${ADDRESS_FRAGMENT}
      ${ADDRESS_USER_ERRORS_FRAGMENT}
    `, {
      variables: { addressId, address, defaultAddress },
    })

    return {
      result: data?.customerAddressUpdate?.customerAddress,
      userErrors: data?.customerAddressUpdate?.userErrors,
    }
  }, {
    success: 'account.addresses.toast.updated',
    error: 'account.addresses.toast.error',
  })

  const setDefaultAddress = (addressId: string) => updateAddress({ addressId, defaultAddress: true })

  const deleteAddress = (input: unknown) => mutate<string>(async () => {
    const { addressId } = customerAddressDeleteInputSchema.parse(input)

    const { data } = await customerAccount.request(`#graphql
      mutation DeleteCustomerAddress($addressId: ID!) {
        customerAddressDelete(addressId: $addressId) {
          deletedAddressId
          userErrors {
            ...AddressUserErrorFields
          }
        }
      }
      ${ADDRESS_USER_ERRORS_FRAGMENT}
    `, {
      variables: { addressId },
    })

    return {
      result: data?.customerAddressDelete?.deletedAddressId,
      userErrors: data?.customerAddressDelete?.userErrors,
    }
  }, {
    success: 'account.addresses.toast.deleted',
    error: 'account.addresses.toast.error',
  })

  return {
    loading,

    updateProfile,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
  }
}
