<script setup lang="ts">
const props = defineProps<{
  product: ProductFieldsFragment
}>()

const open = useCartDrawer()
const { formProps, register } = useCartForm()

const soldOut = computed(() => isSoldOut(props.product))

const variant = computed(() => props.product.selectedOrFirstAvailableVariant)

const addable = computed(() => !props.product.requiresSellingPlan && !!variant.value?.availableForSale)

const label = computed(() => {
  if (addable.value) return $t('product.add')

  return soldOut.value ? $t('product.soldOut') : $t('product.unavailable')
})
</script>

<template>
  <form v-bind="formProps({ beforeSubmit: () => { open = true } })">
    <input
      v-if="variant"
      type="hidden"
      v-bind="register('merchandiseId', { value: variant.id })"
    >

    <UButton
      type="submit"
      v-bind="register('add')"
      color="neutral"
      variant="ghost"
      :disabled="!addable"
      :trailing-icon="addable ? 'i-lucide-shopping-bag' : 'i-lucide-ban'"
      :label="label"
      :aria-label="label"
      :ui="{
        trailingIcon: 'size-5',
        label: [
          'ms-auto',
          'max-w-0',
          'invisible',
          'group-focus:visible',
          'group-focus:max-w-full',
          'group-hover:visible',
          'group-hover:max-w-full',
          'transition-all',
          'duration-300',
          'truncate-0',
          'ps-1.5',
          'pe-1',
        ],
        base: 'absolute bottom-0 group rounded-full p-2.5',
      }"
    />
  </form>
</template>
