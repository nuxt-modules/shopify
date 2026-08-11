<script setup lang="ts">
import type { Locale } from '#i18n'

const { countries, languages, select } = await useLocaleSelect()

const open = ref(false)

const change = async (locale: Locale) => {
  open.value = false

  await select(locale)
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="$t('localization.title')"
    :description="$t('localization.description')"
    should-scale-background
    :ui="{
      header: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8',
      container: 'lg:pb-20 lg:pt-12',
    }"
  >
    <slot />

    <template #body>
      <UContainer>
        <div class="flex flex-col gap-6 pb-4 w-full">
          <div>
            <h3 class="text-sm font-semibold text-highlighted mb-2">
              {{ $t('localization.country') }}
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <UButton
                v-for="item in countries"
                :key="item.code"
                :variant="item.active ? 'soft' : 'outline'"
                :color="item.active ? 'primary' : 'neutral'"
                class="justify-between"
                @click="change(item.locale)"
              >
                <span>{{ item.flag }} {{ item.label }}</span>

                <span class="text-dimmed text-xs">{{ item.currency }}</span>
              </UButton>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-highlighted mb-2">
              {{ $t('localization.language') }}
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <UButton
                v-for="item in languages"
                :key="item.code"
                :variant="item.active ? 'soft' : 'outline'"
                :color="item.active ? 'primary' : 'neutral'"
                :label="item.label"
                @click="change(item.locale)"
              />
            </div>
          </div>
        </div>
      </UContainer>
    </template>
  </UDrawer>
</template>
