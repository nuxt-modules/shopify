<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AddressFieldsFragment } from '#shopify/customer-account'

import * as z from 'zod'

const props = defineProps<{
  address?: AddressFieldsFragment
  isDefault?: boolean
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { default: false })

const { createAddress, updateAddress, loading } = useAccount()
const { country } = useLocalization()

const countries = await useCountries()

const schema = customerAddressInputSchema.extend({
  defaultAddress: z.boolean().optional(),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({})

const reset = () => {
  state.firstName = props.address?.firstName ?? undefined
  state.lastName = props.address?.lastName ?? undefined
  state.company = props.address?.company ?? undefined
  state.address1 = props.address?.address1 ?? undefined
  state.address2 = props.address?.address2 ?? undefined
  state.city = props.address?.city ?? undefined
  state.zip = props.address?.zip ?? undefined
  state.territoryCode = props.address?.territoryCode ?? country.value.toUpperCase()
  state.zoneCode = props.address?.zoneCode ?? undefined
  state.phoneNumber = props.address?.phoneNumber ?? undefined
  state.defaultAddress = props.isDefault || undefined
}

const onSubmit = async ({ data }: FormSubmitEvent<Schema>) => {
  const { defaultAddress, ...address } = data

  const { data: saved } = props.address
    ? await updateAddress({ addressId: props.address.id, address, defaultAddress })
    : await createAddress({ address, defaultAddress })

  if (!saved) return

  open.value = false

  emit('saved')
}

watch(open, value => value && reset(), { immediate: true })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="address ? $t('account.addresses.edit') : $t('account.addresses.add')"
    :description="$t('account.addresses.description')"
    :ui="{ description: 'sr-only' }"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('account.addresses.fields.firstName')"
            name="firstName"
          >
            <UInput
              v-model="state.firstName"
              autocomplete="given-name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('account.addresses.fields.lastName')"
            name="lastName"
          >
            <UInput
              v-model="state.lastName"
              autocomplete="family-name"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('account.addresses.fields.company')"
          name="company"
        >
          <UInput
            v-model="state.company"
            autocomplete="organization"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('account.addresses.fields.address1')"
          name="address1"
          required
        >
          <UInput
            v-model="state.address1"
            autocomplete="address-line1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('account.addresses.fields.address2')"
          name="address2"
        >
          <UInput
            v-model="state.address2"
            autocomplete="address-line2"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField
            :label="$t('account.addresses.fields.zip')"
            name="zip"
            required
          >
            <UInput
              v-model="state.zip"
              autocomplete="postal-code"
              class="w-full"
            />
          </UFormField>

          <UFormField
            class="sm:col-span-2"
            :label="$t('account.addresses.fields.city')"
            name="city"
            required
          >
            <UInput
              v-model="state.city"
              autocomplete="address-level2"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            :label="$t('account.addresses.fields.country')"
            name="territoryCode"
            required
          >
            <USelectMenu
              v-model="state.territoryCode"
              :items="countries"
              value-key="value"
              autocomplete="country"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="$t('account.addresses.fields.zone')"
            name="zoneCode"
            :hint="$t('account.addresses.fields.zoneHint')"
          >
            <UInput
              v-model="state.zoneCode"
              autocomplete="address-level1"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          :label="$t('account.addresses.fields.phone')"
          name="phoneNumber"
        >
          <UInput
            v-model="state.phoneNumber"
            type="tel"
            autocomplete="tel"
            class="w-full"
          />
        </UFormField>

        <UCheckbox
          v-model="state.defaultAddress"
          :disabled="isDefault"
          :label="$t('account.addresses.setDefault')"
        />

        <div class="flex flex-wrap justify-end gap-3 pt-2">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="loading"
            :label="$t('account.cancel')"
            @click="open = false"
          />

          <UButton
            type="submit"
            :loading="loading"
            :label="$t('account.addresses.save')"
            icon="i-lucide-check"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
