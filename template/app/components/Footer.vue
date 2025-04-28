<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
    <footer class="py-8 bg-[var(--bg-ui)] border-t border-[var(--ui-border)]">
        <UContainer class="flex flex-col">
            <div class="text-center">
                <p class="mb-4">
                    {{ t('footer.message') }}
                </p>

                <NuxtLink
                    to="https://github.com/konkonam/nuxt-shopify/tree/main/template"
                    rel="noopener noreferrer"
                    target="_blank"
                    class="flex items-center gap-1.5 justify-center text-sm"
                >
                    <UIcon
                        class="size-3.5"
                        :name="icons.github"
                    />

                    {{ t('footer.github') }}
                </NuxtLink>
            </div>
        </UContainer>
    </footer>
</template>
