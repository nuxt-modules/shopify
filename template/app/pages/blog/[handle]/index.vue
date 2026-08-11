<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const { params: localization } = useLocalization()

const { data: blog, error } = await useStorefrontData(localizedKey('blog', handle), `#graphql
  query FetchBlog($handle: String, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    blog(handle: $handle) {
      ...BlogFields
    }
  }
`, {
  variables: computed(() => ({
    handle: handle.value,
    ...localization.value,
  })),
  transform: data => data?.blog,
  cache: 'long',
})

if (!blog.value || error.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: error.value?.message || $t('error.blog'),
  })
}

useSeoMeta({
  title: `${blog.value?.seo?.title ?? blog.value?.title} | ${shopName}`,
  description: blog.value?.seo?.description ?? $t('seo.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: 'Blog' },
        { label: blog?.title, to: localePath(`/blog/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ blog?.title }}
    </h1>

    <UBlogPosts>
      <UBlogPost
        v-for="article in flattenConnection(blog?.articles)"
        :key="article.id"
        :title="article.title"
        :date="article.publishedAt"
        :description="article.excerpt ?? undefined"
        :to="localePath(`/blog/${handle}/${article.handle}`)"
      />
    </UBlogPosts>
  </UContainer>
</template>
