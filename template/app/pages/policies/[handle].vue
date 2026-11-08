<script setup lang="ts">
definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const { shopify: { shopName } } = useAppConfig()
const localePath = useLocalePath()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const { data: policies, error } = await usePolicies()

const policy = computed(() => policies.value?.find(p => p.handle === handle.value))

if (error.value) {
  throw createError({
    status: error.value.status,
    statusText: error.value.statusText,
    message: error.value.message,
    fatal: true,
  })
}

if (!policy.value) {
  throw createError({
    status: 404,
    statusText: `${$t('error.notFound')}: ${route.fullPath}`,
    message: $t('error.policy'),
    fatal: true,
  })
}

useSeoMeta({
  title: `${policy.value?.title} | ${shopName}`,
  description: $t('policies.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: $t('policies.title'), to: localePath('/policies') },
        { label: policy?.title, to: localePath(`/policies/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div class="prose lg:prose-lg max-w-none">
      <h1>
        {{ policy?.title }}
      </h1>

      <!-- eslint-disable-next-line -->
      <div v-html="policy?.body" />
    </div>
  </UContainer>
</template>
