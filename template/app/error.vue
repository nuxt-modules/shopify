<script setup lang="ts">
import type { NuxtError } from '#app'

import * as locales from '@nuxt/ui/locale'

import { CartProvider } from '~/utils/cart'

const props = defineProps<{
  error: NuxtError
}>()

const { shopify: { shopName } } = useAppConfig()
const { localeProperties } = useI18n()
const { language } = useLocalization()
const localePath = useLocalePath()

const uiLocale = computed(() => Object.values(locales).find(locale => locale.code === language.value) ?? locales.en)

useHead({
  htmlAttrs: {
    lang: () => localeProperties.value.language,
    dir: () => uiLocale.value.dir,
  },
  title: shopName,
})
</script>

<template>
  <UApp :locale="uiLocale">
    <CartProvider>
      <Suspense>
        <NuxtLayout>
          <UError
            :error="props.error"
            :clear="false"
          >
            <template #links>
              <UButton
                @click="clearError({
                  redirect: localePath('/'),
                })"
              >
                {{ $t('error.home') }}
              </UButton>
            </template>
          </UError>
        </NuxtLayout>
      </Suspense>
    </CartProvider>
  </UApp>
</template>
