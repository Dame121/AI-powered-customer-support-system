import prisma from '../src/db/index.js'

async function seed() {
  console.log('🌱 Seeding database...')

  // Seed sample orders
  await prisma.order.createMany({
    data: [
      { id: 'ORD-1001', status: 'shipped', tracking: 'TRK-ABC123' },
      { id: 'ORD-1002', status: 'processing', tracking: '' },
      { id: 'ORD-1003', status: 'delivered', tracking: 'TRK-XYZ789' },
    ],
    skipDuplicates: true,
  })

  // Seed sample invoices
  await prisma.invoice.createMany({
    data: [
      { id: 'INV-2001', amount: 49.99, status: 'paid' },
      { id: 'INV-2002', amount: 150.0, status: 'pending' },
      { id: 'INV-2003', amount: 75.5, status: 'overdue' },
    ],
    skipDuplicates: true,
  })

  // Seed a sample conversation with messages
  const conversation = await prisma.conversation.create({
    data: {
      messages: {
        create: [
          { role: 'user', content: 'Hi, I need help with my order ORD-1001.' },
          { role: 'assistant', content: 'Sure! Let me look that up for you.' },
          { role: 'agent', content: 'Order ORD-1001 is currently shipped with tracking TRK-ABC123.' },
        ],
      },
    },
  })

  console.log(`✅ Seeded conversation: ${conversation.id}`)
  console.log('✅ Seeded 3 orders, 3 invoices')
  console.log('🌱 Seeding complete!')

  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
