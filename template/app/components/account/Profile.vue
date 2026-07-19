<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerFieldsFragment } from '#shopify/customer-account'

import type * as z from 'zod'

const props = defineProps<{
  customer: CustomerFieldsFragment
}>()

const emit = defineEmits<{
  updated: []
}>()

const { updateProfile, loading } = useAccount()

const schema = customerUpdateInputSchema

type Schema = z.output<typeof schema>

const editing = ref(false)

const state = reactive<Partial<Schema>>({
  firstName: undefined,
  lastName: undefined,
})

const reset = () => {
  state.firstName = props.customer.firstName ?? undefined
  state.lastName = props.customer.lastName ?? undefined
}

const edit = () => {
  reset()

  editing.value = true
}

const fields = computed(() => [
  {
    icon: 'i-lucide-user-round',
    label: $t('account.profile.name'),
    value: [props.customer.firstName, props.customer.lastName].filter(Boolean).join(' '),
  },
  {
    icon: 'i-lucide-mail',
    label: $t('account.profile.email'),
    value: props.customer.emailAddress?.emailAddress,
  },
  {
    icon: 'i-lucide-phone',
    label: $t('account.profile.phone'),
    value: props.customer.phoneNumber?.phoneNumber,
  },
  {
    icon: 'i-lucide-map-pin',
    label: $t('account.profile.address'),
    value: props.customer.defaultAddress?.formatted.join(', '),
  },
])

const onSubmit = async ({ data }: FormSubmitEvent<Schema>) => {
  const { data: customer } = await updateProfile(data)

  if (!customer) return

  editing.value = false

  emit('updated')
}

watch(() => props.customer, reset, { immediate: true })
</script>

<template>
  <UCard :ui="{ body: editing ? '' : 'grid gap-6 sm:grid-cols-2 relative' }">
    <UForm
      v-if="editing"
      :schema="schema"
      :state="state"
      class="flex flex-col gap-6"
      @submit="onSubmit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          :label="$t('account.profile.firstName')"
          name="firstName"
        >
          <UInput
            v-model="state.firstName"
            size="lg"
            autocomplete="given-name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="$t('account.profile.lastName')"
          name="lastName"
        >
          <UInput
            v-model="state.lastName"
            size="lg"
            autocomplete="family-name"
            class="w-full"
          />
        </UFormField>
      </div>

      <p class="text-sm text-muted">
        {{ $t('account.profile.managedByShopify') }}
      </p>

      <div class="flex flex-wrap gap-3">
        <UButton
          type="submit"
          size="lg"
          :loading="loading"
          :label="$t('account.profile.save')"
          icon="i-lucide-check"
        />

        <UButton
          variant="ghost"
          color="neutral"
          size="lg"
          :disabled="loading"
          :label="$t('account.cancel')"
          @click="editing = false"
        />
      </div>
    </UForm>

    <template v-else>
      <UButton
        variant="soft"
        color="neutral"
        icon="i-lucide-pencil"
        :label="$t('account.profile.edit')"
        :ui="{
          label: 'sr-only',
        }"
        class="absolute top-4 right-4 sm:top-6 sm:right-6"
        @click="edit"
      />

      <div
        v-for="(field, index) in fields"
        :key="field.label"
        class="flex items-start gap-3"
      >
        <UIcon
          :name="field.icon"
          class="size-5 mt-0.5 text-muted shrink-0"
        />

        <div class="min-w-0">
          <p class="text-sm text-muted">
            {{ field.label }}
          </p>

          <p
            class="font-medium wrap-break-word"
            :class="{
              'pe-14 sm:pe-0': index === 0,
            }"
          >
            {{ field.value || $t('account.profile.empty') }}
          </p>
        </div>
      </div>
    </template>
  </UCard>
</template>
