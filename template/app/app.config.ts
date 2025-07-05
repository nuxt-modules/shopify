export default defineAppConfig({
    // https://ui.nuxt.com/getting-started/theme#design-system
    ui: {
        colors: {
            primary: 'green',
            neutral: 'neutral',
        },

        card: {
            slots: {
                root: 'p-0 ring-0 shadow-none',
                body: 'p-0 sm:p-0',
            },
        },

        button: {
            slots: {
                base: 'font-normal',
            },
            variants: {
                variant: {
                    navigation: 'px-2 md:px-3 hover:bg-elevated/50 text-dimmed hover:text-muted disabled:text-dimmed aria-disabled:text-dimmed focus:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary',
                },
            },
        },

        breadcrumb: {
            slots: {
                linkLabel: 'truncate mb-[2px] font-normal',
                separator: 'flex -mb-[2px]',
                variants: {
                    active: {
                        false: {
                            link: 'text-[var(--ui-text-muted)] mb-[2px]',
                        },
                    },
                },
            },
        },

        icons: {
            arrowLeft: 'hugeicons:arrow-left-01',
            arrowRight: 'hugeicons:arrow-right-01',
            check: 'hugeicons:checkmark-square-04',
            chevronDoubleLeft: 'hugeicons:arrow-left-double',
            chevronDoubleRight: 'hugeicons:arrow-right-double',
            chevronDown: 'hugeicons:arrow-down-01',
            chevronLeft: 'hugeicons:arrow-left-01',
            chevronRight: 'hugeicons:arrow-right-01',
            chevronUp: 'hugeicons:arrow-up-01',
            close: 'hugeicons:cancel-01',
            ellipsis: 'hugeicons:ease-curve-control-points',
            external: 'hugeicons:arrow-up-right-01',
            minus: 'hugeicons:minus-sign',
            plus: 'hugeicons:plus-sign',
            search: 'hugeicons:search-01',
        },

        modal: {
            slots: {
                overlay: 'fixed inset-0 bg-black/10 backdrop-blur-xs',
            },
        },

        slideover: {
            slots: {
                overlay: 'fixed inset-0 bg-black/10 backdrop-blur-xs',
            },
        },

        drawer: {
            slots: {
                overlay: 'fixed inset-0 bg-black/10 backdrop-blur-xs',
            },
        },
    },
})
