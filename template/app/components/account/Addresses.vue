<script setup lang="ts">
import type { AddressFieldsFragment } from '#shopify/customer-account'

const props = defineProps<{
  addresses: AddressFieldsFragment[]
  defaultAddressId?: string
}>()

const emit = defineEmits<{
  updated: []
}>()

const creating = ref(false)

const addresses = computed(() => [...props.addresses].sort((a, b) =>
  Number(b.id === props.defaultAddressId) - Number(a.id === props.defaultAddressId)))
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6 lg:mb-8">
      <h2 class="text-2xl lg:text-3xl text-gray-900 font-bold">
        {{ $t('account.addresses.title') }}
      </h2>

      <UButton
        v-if="addresses.length > 0"
        trailing-icon="i-lucide-plus"
        :label="$t('account.addresses.add')"
        @click="creating = true"
      />
    </div>

    <div
      v-if="addresses.length"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <AccountAddress
        v-for="address in addresses"
        :key="address.id"
        :address="address"
        :is-default="address.id === defaultAddressId"
        @updated="emit('updated')"
      />
    </div>

    <div
      v-else
      class="flex flex-col items-center text-center gap-4 py-12"
    >
      <UIcon
        name="i-lucide-map-pin-off"
        class="size-10 text-muted"
      />

      <p class="text-muted">
        {{ $t('account.addresses.empty') }}
      </p>

      <UButton
        trailing-icon="i-lucide-plus"
        :label="$t('account.addresses.add')"
        @click="creating = true"
      />
    </div>

    <AccountAddressForm
      v-model:open="creating"
      @saved="emit('updated')"
    />
  </section>
</template>
