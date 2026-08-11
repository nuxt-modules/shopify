<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()

const { params: localization } = useLocalization()

const { data: policies } = await useStorefrontData(localizedKey('policies'), `#graphql
  query FetchPolicies($language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    shop {
      ...ShopPoliciesFields
    }
  }
`, {
  variables: localization,
  transform: data => flattenPolicies(data?.shop),
  cache: 'long',
})

useSeoMeta({
  title: `${$t('policies.title')} | ${shopName}`,
  description: $t('policies.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: $t('policies.title') }]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ $t('policies.title') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ $t('policies.description') }}
    </p>

    <div
      v-if="policies?.length"
      class="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2 lg:grid-cols-3"
    >
      <UPageCard
        v-for="policy in policies"
        :key="policy.id"
        class="mb-4"
        :title="policy.title"
        :to="localePath(`/policies/${policy.handle}`)"
      />
    </div>

    <div
      v-else
      class="flex items-center gap-2"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="text-dimmed size-6"
      />

      <p class="text-xl text-dimmed">
        {{ $t('policies.empty') }}
      </p>
    </div>
  </UContainer>
</template>
