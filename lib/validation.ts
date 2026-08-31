// lib/validation.ts
import { z } from 'zod'

// Phone number validation for Ethiopian numbers
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((val) => {
    // Accept formats: 0912345678, +251912345678, 251912345678, 912345678
    let digits = val.replace(/[^\d+]/g, '')
    digits = digits.replace(/^\+/, '')
    if (digits.startsWith('251')) {
      digits = digits.slice(3)
    }
    if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('7'))) {
      digits = '0' + digits
    }
    return digits.length === 10 && digits.startsWith('0') && (digits[1] === '9' || digits[1] === '7')
  }, 'Enter a valid Ethiopian phone number')

// Authentication schemas
export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  phone: phoneSchema,
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
})

// Investment schemas
export const investSchema = z.object({
  planId: z.string().min(1, 'Plan is required'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number'),
})

// Withdrawal schemas
export const withdrawalSchema = z.object({
  telebirrPhone: phoneSchema,
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number')
    .min(350, 'Minimum withdrawal amount is 350 ETB'),
})

// Deposit schemas (for admin)
export const depositSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .finite('Amount must be a valid number'),
})

// Types
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type InvestInput = z.infer<typeof investSchema>
export type WithdrawalInput = z.infer<typeof withdrawalSchema>
export type DepositInput = z.infer<typeof depositSchema>
