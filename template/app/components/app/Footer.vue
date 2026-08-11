<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const { data: policies } = await useMenu('footer')

const items = computed<NavigationMenuItem[]>(() => [
  {
    to: 'https://github.com/nuxt-modules/shopify',
    label: 'Github',
  },
  {
    to: 'https://nuxt.com/modules/shopify',
    label: 'Module Page',
  },
  {
    to: 'https://shopify.nuxtjs.org',
    label: 'Documentation',
  },
  {
    to: 'https://npmx.dev/package/@nuxtjs/shopify',
    label: 'NPM Package',
  },
].map(item => ({
  ...item,
  target: '_blank',
  icon: 'i-lucide-minus',
})))
</script>

<template>
  <UFooter
    :ui="{
      root: 'border-t border-neutral-200',
      top: 'pb-0 lg:pb-0',
      bottom: 'border-t border-neutral-200',
      container: 'pb-6 lg:pb-10',
    }"
  >
    <template #top>
      <UContainer class="flex flex-col sm:flex-row sm:items-end">
        <AppVersion />

        <span class="hidden mx-4 mb-2 h-6 w-px bg-neutral-200 sm:block sm:mb-4 sm:mx-6" />

        <UNavigationMenu
          :items="items"
          :ui="{
            root: 'sm:-mb-1 md:mb-1',
            list: 'flex items-start flex-col sm:flex-row',
            item: 'py-1 sm:py-2',
            linkLeadingIcon: 'sm:hidden',
            linkLabelExternalIcon: 'hidden',
          }"
        />
      </UContainer>
    </template>

    <template #left>
      <p class="mt-3 lg:mt-0 text-muted text-sm">
        {{ $t('footer.message') }}
      </p>
    </template>

    <template #right>
      <UNavigationMenu
        orientation="horizontal"
        :items="[
          {
            icon: 'i-lucide-github',
            to: 'https://github.com/nuxt-modules/shopify/tree/main/template',
            label: $t('footer.github'),
            target: '_blank',
          },
        ]"
        :ui="{
          linkLabelExternalIcon: 'hidden',
        }"
      />

      <AppLocaleSelect>
        <UButton
          variant="link"
          color="neutral"
          icon="i-lucide-languages"
          :label="$t('localization.title')"
        />
      </AppLocaleSelect>
    </template>

    <template #bottom>
      <div class="flex justify-center">
        <UNavigationMenu
          v-if="policies?.length"
          variant="pill"
          :items="policies"
          :ui="{
            list: 'flex-wrap justify-center lg:justify-end',
            link: 'text-dimmed text-xs',
          }"
        />
      </div>
    </template>
  </UFooter>
</template>
