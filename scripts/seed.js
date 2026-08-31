require('ts-node').register({
  project: './tsconfig.json',
  transpileOnly: true,
})

require('./seed.ts')
