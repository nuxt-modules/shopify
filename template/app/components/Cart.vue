<script setup lang="ts">
const { open, loading, lines, total, checkoutUrl } = useCart()
const route = useRoute()
const { t } = useI18n()

watch(() => route.path, () => open.value = false)
</script>

<template>
    <USlideover
        v-model:open="open"
        :title="t('cart.title')"
        :description="t('cart.description')"
        :ui="{ description: 'sr-only', body: 'flex flex-col gap-y-6' }"
    >
        <UButton
            icon="i-lucide-shopping-cart"
            variant="ghost"
            color="neutral"
        />

        <template #body>
            <TransitionGroup
                enter-to-class="opacity-100"
                leave-to-class="opacity-0"
                leave-from-class="opacity-100"
                enter-from-class="opacity-0"
            >
                <CartLineItem
                    v-for="line in lines"
                    :key="line.id"
                    :line="line"
                    class="shrink-0 duration-300"
                />
            </TransitionGroup>

            <p
                v-if="lines.length === 0"
                class="my-auto text-center"
            >
                {{ t('cart.empty') }}
            </p>
        </template>

        <template #footer>
            <div
                v-if="total"
                class="flex justify-between items-center w-full"
                :class="{
                    'animate-pulse': loading,
                }"
            >
                <div class="flex items-center gap-2">
                    <p class="font-medium inline-block">
                        {{ t('cart.subtotal') }}:
                        <Price :price="total" />
                    </p>

                    <Icon
                        v-if="loading"
                        name="i-lucide-loader-circle"
                        class="animate-spin"
                    />
                </div>

                <UButton
                    variant="ghost"
                    color="neutral"
                    :to="checkoutUrl"
                    :label="t('cart.checkout')"
                    size="xl"
                    trailing-icon="i-lucide-arrow-right"
                    :ui="{
                        trailingIcon: 'size-4',
                    }"
                    :disabled="loading || lines.length === 0"
                />
            </div>
        </template>
    </USlideover>
</template>
