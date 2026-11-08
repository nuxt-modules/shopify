export const usePolicies = () => {
  const { params: localization } = useLocalization()

  return useStorefrontData(localizedKey('policies'), `#graphql
    query FetchPolicies($language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
      shop {
        ...ShopPoliciesFields
      }
    }
  `, {
    variables: localization,
    transform: data => flattenPolicies(data?.shop),
    cache: 'long',
  })
}
