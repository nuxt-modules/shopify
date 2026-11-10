<script setup lang="ts">
import type { SelectedOption } from '@shopify/hydrogen'

const props = defineProps<{
  product: ProductFormFieldsFragment
}>()

const route = useRoute()
const form = useProductForm()

const choosable = computed(() => form.options.some(option => option.values.length > 1))

const to = (selectedOptions: SelectedOption[], handle: string) => selectionPath(
  handle === props.product.handle ? route.path : `/products/${handle}`,
  selectedOptions,
  form.options.map(option => option.name),
  toSearchParams(route.query),
)

const select = (event: MouseEvent, optionName: string, value: string) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  event.preventDefault()

  form.register('optionValue', { optionName, value }).onClick()
}
</script>

<template>
  <div
    v-if="choosable"
    class="space-y-4"
  >
    <div
      v-for="option in form.options"
      :key="option.name"
    >
      <p class="mb-2 text-sm font-semibold text-muted">
        {{ option.name }}
      </p>

      <div class="flex flex-wrap gap-2">
        <template
          v-for="value in option.values"
          :key="value.name"
        >
          <NuxtLink
            v-if="value.handle !== product.handle"
            :to="to(value.selectedOptions, value.handle)"
            class="rounded-md border border-default px-3 py-1.5 text-sm hover:bg-elevated"
          >
            {{ value.name }}
          </NuxtLink>

          <button
            v-else-if="!value.exists"
            type="button"
            class="rounded-md border border-default px-3 py-1.5 text-sm opacity-25"
            :aria-pressed="value.selected"
            disabled
          >
            {{ value.name }}
          </button>

          <NuxtLink
            v-else
            v-slot="{ href }"
            :to="to(value.selectedOptions, value.handle)"
            custom
          >
            <a
              :href="href ?? undefined"
              class="rounded-md border px-3 py-1.5 text-sm"
              :class="[
                value.selected ? 'border-inverted bg-inverted text-inverted' : 'border-default hover:bg-elevated',
                { 'line-through opacity-50': !value.available },
              ]"
              :aria-current="value.selected ? 'true' : undefined"
              @click="select($event, option.name, value.name)"
            >
              {{ value.name }}
            </a>
          </NuxtLink>
        </template>
      </div>
    </div>
  </div>
</template>
