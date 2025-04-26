export default function useTheme() {
    const colorMode = useColorMode()

    const swap = () => {
        colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    }

    const currentIcon = computed(() => {
        return colorMode.value === 'dark' ? 'hugeicons:sun-02' : 'hugeicons:moon-02'
    })

    return {
        colorMode,
        swap,
        currentIcon,
    }
}
