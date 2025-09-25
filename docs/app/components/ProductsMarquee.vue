<script setup lang="ts">
import { joinURL } from 'ufo'

type Product = {
    title: string
    image: string
}

const { data: products } = await useAsyncStorefront('products', `#graphql
    query GetProducts($first: Int!) {
        products(first: $first) {
            edges {
                node {
                    title
                    images(first: 10) {
                        nodes {
                            url
                            altText
                        }
                    }
                }
            }
        }
    }
`, {
    variables: {
        first: 100,
    },
    transform: data => flattenConnection(data.products)
        .flatMap(product => product.images.nodes)
        .map(image => ({
            title: image.altText ?? '',
            image: joinURL('/shopify', new URL(image.url).pathname),
        })),
})

const shuffleArray = (array: Product[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!]
    }
    return shuffled
}

const marqueeProductsData = useState<Product[][]>('marqueeProducts', () => [])

const getRandomDelay = (rowIndex: number, index: number) => {
    const baseDelay = (rowIndex * 0.3) + (index * 0.05)
    const randomOffset = ((rowIndex * 13) + index) % 10 * 0.1
    return baseDelay + randomOffset
}

const initMarqueeProducts = () => {
    if (marqueeProductsData.value.length) return

    const limitedProducts = shuffleArray(products.value).slice(0, 50)

    const row1 = shuffleArray(limitedProducts)
    const row2 = shuffleArray(limitedProducts)
    const row3 = shuffleArray(limitedProducts)

    marqueeProductsData.value = [row1, row2, row3]
}

watch(products, (newVal) => {
    if (newVal?.length && !marqueeProductsData.value.length) {
        initMarqueeProducts()
    }
}, { immediate: true })
</script>

<template>
    <div class="pt-24">
        <div class="absolute isolate inset-0 top-16 overflow-hidden">
            <div class="relative flex flex-col justify-between pt-4">
                <UMarquee
                    v-for="(row, rowIndex) in marqueeProductsData"
                    :key="rowIndex"
                    :reverse="rowIndex % 2 === 1"
                    :overlay="false"
                    :ui="{
                        root: `[--gap:--spacing(4)] [--duration:400s]`,
                    }"
                    class="mb-(--gap)"
                >
                    <Motion
                        v-for="(product, index) in row"
                        :key="`${rowIndex}-${index}`"
                        :initial="{
                            scale: 0.5,
                            opacity: 0,
                            filter: 'blur(10px)',
                        }"
                        :animate="{
                            scale: 1,
                            opacity: 1,
                            filter: 'blur(0px)',
                        }"
                        :transition="{
                            delay: getRandomDelay(rowIndex, index),
                        }"
                        class="flex items-center justify-center size-20 rounded-lg bg-muted border border-default dark:shadow-lg"
                    >
                        <NuxtImg
                            :src="product.image"
                            :alt="product.title"
                            class="rounded-lg w-full"
                            loading="lazy"
                            width="80"
                            height="80"
                        />
                    </Motion>
                </UMarquee>

                <div class="absolute top-0 left-0 right-0 size-full z-10 bg-linear-to-t from-default to-default/20" />
            </div>

            <div class="absolute left-0 top-0 bottom-0 w-1/2 z-10 bg-linear-to-bl from-default/20 to-default to-40%" />
            <div class="absolute right-0 top-0 bottom-0 w-1/2 z-10 bg-linear-to-br from-default/20 to-default to-40%" />
            <div class="absolute top-0 left-0 right-0 size-full z-10 bg-linear-to-t from-default to-default/40 light:hidden" />
        </div>
    </div>
</template>
