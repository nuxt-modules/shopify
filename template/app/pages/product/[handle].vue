<script setup lang="ts">
definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'detail',
})

const { country } = useCountry()
const { locale } = useI18n()
const route = useRoute()

const handle = computed(() => route.params.handle as string)

const state = reactive({
    quantity: 1,
})

const { data } = await useFetch('/api/product', {
    method: 'POST',
    body: {
        handle,
        country,
        language: locale,
    },
    watch: [locale, country],
})

const product = computed(() => data.value?.product)
</script>

<template>
    <div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-10 sm:justify-between lg:hidden">
            <h1 class="text-xl lg:text-2xl">
                {{ product?.title }}
            </h1>

            <ProductPrice
                :product="product"
                class="shrink mt-2 text-lg text-primary sm:mt-0"
            />
        </div>

        <div class="lg:grid lg:grid-cols-12 lg:pt-8">
            <ProductImage
                :product="product ?? undefined"
                class="my-6 lg:mt-0 lg:col-span-6"
            />

            <div class="flex flex-col gap-4 lg:col-span-4 lg:col-start-8">
                <div class="flex-col gap-2 hidden lg:flex lg:pb-4">
                    <h2 class="text-2xl">
                        {{ product?.title }}
                    </h2>

                    <ProductPrice
                        :product="product"
                        class="shrink"
                    />
                </div>

                <p v-html="product?.descriptionHtml" />

                <USeparator class="my-4 lg:my-8" />

                <div class="flex flex-col items-end gap-6">
                    <UFormField name="quantity">
                        <UInputNumber
                            v-model="state.quantity"
                            :min="1"
                            :max="10"
                            class="w-24 lg:w-28"
                            :ui="{
                                base: 'py-3 rounded-full',
                            }"
                        />
                    </UFormField>

                    <ProductAddToCart
                        v-if="product"
                        :product="product"
                        :quantity="state.quantity"
                        class="flex-1 p-3"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
