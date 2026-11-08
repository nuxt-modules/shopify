<script setup lang="ts">
import type { CartLine } from '~/utils/cart'

const props = defineProps<{
  line: CartLine
}>()

const { formProps, register } = useCartForm()
const pendingLines = useCart(state => state.pending.lines)
const lineErrors = useCart(state => state.errors.lines)
const localePath = useLocalePath()

const merchandise = computed(() => props.line.merchandise)
const to = computed(() => merchandise.value?.product.handle ? localePath(`/products/${merchandise.value.product.handle}`) : undefined)
const defaultVariant = computed(() => merchandise.value?.title === 'Default Title')

const optimistic = computed(() => props.line.id.startsWith('optimistic:'))
const pending = computed(() => pendingLines.value.has(props.line.id))
const errors = computed(() => lineErrors.value.get(props.line.id)?.userErrors ?? [])

const errorId = useId()
</script>

<template>
  <form v-bind="formProps()">
    <button v-bind="register('set')" />

    <input
      type="hidden"
      v-bind="register('lineId', { value: line.id })"
    >

    <UCard :ui="{ body: 'relative flex justify-between gap-8' }">
      <NuxtLink
        :to="to"
        :aria-label="`${$t('product.view')}: '${merchandise?.product.title}'`"
      >
        <NuxtImg
          provider="shopify"
          :src="merchandise?.image?.url"
          :alt="merchandise?.image?.altText ?? merchandise?.product.title"
          width="160"
          height="160"
          class="size-24 lg:size-28"
        />
      </NuxtLink>

      <div class="min-h-24 flex flex-col justify-between grow lg:min-h-28">
        <NuxtLink
          :to="to"
          class="pt-2.5 font-medium"
        >
          {{ merchandise?.product.title }}<template v-if="!defaultVariant">
            - {{ merchandise?.title }}
          </template>
        </NuxtLink>

        <div class="flex justify-between gap-4">
          <div
            class="flex items-center transition-opacity"
            :class="{ 'opacity-50': pending }"
          >
            <UButton
              type="submit"
              v-bind="register('decrease')"
              icon="i-lucide-minus"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="$t('cart.decrease')"
              :disabled="optimistic"
            />

            <input
              v-bind="register('quantity', { value: line.quantity, interactive: true })"
              class="w-10 text-center bg-transparent"
              :aria-label="$t('product.quantity')"
              :aria-invalid="errors.length > 0 || undefined"
              :aria-describedby="errors.length ? errorId : undefined"
              :disabled="optimistic"
            >

            <UButton
              type="submit"
              v-bind="register('increase')"
              icon="i-lucide-plus"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="$t('cart.increase')"
              :disabled="optimistic"
            />
          </div>

          <ProductPrice
            :price="line.cost.totalAmount"
            class="font-semibold leading-8 transition-opacity"
            :class="{ 'opacity-50': pending }"
          />
        </div>

        <div
          v-if="errors.length"
          :id="errorId"
          role="alert"
          class="text-sm text-error"
        >
          <p
            v-for="error in errors"
            :key="error.message"
          >
            {{ error.message }}
          </p>
        </div>
      </div>

      <UButton
        type="submit"
        v-bind="register('remove')"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        size="sm"
        class="absolute top-0 right-0 p-2 rounded-none rounded-bl-md"
        :aria-label="$t('cart.remove')"
        :disabled="optimistic"
      />
    </UCard>
  </form>
</template>
