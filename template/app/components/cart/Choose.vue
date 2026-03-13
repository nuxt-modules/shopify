<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: ProductFieldsFragment
}>()

const selectedVariant = ref(props.product?.selectedOrFirstAvailableVariant)

const open = ref(false)
</script>

<template>
    <UModal
        v-model:open="open"
        title="Choose Options"
        description="Select the options you want to add to your cart."
        :ui="{
            content: 'max-w-4xl!',
        }"
    >
        <UButton
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-shopping-bag"
            :label="$t('product.choose')"
            :ui="{
                trailingIcon: 'size-5',
                label: [
                    'ms-auto',
                    'max-w-0',
                    'invisible',
                    'group-focus:visible',
                    'group-focus:max-w-full',
                    'group-hover:visible',
                    'group-hover:max-w-full',
                    'transition-all',
                    'duration-300',
                    'truncate-0',
                    'ps-1.5',
                    'pe-1',
                ],
                base: 'absolute bottom-0 group rounded-full p-2.5',
            }"
        />

        <template #body>
            <div
                v-if="props.product && selectedVariant"
                class="lg:grid lg:grid-cols-12"
            >
                <ProductGallery
                    :selected-variant="selectedVariant"
                    :product="props.product"
                    class="lg:col-span-6"
                />

                <ProductConfigurator
                    v-model="selectedVariant"
                    :product="props.product"
                    class="lg:col-start-8 lg:col-span-5"
                    @submit="open = false"
                />
            </div>
        </template>
    </UModal>
</template>
