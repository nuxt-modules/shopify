export default function useTheme() {
    const colorMode = useColorMode()

    const mode = computed(() => colorMode.value)

    const isDark = computed({
        get() {
            return colorMode.value === 'dark'
        },
        set(_isDark) {
            colorMode.preference = _isDark ? 'dark' : 'light'
        },
    })

    const swap = () => colorMode.preference = mode.value === 'dark' ? 'light' : 'dark'

    return {
        colorMode,
        isDark,
        swap,
    }
}
