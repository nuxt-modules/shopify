export const useSlider = (slider: MaybeRef<HTMLElement | undefined>) => {
    const initialized = ref(false)

    const index = ref(0)
    const count = ref(0)

    const gap = ref(0)
    const perPage = ref(0)
    const slideWidth = ref(0)

    const skipUpdate = ref(false)
    const skipUpdateTimeout = ref<NodeJS.Timeout | null>(null)

    const isFirst = computed(() => index.value === 0)
    const isLast = computed(() => index.value === count.value - perPage.value)

    const slideToIndex = (index: number) => unref(slider)?.scrollTo({
        left: (slideWidth.value + gap.value) * index,
        behavior: 'smooth',
    })

    const setSkipUpdate = () => {
        if (skipUpdateTimeout.value) clearTimeout(skipUpdateTimeout.value)

        skipUpdate.value = true
        skipUpdateTimeout.value = setTimeout(() => skipUpdate.value = false, 200)
    }

    const next = () => {
        setSkipUpdate()

        if (index.value < count.value - perPage.value) index.value++

        slideToIndex(index.value)
    }

    const previous = () => {
        setSkipUpdate()

        if (index.value > 0) index.value--

        slideToIndex(index.value)
    }

    const updateIndex = () => {
        if (skipUpdate.value) return

        index.value = Math.round(
            (unref(slider)?.scrollLeft ?? 0) / (slideWidth.value + gap.value),
        )
    }

    const calculateGap = (element: HTMLElement) => {
        const styles = (window as Window | undefined)?.getComputedStyle(element, null)
        const extract = (v?: string) => Number.parseFloat(v?.replace('px', '') ?? '0')

        const marginLeft = extract(styles?.getPropertyValue('margin-left'))
        const marginRight = extract(styles?.getPropertyValue('margin-right'))
        const columnGap = extract(styles?.getPropertyValue('column-gap'))

        return marginLeft + marginRight + columnGap
    }

    const updateMetrics = () => {
        count.value = unref(slider)?.children.length ?? 0
        gap.value = unref(slider) ? calculateGap(unref(slider)!) : 0
        slideWidth.value = unref(slider)?.children[0]?.clientWidth ?? 0
        perPage.value = Math.ceil((unref(slider)?.clientWidth ?? 0) / (slideWidth.value + gap.value))
    }

    onMounted(() => {
        window.addEventListener('resize', updateMetrics, { passive: true })
        unref(slider)?.addEventListener('scroll', updateIndex, { passive: true })

        updateMetrics()
        updateIndex()

        initialized.value = true
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', updateMetrics)
        unref(slider)?.removeEventListener('scroll', updateIndex)
    })

    updateMetrics()
    updateIndex()

    return {
        initialized,
        index,
        count,
        perPage,
        isFirst,
        isLast,
        previous,
        next,
    }
}
