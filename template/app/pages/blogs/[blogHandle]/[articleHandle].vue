<script setup lang="ts">
definePageMeta({
  validate: route =>
    typeof route.params.blogHandle === 'string'
    && typeof route.params.articleHandle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const route = useRoute()

const handle = computed(() => route.params.blogHandle as string)
const article = computed(() => route.params.articleHandle as string)

const { params: localization } = useLocalization()

const { data: blog, error } = await useStorefrontData(localizedKey('article', handle, article), `#graphql
  query FetchBlogArticle($handle: String!, $article: String!, $language: LanguageCode, $country: CountryCode)
  @inContext(language: $language, country: $country) {
    blog(handle: $handle) {
      title
      articleByHandle(handle: $article) {
        ...ArticleFields
      }
    }
  }
`, {
  variables: computed(() => ({
    handle: handle.value,
    article: article.value,
    ...localization.value,
  })),
  transform: data => data?.blog,
  cache: 'long',
})

const articleData = computed(() => blog.value?.articleByHandle)

if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message,
    fatal: true,
  })
}

if (!articleData.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: $t('error.article'),
    fatal: true,
  })
}

useSeoMeta({
  title: `${articleData.value?.seo?.title ?? articleData.value?.title} | ${shopName}`,
  description: articleData.value?.seo?.description ?? $t('seo.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('breadcrumb.blogs'), to: localePath('/blogs') },
        { label: blog?.title, to: localePath(`/blogs/${handle}`) },
        { label: articleData?.title, to: localePath(`/blogs/${handle}/${article}`) },
      ]"
      class="mb-8"
    />

    <div
      class="prose lg:prose-lg max-w-none"
    >
      <h1>
        {{ articleData?.title }}
      </h1>

      <!-- eslint-disable-next-line -->
      <div v-html="articleData?.contentHtml" />
    </div>
  </UContainer>
</template>
