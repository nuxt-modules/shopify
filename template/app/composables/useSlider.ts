export const useSlider = (slider: MaybeRef<HTMLElement | undefined>) => {
    const index = ref(0)
    const count = ref(0)

    const perPage = ref(0)
    const slideWidth = ref(0)

    const skipUpdate = ref(false)
    const skipUpdateTimeout = ref<NodeJS.Timeout | null>(null)

    const isFirst = computed(() => index.value === 0)
    const isLast = computed(() => index.value === count.value - (perPage.value - 1) - 1)

    const slideToIndex = (index: number) => unref(slider)?.scrollTo({
        left: slideWidth.value * index,
        behavior: 'smooth',
    })

    const setSkipUpdate = () => {
        if (skipUpdateTimeout.value) clearTimeout(skipUpdateTimeout.value)

        skipUpdate.value = true

        skipUpdateTimeout.value = setTimeout(() => skipUpdate.value = false, 200)
    }

    const next = () => {
        setSkipUpdate()

        index.value++

        slideToIndex(index.value)
    }

    const previous = () => {
        setSkipUpdate()

        index.value--

        slideToIndex(index.value)
    }

    const updateIndex = () => {
        if (skipUpdate.value) return

        index.value = Math.round(
            (unref(slider)?.scrollLeft ?? 0) / slideWidth.value,
        )
    }

    const updateMetrics = () => {
        count.value = unref(slider)?.children.length ?? 0
        slideWidth.value = unref(slider)?.children[0]?.clientWidth ?? 1
        perPage.value = Math.ceil((unref(slider)?.clientWidth ?? 0) / slideWidth.value)
    }

    onMounted(() => {
        window.addEventListener('resize', updateMetrics, { passive: true })
        unref(slider)?.addEventListener('scroll', updateIndex, { passive: true })

        updateMetrics()
        updateIndex()
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', updateMetrics)
        unref(slider)?.removeEventListener('scroll', updateIndex)
    })

    return {
        isFirst,
        isLast,
        previous,
        next,
    }
}
