<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const { params: localization } = useLocalization()

const { data: page, error } = await useStorefrontData(localizedKey('page', handle), `#graphql
  query FetchPage($handle: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      ...PageFields
    }
  }
`, {
  variables: computed(() => pageInputSchema.parse({
    handle: handle.value,
    ...localization.value,
  })),
  transform: data => data?.page,
  cache: 'long',
})

if (!page.value || error.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: error.value?.message || $t('error.page'),
    fatal: true,
  })
}

useSeoMeta({
  title: `${page.value?.seo?.title ?? page.value?.title} | ${shopName}`,
  description: page.value?.seo?.description ?? page.value?.bodySummary ?? $t('seo.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: page?.title, to: localePath(`/pages/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div class="prose lg:prose-lg max-w-none">
      <h1>
        {{ page?.title }}
      </h1>

      <!-- eslint-disable-next-line -->
      <div v-html="page?.body" />
    </div>
  </UContainer>
</template>
