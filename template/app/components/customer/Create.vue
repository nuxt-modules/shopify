<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email('Invalid email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Must be at least 8 characters'),
    acceptsMarketing: z.boolean().optional(),
})

const state = reactive<z.infer<typeof schema>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    acceptsMarketing: false,
})

const toast = useToast()

const onSubmit = async () => await $fetch('/api/customer/create', {
    method: 'POST',
    body: state,
}).then((data) => {
    if (data?.customerCreate?.customer) {
        toast.add({ title: 'Success', description: 'Login Successful.', color: 'success' })
    }
    else {
        toast.add({ title: 'Error', description: 'Something went wrong.', color: 'error' })
    }
}).catch((error) => {
    toast.add({ title: 'Error', description: `Something went wrong. ${error}`, color: 'error' })
})
</script>

<template>
    <div>
        <h2 class="text-2xl mb-4">
            Register
        </h2>

        <p class="mb-6 text-[var(--ui-text-muted)]">
            Create a new account to access exclusive features and benefits.
        </p>

        <UForm
            :schema="schema"
            :state="state"
            class="space-y-4 max-w-xl"
            @submit="onSubmit"
        >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <UFormField
                    label="First Name"
                    name="firstName"
                >
                    <UInput
                        v-model="state.firstName"
                        autocomplete="given-name"
                        class="w-full"
                    />
                </UFormField>

                <UFormField
                    label="Last Name"
                    name="lastName"
                >
                    <UInput
                        v-model="state.lastName"
                        autocomplete="family-name"
                        class="w-full"
                    />
                </UFormField>
            </div>

            <UFormField
                label="Email"
                name="email"
                required
            >
                <UInput
                    v-model="state.email"
                    autocomplete="email"
                    class="w-full"
                />
            </UFormField>

            <UFormField
                label="Phone"
                name="phone"
            >
                <UInput
                    v-model="state.phone"
                    autocomplete="tel"
                    class="w-full"
                />
            </UFormField>

            <UFormField
                label="Password"
                name="password"
                required
            >
                <UInput
                    v-model="state.password"
                    autocomplete="new-password"
                    type="password"
                    class="w-full"
                />
            </UFormField>

            <UFormField name="acceptsMarketing">
                <UCheckbox
                    v-model="state.acceptsMarketing"
                    label="I want to receive marketing updates"
                    class="w-full"
                />
            </UFormField>

            <div class="flex justify-end">
                <UButton type="submit">
                    Register now
                </UButton>
            </div>
        </UForm>
    </div>
</template>
