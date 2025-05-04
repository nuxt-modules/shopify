<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Must be at least 8 characters'),
})

const state = reactive({
    email: '',
    password: '',
})

const toast = useToast()

const onSubmit = async () => await $fetch('/api/customer/login', {
    method: 'POST',
    body: state,
}).then((data) => {
    if (data?.customerAccessTokenCreate?.customerAccessToken) {
        toast.add({ title: 'Success', description: 'Login Successful.', color: 'success' })
    }
    else {
        console.error('Error:', data)
        toast.add({ title: 'Error', description: 'Invalid credentials. Please try again.', color: 'error' })
    }
}).catch((error) => {
    toast.add({ title: 'Error', description: `Something went wrong. ${error}`, color: 'error' })
})
</script>

<template>
    <div>
        <h2 class="text-2xl mb-4">
            Login
        </h2>

        <p class="mb-6 text-[var(--ui-text-muted)]">
            Login now to access your account and enjoy exclusive features.
        </p>

        <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
        >
            <UFormField
                label="Email"
                name="email"
                required
            >
                <UInput
                    v-model="state.email"
                    autocomplete="email"
                />
            </UFormField>

            <UFormField
                label="Password"
                name="password"
                required
            >
                <UInput
                    v-model="state.password"
                    type="password"
                    autocomplete="current-password"
                />
            </UFormField>

            <UButton
                type="submit"
            >
                Submit
            </UButton>
        </UForm>
    </div>
</template>
