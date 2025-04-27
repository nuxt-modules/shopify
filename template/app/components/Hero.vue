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
    ctaText: 'Shop Collection',
    ctaLink: '/collection/all',
})
</script>

<template>
    <section>
        <div class="flex flex-col">
            <h1 class="text-4xl md:text-5xl font-semibold mb-6 max-w-2xl leading-16 animate-fade-in">
                {{ props.title }}
            </h1>

            <p class="text-xl md:text-2xl mb-8 opacity-90 animate-fade-in-delay">
                {{ props.subtitle }}
            </p>

            <div>
                <NuxtLink
                    :to="props.ctaLink"
                    class="inline-block bg-[var(--ui-bg-inverted)] brightness-90 px-8 py-4 rounded-full text-lg font-medium
                           transition-[filter,scale,box-shadow] duration-300 text-[var(--ui-text-inverted)] hover:brightness-100
                           hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in-delay-2"
                >
                    {{ props.ctaText }}
                </NuxtLink>
            </div>
        </div>
    </section>
</template>
