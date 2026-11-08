<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.params.blogHandle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const route = useRoute()

const handle = computed(() => route.params.blogHandle as string)

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

if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message,
    fatal: true,
  })
}

if (!blog.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: $t('error.blog'),
    fatal: true,
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
        { label: $t('breadcrumb.blogs'), to: localePath('/blogs') },
        { label: blog?.title, to: localePath(`/blogs/${handle}`) },
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
        :to="localePath(`/blogs/${handle}/${article.handle}`)"
      />
    </UBlogPosts>
  </UContainer>
</template>
