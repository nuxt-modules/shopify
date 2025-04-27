export default function useTheme() {
    const colorMode = useColorMode()

    const mode = computed(() => colorMode.value)

    const currentIcon = computed(() => mode.value === 'dark' ? 'hugeicons:sun-02' : 'hugeicons:moon-02')

    const swap = () => colorMode.preference = mode.value === 'dark' ? 'light' : 'dark'

    return {
        colorMode,
        currentIcon,
        swap,
    }
}
