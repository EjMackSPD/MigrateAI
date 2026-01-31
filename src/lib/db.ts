import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Handle connection errors and reconnect
prisma.$on('error' as never, (e: any) => {
  console.error('Prisma error:', e)
})

// Add connection retry helper
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      // Check if it's a connection error
      const errorMessage = lastError.message.toLowerCase()
      if (
        errorMessage.includes('closed') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('econnreset')
      ) {
        console.warn(`Database connection error (attempt ${i + 1}/${maxRetries}):`, lastError.message)
        
        if (i < maxRetries - 1) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)))
          
          // Try to reconnect
          try {
            await prisma.$connect()
            console.log('Database reconnected')
          } catch (connectError) {
            console.error('Failed to reconnect:', connectError)
          }
        }
      } else {
        // Not a connection error, throw immediately
        throw lastError
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries')
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
