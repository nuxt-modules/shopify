<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const switchLocalePath = useSwitchLocalePath()
const { locales } = useI18n()

const nav = ref<HTMLElement>()

const items = computed(() => locales.value.map(locale => ({
    label: locale.name,
    to: switchLocalePath(locale.code),
})))

onClickOutside(nav, () => open.value = false, { ignore: ['.language-button'] })
</script>

<template>
    <UCollapsible
        :open="open"
        class="absolute top-full w-full"
    >
        <template #content>
            <div class="border-y border-[var(--ui-border)] bg-[var(--ui-bg)] py-4">
                <UContainer>
                    <UNavigationMenu
                        ref="nav"
                        highlight
                        highlight-color="primary"
                        orientation="vertical"
                        :items="items"
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
