<script setup lang="ts">
const { loggedIn, clear } = useUserSession()
const toast = useToast()

const logout = () => {
    clear()

    toast.add({ title: 'Success', description: 'Logout Successful.', color: 'success' })
}
</script>

<template>
    <div class="pt-6 pb-24">
        <h1 class="text-3xl font-bold mb-6">
            Customer Account
        </h1>

        <div class="text-lg text-[var(--ui-text-muted)] mb-8">
            <p v-if="loggedIn">
                Welcome back!
            </p>

            <p v-else>
                Account login and registration.
            </p>
        </div>

        <template v-if="loggedIn">
            <p>
                Welcome back!
            </p>

            <UButton
                @click="logout"
            >
                Logout
            </UButton>
        </template>

        <template v-else>
            <CustomerLogin class="mt-4" />

            <CustomerCreate class="mt-10" />
        </template>
    </div>
</template>
