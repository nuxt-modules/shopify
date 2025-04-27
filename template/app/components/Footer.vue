<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
    <footer class="py-8 bg-[var(--bg-ui)] border-t border-[var(--ui-border)]">
        <UContainer class="flex flex-col">
            <div class="text-sm text-center">
                <p>{{ t('footer.message') }}</p>
                <br>
                <p>{{ t('footer.copyright') }}</p>
            </div>
        </UContainer>
    </footer>
</template>
