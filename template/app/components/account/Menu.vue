<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

import * as z from 'zod'

const { isLoggedIn, login, logout } = useCustomerAccountSession()
const localePath = useLocalePath()
const route = useRoute()

const schema = z.object({
  email: z.email().optional(),
  subscribeNewsletter: z.boolean().optional(),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  subscribeNewsletter: false,
})

const open = ref(false)

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  const returnToOrders = event.submitter?.attributes.getNamedItem('data-return-to-orders')?.value !== undefined

  await login({
    loginHint: event.data.email,
    returnTo: returnToOrders ? '/account/orders' : '/account',
  })
}

watch(() => route.path, () => open.value = false)
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{
      content: 'mt-1 mr-2 lg:mr-4 max-w-[calc(100vw-1rem)]',
    }"
  >
    <UButton
      :icon="isLoggedIn ? 'i-lucide-user-round-check' : 'i-lucide-user-round'"
      variant="ghost"
      color="neutral"
      :label="$t('account.label')"
      :ui="{
        label: 'sr-only',
        base: 'px-1.5 lg:px-2',
      }"
    />

    <template #content>
      <div class="p-5">
        <div class="flex justify-between">
          <p class="text-lg lg:text-xl text-gray-900 font-semibold pe-10 mb-6">
            <span v-if="!isLoggedIn">
              {{ $t('account.signIn.title') }}
            </span>

            <span v-else>
              {{ $t('account.menu.title') }}
            </span>
          </p>

          <UButton
            variant="soft"
            color="neutral"
            size="sm"
            :icon="'i-lucide-x'"
            :ui="{
              base: 'p-1.5 size-7',
              label: 'sr-only',
            }"
            :label="$t('account.menu.close')"
            @click="open = false"
          />
        </div>

        <template v-if="!isLoggedIn">
          <UForm
            :schema="schema"
            :state="state"
            class="flex flex-col space-y-2"
            @submit="onSubmit"
          >
            <UInput
              v-model="state.email"
              size="xl"
              trailing-icon="i-lucide-arrow-right"
              placeholder="E-Mail"
              :ui="{
                trailingIcon: 'size-4',
              }"
            />

            <UCheckbox
              v-model="state.subscribeNewsletter"
              :label="$t('account.subscribeNewsletter')"
              :ui="{
                label: 'text-sm',
              }"
            />

            <div class="mt-4 flex justify-between gap-6">
              <UButton
                type="submit"
                variant="outline"
                size="xl"
                :label="$t('account.menu.orders')"
                trailing-icon="i-lucide-map-pin-house"
                :ui="{
                  trailingIcon: 'size-4',
                }"
                class="grow justify-center"
                data-return-to-orders
              />

              <UButton
                type="submit"
                variant="soft"
                size="xl"
                trailing-icon="i-lucide-log-in"
                :ui="{
                  trailingIcon: 'size-4',
                }"
                class="grow justify-center"
              >
                {{ $t('account.signIn.action') }}
              </UButton>
            </div>
          </UForm>
        </template>

        <template v-else>
          <UButton
            :to="localePath('/account')"
            size="xl"
            class="w-full justify-center mb-4"
            :label="$t('account.menu.profile')"
            icon="i-lucide-user-round"
          />

          <UButton
            :to="localePath('/account/orders')"
            variant="soft"
            size="xl"
            class="w-full justify-center text-center mb-4"
            :label="$t('account.menu.orders')"
            icon="i-lucide-map-pin-house"
          />

          <UButton
            :to="localePath('/account/logout')"
            variant="outline"
            size="xl"
            class="w-full justify-center text-center"
            :label="$t('account.logout')"
            icon="i-lucide-log-out"
            @click="logout()"
          />
        </template>
      </div>
    </template>
  </UPopover>
</template>
