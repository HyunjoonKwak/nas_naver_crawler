// Database Connection Test Script
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')

    // Test connection
    await prisma.$connect()
    console.log('✅ Database connected successfully!')

    // Test query - count tables
    const complexCount = await prisma.complex.count()
    const articleCount = await prisma.article.count()
    const historyCount = await prisma.crawlHistory.count()

    console.log('\n📊 Database Status:')
    console.log(`  - Complexes: ${complexCount}`)
    console.log(`  - Articles: ${articleCount}`)
    console.log(`  - Crawl History: ${historyCount}`)

    // Test insert and delete
    console.log('\n🧪 Testing CRUD operations...')
    const testComplex = await prisma.complex.create({
      data: {
        complexNo: 'TEST_001',
        complexName: 'Test Complex',
        address: 'Test Address',
      },
    })
    console.log('✅ Create: Success')

    const found = await prisma.complex.findUnique({
      where: { complexNo: 'TEST_001' },
    })
    console.log('✅ Read: Success')

    await prisma.complex.delete({
      where: { id: testComplex.id },
    })
    console.log('✅ Delete: Success')

    console.log('\n🎉 All tests passed!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
