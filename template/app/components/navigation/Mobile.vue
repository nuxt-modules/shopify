<script setup lang="ts">
const props = defineProps<{
    collections: { label: string, to: string }[]
}>()

const open = defineModel<boolean>({ default: false })

const nav = ref<HTMLElement>()

onClickOutside(nav, () => open.value = false, { ignore: ['.menu-button'] })
</script>

<template>
    <UCollapsible
        :open="open"
        class="absolute top-full w-full lg:hidden"
    >
        <template #content>
            <div class="border-y border-[var(--ui-border)] bg-[var(--ui-bg)] py-4">
                <UContainer>
                    <UNavigationMenu
                        ref="nav"
                        highlight
                        highlight-color="primary"
                        orientation="vertical"
                        :items="props.collections.map(collection => ({
                            ...collection,
                            onSelect: () => open = false,
                        }))"
                    />
                </UContainer>
            </div>

            <Transition
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="open"
                    class="-z-10 fixed inset-0 top-12 backdrop-blur-xs transition-opacity duration-100"
                    @click="open = false"
                />
            </Transition>
        </template>
    </UCollapsible>
</template>
