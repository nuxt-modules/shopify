<script setup lang="ts">
import { NuxtLink } from '#components'

interface Props {
    title: string
    subtitle?: string
    ctaText?: string
    ctaLink?: string
    imageUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
    subtitle: 'Discover our hand picked collection of timeless vintage pieces',
    ctaText: 'Shop Collection',
    ctaLink: '/collection/all',
    imageUrl: '/images/hero-bg.jpg',
})
</script>

<template>
    <section>
        <div class="flex flex-col">
            <h1
                class="text-4xl md:text-5xl font-semibold mb-6 max-w-2xl leading-16"
                :class="{ 'animate-fade-in': true }"
            >
                {{ props.title }}
            </h1>
            <p
                class="text-xl md:text-2xl mb-8 opacity-90"
                :class="{ 'animate-fade-in-delay': true }"
            >
                {{ props.subtitle }}
            </p>
            <div>
                <NuxtLink
                    :to="props.ctaLink"
                    class="inline-block bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-medium
                           transition-all duration-300 hover:bg-gray-100 hover:scale-105
                           shadow-lg hover:shadow-xl"
                    :class="{ 'animate-fade-in-delay-2': true }"
                >
                    {{ props.ctaText }}
                </NuxtLink>
            </div>
        </div>
    </section>
</template>
