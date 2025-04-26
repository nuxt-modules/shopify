import { useRoute, useRouter } from 'vue-router'

export function useBreadcrumbs() {
    const route = useRoute()
    const router = useRouter()

    const breadcrumbs = computed(() => {
        const matchedRoutes = router.currentRoute.value.matched
        const crumbs = matchedRoutes
            .map((m) => {
                if (typeof m.meta?.breadcrumb === 'function') {
                    return { label: m.meta.breadcrumb(route).label, path: m.path }
                }
                return null
            })
            .filter(Boolean)

        return [
            {
                label: 'Home',
                path: '/',
            },
            ...crumbs,
        ]
    })

    return { breadcrumbs }
}
