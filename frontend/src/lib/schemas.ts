import { z } from 'zod'

export const listingCategorySchema = z.enum(['vegetable', 'fruit', 'grain', 'dairy', 'other'])

export const listingFormSchema = z.object({
  produce_name: z.string().min(1, 'Required'),
  category: listingCategorySchema,
  price_per_kg: z.number().positive('Must be > 0'),
  quantity_kg: z.number().positive('Must be > 0'),
  min_order_kg: z.number().positive('Must be > 0'),
  available_from: z.string().optional(),
  description: z.string().optional(),
})

export type ListingFormValues = z.infer<typeof listingFormSchema>
