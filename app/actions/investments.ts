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

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || !session.user) {
      console.log('❌ User not found in session')
      return { ok: false, error: 'User not found' }
    }

    console.log('✅ User found:', session.user.id)

    // Convert string inputs to numbers
    const amount =
      typeof input.amount === 'string'
        ? parseFloat(input.amount)
        : input.amount

    const profitRate =
      typeof input.profitRate === 'string'
        ? parseFloat(input.profitRate)
        : input.profitRate

    console.log('💵 Amount:', amount, 'ProfitRate:', profitRate)

    // Validate amount
    if (!Number.isFinite(amount) || amount <= 0) {
      console.log('❌ Invalid investment amount:', amount)
      return {
        ok: false,
        error: 'Invalid investment amount',
      }
    }

    // Validate profit rate
    if (!Number.isFinite(profitRate) || profitRate < 0) {
      console.log('❌ Invalid profit rate:', profitRate)
      return {
        ok: false,
        error: 'Invalid profit rate',
      }
    }

    const investmentAmount = new Decimal(amount)

    // Use milliseconds because the Prisma schema expects milliseconds.
    const now = Date.now()
    const endTimestamp =
      now + 180 * 24 * 60 * 60 * 1000

    /*
     * IMPORTANT:
     *
     * Balance deduction and investment creation happen
     * inside ONE database transaction.
     *
     * This guarantees that:
     *
     * 1. The user has enough balance.
     * 2. The money is deducted.
     * 3. The investment is created.
     *
     * If any step fails, everything is rolled back.
     */
    const investment = await prisma.$transaction(async (tx) => {
      /*
       * Atomically deduct the investment amount.
       *
       * The WHERE condition makes sure the balance is
       * still large enough at the exact moment of update.
       *
       * This also protects against two investment requests
       * being submitted at almost the same time.
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

      console.log('✅ Investment amount deducted from balance')

      // Create investment only after balance was successfully deducted.
      const createdInvestment = await tx.investment.create({
        data: {
          userId: session.user.id,
          planId: input.planId,
          planName: input.planName,
          amount: investmentAmount,
          profitRate: new Decimal(profitRate),
          returnDays: 180,

          // Stored in milliseconds to match schema.prisma
          startTimestamp: BigInt(now),
          endTimestamp: BigInt(endTimestamp),

          accumulatedEarnings: new Decimal(0),
          lastCalculatedTimestamp: BigInt(now),
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
    const formattedInvestment = formatInvestment(investment)
    const serializedInvestment = serializeData(formattedInvestment)

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