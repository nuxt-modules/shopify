<template>
  <div class="h-86 flex flex-col justify-center">
    <div>
      <p class="text-2xl font-bold text-center mb-12">
        Welcome, Nuxt User!
      </p>

      <UButton
        class="mb-6 py-3 font-bold w-full justify-center items-center"
        icon="i-lucide-package-2"
      >
        View Orders
      </UButton>

      <UButton
        class="mb-6 py-3 font-bold w-full justify-center items-center"
        variant="soft"
        icon="i-lucide-map-pin-house"
      >
        Edit Address
      </UButton>

      <UButton
        class="py-3 font-bold w-full justify-center items-center"
        variant="outline"
        icon="i-lucide-log-out"
      >
        Log out
      </UButton>
    </div>
  </div>
</template>
