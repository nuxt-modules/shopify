<script setup lang="ts">
import shopPaySvg from '~/assets/shop-pay.svg?raw'

const route = useRoute()
const open = ref(false)
const { loggedIn, user, clear } = useUserSession()

watch(() => route.path, () => open.value = false)
</script>

<template>
    <UPopover
        v-model:open="open"
        :title="$t('account.label')"
        :description="$t('account.description')"
    >
        <UButton
            icon="i-lucide-user"
            variant="ghost"
            color="neutral"
            :label="$t('account.label')"
            :ui="{
                label: 'sr-only',
                base: 'px-1.5 lg:px-2',
            }"
        />

        <template #content>
            <div class="p-4">
                <template v-if="loggedIn">
                    <p class="text-2xl mb-4">
                        {{ user?.firstName }} {{ user?.lastName }}
                    </p>
                    <p class="text-sm text-gray-500 mb-4">
                        {{ user?.email }}
                    </p>
                    <UButton
                        color="neutral"
                        variant="outline"
                        class="w-full justify-center"
                        @click="clear"
                    >
                        Sign out
                    </UButton>
                </template>
                <template v-else>
                    <p class="text-2xl mb-4">
                        Sign in or create account
                    </p>

                    <UButton
                        to="_auth/customer-account/callback"
                        external
                        class="py-3 font-bold w-full justify-center items-center"
                    >
                        <span>Sign in with</span>

                        <span
                            class="inline-block w-9"
                            v-html="shopPaySvg"
                        />
                    </UButton>
                </template>
            </div>
        </template>
    </UPopover>
</template>
