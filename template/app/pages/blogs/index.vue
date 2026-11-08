<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()

const { params: localization } = useLocalization()

const { data: blogs, error } = await useStorefrontData(localizedKey('blogs'), `#graphql
  query FetchBlogs($first: Int, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    blogs(first: $first) {
      nodes {
        id
        handle
        title
        seo {
          description
        }
      }
    }
  }
`, {
  variables: computed(() => connectionParamsSchema.extend(localizationParamsSchema.shape).parse({
    first: 50,
    ...localization.value,
  })),
  transform: data => data?.blogs.nodes,
  cache: 'long',
})

if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message,
    fatal: true,
  })
}

useSeoMeta({
  title: `${$t('blogs.title')} | ${shopName}`,
  description: $t('blogs.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: $t('breadcrumb.blogs') }]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ $t('blogs.title') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ $t('blogs.description') }}
    </p>

    <div
      v-if="blogs?.length"
      class="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2 lg:grid-cols-3"
    >
      <UPageCard
        v-for="blog in blogs"
        :key="blog.id"
        class="mb-4"
        :title="blog.title"
        :description="blog.seo?.description ?? undefined"
        :to="localePath(`/blogs/${blog.handle}`)"
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
        {{ $t('blogs.empty') }}
      </p>
    </div>
  </UContainer>
</template>
