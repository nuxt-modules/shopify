<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { lines, total, update, remove } = useCart()
</script>

<template>
    <USlideover
        v-model:open="open"
        title="Cart"
    >
        <template #body>
            <div class="h-full flex flex-col">
                <div
                    v-for="line in lines"
                    :key="line.id"
                >
                    {{ line.id }}

                    Quantity: {{ line.quantity }}

                    <UButton @click="update(line.id, line.quantity - 1)">
                        Reduce
                    </UButton>

                    <UButton @click="remove(line.id)">
                        Remove
                    </UButton>
                </div>

                <span
                    v-if="lines.length === 0"
                    class="my-auto text-center"
                >
                    Your cart is Empty
                </span>
            </div>
        </template>

        <template #footer>
            <div
                v-if="total"
                class="flex justify-between w-full"
            >
                <span class="font-medium">
                    Total:
                </span>

                <Price :price="total" />
            </div>
        </template>
    </USlideover>
</template>
