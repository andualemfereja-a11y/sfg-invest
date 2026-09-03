export async function investAction(input: {
  planId: string
  planName: string
  amount: number | string
  profitRate: number | string
}): Promise<InvestmentResult> {
  try {
    console.log('💰 Starting investment...')
    console.log('📊 Input:', input)

    // Get current user from session
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const token = cookieStore.get('sfg_session')?.value

    if (!token) {
      console.log('❌ No session token found')
      return { ok: false, error: 'Not authenticated' }
    }

    console.log('✅ Session token found')

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      console.log('❌ User not found in session')
      return { ok: false, error: 'User not found' }
    }

    console.log('✅ User found:', session.user.id)

    // Convert string inputs to appropriate types
    const amount =
      typeof input.amount === 'string'
        ? parseFloat(input.amount)
        : input.amount

    const profitRate =
      typeof input.profitRate === 'string'
        ? parseFloat(input.profitRate)
        : input.profitRate

    console.log('💵 Amount:', amount, 'ProfitRate:', profitRate)

    if (!Number.isFinite(amount) || amount <= 0) {
      console.log('❌ Invalid investment amount:', amount)
      return {
        ok: false,
        error: 'Invalid investment amount',
      }
    }

    if (!Number.isFinite(profitRate) || profitRate < 0) {
      console.log('❌ Invalid profit rate:', profitRate)
      return {
        ok: false,
        error: 'Invalid profit rate',
      }
    }

    console.log('✅ Validation passed')

    const investmentAmount = new Decimal(amount)

    /*
     * Deduct balance + create investment in ONE transaction.
     *
     * This prevents a situation where the investment is created
     * but the user's balance is not deducted.
     */
    const investment = await prisma.$transaction(async (tx) => {
      /*
       * Only deduct if the user still has enough balance.
       *
       * updateMany is used so the balance check and deduction
       * happen atomically.
       */
      const balanceUpdate = await tx.user.updateMany({
        where: {
          id: session.user.id,
          baseBalance: {
            gte: investmentAmount,
          },
        },
        data: {
          baseBalance: {
            decrement: investmentAmount,
          },
        },
      })

      if (balanceUpdate.count !== 1) {
        throw new Error('Insufficient available balance')
      }

      console.log('✅ Balance deducted:', amount)

      // Create investment record
      console.log('🔄 Creating investment in database...')

      const createdInvestment = await tx.investment.create({
        data: {
          userId: session.user.id,
          planId: input.planId,
          planName: input.planName,
          amount: investmentAmount,
          profitRate: new Decimal(profitRate),
          returnDays: 180,

          // KEEPING YOUR ORIGINAL TIMESTAMP LOGIC
          startTimestamp: BigInt(Math.floor(Date.now() / 1000)),
          endTimestamp:
            BigInt(Math.floor(Date.now() / 1000)) +
            BigInt(180 * 24 * 60 * 60),

          accumulatedEarnings: new Decimal(0),

          lastCalculatedTimestamp: BigInt(
            Math.floor(Date.now() / 1000),
          ),

          status: 'active',
        },
      })

      console.log(
        '✅ Investment created in DB:',
        createdInvestment.id,
      )

      return createdInvestment
    })

    // Format and serialize the investment
    console.log('🔄 Formatting investment...')

    const formattedInvestment = formatInvestment(investment)

    console.log('✅ Investment formatted')

    const serializedInvestment = serializeData(formattedInvestment)

    console.log('✅ Investment serialized')

    console.log('✅ Investment action successful')

    return {
      ok: true,
      investment: serializedInvestment,
    }
  } catch (error) {
    console.error('❌ Investment error:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)

      return {
        ok: false,
        error: error.message,
      }
    }

    return {
      ok: false,
      error: 'Investment creation failed',
    }
  }
}