import { db } from '../lib/db/index'
import { products } from '../lib/db/schema'

/**
 * Seed the products table with the 4 investment plans
 */
async function seed() {
  try {
    console.log('🌱 Seeding products...')

    // Delete existing products
    await db.delete(products)
    console.log('✓ Cleared existing products')

    // Insert the 4 investment plans
    const seededProducts = await db
      .insert(products)
      .values([
        {
          name: 'SFG Starter',
          minimumAmount: '5800',
          dailyProfitRate: '0.042',
          returnDays: 180,
          status: 'active',
        },
        {
          name: 'SFG Growth',
          minimumAmount: '12500',
          dailyProfitRate: '0.045',
          returnDays: 180,
          status: 'active',
        },
        {
          name: 'SFG Premium',
          minimumAmount: '25000',
          dailyProfitRate: '0.048',
          returnDays: 180,
          status: 'active',
        },
        {
          name: 'SFG Pro',
          minimumAmount: '50000',
          dailyProfitRate: '0.05',
          returnDays: 180,
          status: 'active',
        },
      ])
      .returning()

    console.log('✓ Seeded 4 products:')
    seededProducts.forEach((p) => {
      console.log(
        `  - ${p.name}: ${p.minimumAmount} ETB min, ${parseFloat(p.dailyProfitRate) * 100}% daily, 180 days`,
      )
    })

    console.log('\n✅ Database seeding complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
