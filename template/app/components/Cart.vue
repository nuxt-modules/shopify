<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { lines, total, checkoutUrl } = useCart()
const route = useRoute()

watch(route, () => open.value = false)
</script>

<template>
    <USlideover
        v-model:open="open"
        :title="$t('cart.title')"
    >
        <template #body>
            <div class="h-full flex flex-col gap-4 sm:gap-6">
                <CartLineItem
                    v-for="line in lines"
                    :key="line.id"
                    :line="line"
                />

                <p
                    v-if="lines.length === 0"
                    class="my-auto text-center"
                >
                    {{ $t('cart.empty') }}
                </p>
            </div>
        </template>

        <template #footer>
            <div
                v-if="total"
                class="flex justify-between items-center w-full"
            >
                <p class="font-medium">
                    {{ $t('cart.subtotal') }}:

                    <Price :price="total" />
                </p>

                <UButton
                    variant="ghost"
                    color="neutral"
                    :to="checkoutUrl"
                    :label="$t('cart.checkout')"
                    size="xl"
                    trailing-icon="i-lucide-arrow-right"
                    :ui="{
                        trailingIcon: 'size-4',
                    }"
                    :disabled="lines.length === 0"
                />
            </div>
        </template>
    </USlideover>
</template>
