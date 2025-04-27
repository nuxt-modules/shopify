export default function useTheme() {
    const colorMode = useColorMode()

    const currentIcon = computed(() => colorMode.value === 'dark' ? 'hugeicons:sun-02' : 'hugeicons:moon-02')

    const swap = () => colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'

    return {
        colorMode,
        currentIcon,
        swap,
    }
}
