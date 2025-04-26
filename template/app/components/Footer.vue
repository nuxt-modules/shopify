<script setup lang="ts">
const currentYear = computed(() => new Date().getFullYear())
</script>

<template>
    <footer class="py-16 bg-gradient-to-br from-gray-800 to-gray-900 text-white">
        <UContainer class="flex flex-row gap-4">
            <div>
                <span class="font-bold">Categories</span>
                <ul>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                </ul>
            </div>

            <div>
                <span class="font-bold">Policies</span>
                <ul>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                </ul>
            </div>

            <div>
                <span class="font-bold">Policies</span>
                <ul>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                    <li>
                        <a href="https://instagram.com">
                            Instagram
                        </a>
                    </li>
                </ul>
            </div>

            <div class="flex gap-6">
                <UButton
                    href="https://instagram.com"
                    target="_blank"
                    class="hover:text-pink-500 transition-colors"
                    icon="hugeicons:instagram"
                    variant="link"
                >
                    Instagram
                </UButton>
            </div>

            <div class="mt-8 text-sm">
                <p>&copy; {{ currentYear }} Zoltan Lukacs, Frederik Bußmann. All rights reserved.</p>
            </div>
        </UContainer>
    </footer>
</template>
