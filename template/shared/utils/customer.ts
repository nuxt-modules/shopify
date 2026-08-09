import { z } from 'zod'

const optionalText = (max: number) => z
  .string()
  .trim()
  .max(max)
  .optional()
  .transform(value => value || undefined)

export const customerOrdersInputSchema = z.object({
  first: z.number().min(1).max(50).default(10),
})

export const customerOrderInputSchema = z.object({
  id: z.string().min(1).transform(value => `gid://shopify/Order/${value}`),
})

export const customerAddressesInputSchema = z.object({
  first: z.number().min(1).max(50).default(20),
})

export const customerUpdateInputSchema = z.object({
  firstName: optionalText(255),
  lastName: optionalText(255),
})

export const customerAddressInputSchema = z.object({
  firstName: optionalText(255),
  lastName: optionalText(255),
  company: optionalText(255),
  address1: z.string().trim().min(1).max(255),
  address2: optionalText(255),
  city: z.string().trim().min(1).max(255),
  zip: z.string().trim().min(1).max(32),
  territoryCode: z.string().trim().length(2).toUpperCase(),
  zoneCode: optionalText(32),
  phoneNumber: optionalText(32),
})

export const customerAddressCreateInputSchema = z.object({
  address: customerAddressInputSchema,
  defaultAddress: z.boolean().optional(),
})

export const customerAddressUpdateInputSchema = z.object({
  addressId: z.string().min(1),
  address: customerAddressInputSchema.optional(),
  defaultAddress: z.boolean().optional(),
})

export const customerAddressDeleteInputSchema = z.object({
  addressId: z.string().min(1),
})
