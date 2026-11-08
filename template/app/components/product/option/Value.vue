<script setup lang="ts">
import type { ProductFormOptionValue } from '~/utils/product-form'

const props = defineProps<{
  optionName: string
  value: ProductFormOptionValue
  kind: 'color' | 'image' | 'text'
  to: string
  crossProduct: boolean
  replace?: boolean
}>()

const form = useProductForm()

const shape = computed(() => ({
  color: 'rounded-full p-0.5',
  image: 'rounded-lg overflow-hidden',
  text: 'rounded-lg p-3.5 text-sm font-medium',
})[props.kind])

const label = computed(() => {
  if (props.kind === 'text') return undefined

  return props.value.exists && !props.value.available ? `${props.value.name}, ${$t('product.soldOut')}` : props.value.name
})

const select = (event: MouseEvent) => {
  const anchor = event.currentTarget

  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || !(anchor instanceof HTMLAnchorElement)
    || (anchor.target !== '' && anchor.target.toLowerCase() !== '_self')
    || anchor.hasAttribute('download')
  ) return

  event.preventDefault()

  form.register('optionValue', { optionName: props.optionName, value: props.value.name }).onClick()
}
</script>

<template>
  <NuxtLink
    v-if="props.crossProduct"
    :to="props.to"
    class="inline-flex items-center justify-center border border-default transition-colors outline-primary/25 hover:bg-elevated/50 hover:border-accented focus-visible:outline-3 focus-visible:border-primary"
    :class="[shape, { 'opacity-50 line-through': !props.value.available }]"
    :aria-label="label"
    :replace="props.replace"
  >
    <slot />

    <span
      v-if="!props.value.available"
      class="sr-only"
    >
      {{ $t('product.soldOut') }}
    </span>
  </NuxtLink>

  <button
    v-else-if="!props.value.exists"
    type="button"
    class="inline-flex items-center justify-center border border-default opacity-25 cursor-not-allowed"
    :class="shape"
    :aria-label="label"
    :aria-pressed="props.value.selected"
    disabled
  >
    <slot />
  </button>

  <NuxtLink
    v-else
    v-slot="{ href }"
    :to="props.to"
    custom
  >
    <a
      :href="href ?? undefined"
      class="inline-flex items-center justify-center border transition-colors outline-primary/25 focus-visible:outline-3 focus-visible:border-primary"
      :class="[shape, {
        'border-primary/50 bg-primary/10': props.value.selected,
        'border-default hover:bg-elevated/50 hover:border-accented': !props.value.selected,
        'opacity-50 line-through': !props.value.available,
      }]"
      :aria-label="label"
      :aria-current="props.value.selected ? 'true' : undefined"
      @click="select"
    >
      <slot />

      <span
        v-if="!props.value.available"
        class="sr-only"
      >
        {{ $t('product.soldOut') }}
      </span>
    </a>
  </NuxtLink>
</template>
