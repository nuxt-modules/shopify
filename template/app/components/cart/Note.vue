<script setup lang="ts">
const note = useCart(state => state.data.note ?? '')
const pending = useCart(state => state.pending.note)
const errors = useCart(state => state.errors.note.userErrors)

const { formProps, register } = useCartForm()

const draft = ref(note.value)

watch([note, pending], () => {
  if (!pending.value) draft.value = note.value
})

const skipUnchanged = (event: SubmitEvent) => {
  if (draft.value === note.value) event.preventDefault()
}
</script>

<template>
  <form
    v-bind="formProps({ beforeSubmit: skipUnchanged })"
    class="flex flex-col gap-3 w-full"
  >
    <UFormField
      :label="$t('cart.note.label')"
      :error="errors[0]?.message"
    >
      <UTextarea
        v-model="draft"
        v-bind="register('note', { defaultValue: note })"
        :placeholder="$t('cart.note.placeholder')"
        :rows="3"
        autoresize
        class="w-full"
      />
    </UFormField>

    <UButton
      type="submit"
      v-bind="register('note-update')"
      variant="soft"
      class="self-start"
      :loading="pending"
      :label="$t('cart.note.save')"
    />
  </form>
</template>
