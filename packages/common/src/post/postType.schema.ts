import {z} from 'zod'

export const postTypeSchema=z.object({
    type:z.enum(["Tweet","Video","Image"])
})

export type postTypeData=z.infer<typeof postTypeSchema>