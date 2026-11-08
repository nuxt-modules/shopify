<script setup lang="ts">
const discountCodes = useCart(state => state.data.discountCodes)
const pending = useCart(state => state.pending.discountCodes)
const errors = useCart(state => state.errors.discountCodes)

const { formProps, register } = useCartForm()

const draft = ref('')

const validate = (event: SubmitEvent) => {
  const code = draft.value.trim().toLowerCase()

  if (!code || discountCodes.value.some(discount => discount.code.toLowerCase() === code)) event.preventDefault()
}

const reset = () => draft.value = ''

const errorOf = (code: string) => {
  const group = errors.value.get(code)

  return (group?.userErrors[0] ?? group?.warnings[0])?.message
}

const errorId = useId()
</script>

<template>
  <div class="flex flex-col gap-3 w-full">
    <ul
      v-if="discountCodes.length"
      class="flex flex-col gap-2"
    >
      <li
        v-for="(discount, index) in discountCodes"
        :key="discount.code"
        class="flex flex-wrap items-center gap-2 text-sm"
      >
        <form
          v-bind="formProps()"
          class="flex items-center gap-2 transition-opacity"
          :class="{ 'opacity-50': pending.has(discount.code) }"
        >
          <input
            type="hidden"
            v-bind="register('discountCode', { value: discount.code })"
          >

          <UBadge
            :color="discount.applicable ? 'success' : 'warning'"
            variant="subtle"
            :title="discount.applicable ? $t('cart.discount.applied') : $t('cart.discount.notApplicable')"
            class="font-mono"
          >
            {{ discount.code }}

            <span class="sr-only">
              {{ discount.applicable ? $t('cart.discount.applied') : $t('cart.discount.notApplicable') }}
            </span>
          </UBadge>

          <UButton
            type="submit"
            v-bind="register('discount-remove')"
            variant="link"
            color="neutral"
            size="xs"
            icon="i-lucide-x"
            :aria-label="$t('cart.discount.remove', { code: discount.code })"
            :aria-describedby="errorOf(discount.code) ? `${errorId}-${index}` : undefined"
          />
        </form>

        <p
          v-if="errorOf(discount.code)"
          :id="`${errorId}-${index}`"
          role="alert"
          class="text-error"
        >
          {{ errorOf(discount.code) }}
        </p>
      </li>
    </ul>

    <form
      v-bind="formProps({ beforeSubmit: validate, afterSubmit: reset })"
      class="flex gap-2"
    >
      <UInput
        v-model="draft"
        v-bind="register('discountCode', { defaultValue: '' })"
        :placeholder="$t('cart.discount.placeholder')"
        :aria-label="$t('cart.discount.label')"
        class="grow"
      />

      <UButton
        type="submit"
        v-bind="register('discount-apply')"
        variant="soft"
        :label="$t('cart.discount.apply')"
      />
    </form>
  </div>
</template>
