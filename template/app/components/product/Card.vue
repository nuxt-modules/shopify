<script setup lang="ts">
import type { ProductFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    product: ProductFieldsFragment
    carousel?: boolean
}>()

const localePath = useLocalePath()

const url = computed(() => localePath(`/product/${props.product.handle}`))
const images = computed(() => flattenConnection(props.product.images))
const variants = computed(() => flattenConnection(props.product.variants))

const variant = ref(variants.value[0])
</script>

<template>
    <UCard
        class="flex flex-col max-w-full h-full"
        variant="soft"
        :ui="{
            body: 'h-full !p-0',
            root: 'rounded-none !bg-transparent',
        }"
    >
        <div class="group relative rounded-md overflow-hidden mb-4">
            <UCarousel
                v-if="carousel && images.length > 1"
                v-slot="{ item }"
                :items="images"
                :ui="{
                    prev: 'left-3! transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100',
                    next: 'right-3! transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100',
                }"
                arrows
                loop
            >
                <NuxtLink :to="url">
                    <ProductImage :image="item" />
                </NuxtLink>
            </UCarousel>

            <NuxtLink
                v-else
                :to="url"
            >
                <ProductImage :image="images?.[0] ?? undefined" />

                <ProductImage
                    v-if="images?.[1]"
                    :image="images[1]"
                    class="hidden absolute inset-0 bg-default group-hover:block"
                />
            </NuxtLink>
        </div>

        <div class="flex justify-end flex-wrap items-center relative">
            <NuxtLink
                :to="url"
                class="grow"
            >
                <p class="font-headings text-xl me-12">
                    {{ props.product.title }}
                </p>

                <Price
                    v-if="variant"
                    :price="variant.price"
                    class="grow text-right"
                />
            </NuxtLink>

            <ProductChoose
                v-if="variants.length > 1"
                :product="props.product"
            />

            <ProductAdd
                v-else
                :product="props.product"
            />
        </div>
    </UCard>
</template>
