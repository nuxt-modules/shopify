<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'detail',
})

const { addItems } = await useCart()
const route = useRoute()
const handle = route.params.handle as string

const { data } = await useFetch('/api/product', {
    method: 'POST',
    body: {
        handle,
    },
})

const product = computed(() => data.value?.product)

const price = computed(() => {
    const formatter = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
    })

    // @ts-expect-error TODO: Fix type error
    return formatter.format(product.value?.priceRange.minVariantPrice.amount)
})
</script>

<template>
    <Section class="grid md:grid-cols-2 gap-16 pb-24">
        <ProductImage
            :product="product ?? undefined"
            class="flex flex-col gap-4"
        />

        <div class="flex flex-col gap-4">
            <h2 class="text-2xl font-bold">
                {{ product?.title }}
            </h2>

            <p>{{ product?.description }}</p>

            <USeparator />

            <div class="w-full text-end mb-8">
                <span class="text-lg font-bold">
                    {{ price }}
                </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <UButton
                    size="xl"
                    color="primary"
                    class="flex items-center justify-center p-4"
                    @click="addItems({
                        quantity: 1,
                    })"
                >
                    Buy now
                </UButton>

                <UButton
                    size="xl"
                    color="primary"
                    class="flex items-center justify-center p-4"
                    @click="addItems({
                        quantity: 1,
                    })"
                >
                    Add to cart
                </UButton>
            </div>
        </div>
    </Section>
</template>
