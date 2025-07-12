<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { t } = useI18n()
</script>

<template>
    <USlideover
        v-model:open="open"
        :title="t('cart.label')"
        :ui="{
            close: 'hover:bg-muted text-muted',
            title: 'font-normal',
        }"
    >
        <template #body>
            <div class="flex flex-col h-full">
                <div class="prose pb-16 text-center mb-auto">
                    <UIcon
                        name="hugeicons:shopping-bag-01"
                        class="size-8 mb-2 mx-auto text-dimmed"
                    />

                    <h2>
                        Your Cart is empty
                    </h2>

                    <p class="text-dimmed">
                        Please add some items to your cart.
                    </p>
                </div>

                <UButton
                    class="mx-auto mb-4"
                    variant="navigation"
                    :to="getCartAppUrl()"
                    label="View your cart"
                    trailing-icon="hugeicons:arrow-right-02"
                    @click="open = false"
                />
            </div>
        </template>
    </USlideover>
</template>
