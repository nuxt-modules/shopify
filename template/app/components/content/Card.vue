<script setup lang="ts">
const props = defineProps<{
    image?: string
    width?: number
    height?: number
    alt?: string
    invert?: boolean
}>()
</script>

<template>
    <div
        class="relative my-12 flex items-center justify-center gap-4"
        :class="{
            'flex-row-reverse': props.invert,
        }"
    >
        <NuxtImg
            v-if="props.image"
            :class="[
                'block',
                'w-1/2',
                'h-full',
                'shrink-0',
                'object-contain',
                'drop-shadow-2xl',
                'drop-shadow-green-900/50',
                'max-h-[200px]',
            ]"
            :src="props.image"
            alt="Hero Image"
        />

        <div class="flex flex-col justify-center">
            <div>
                <slot />
            </div>
        </div>
    </div>
</template>
