import prisma from '../src/db/index.js'

async function seed() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.order.deleteMany()
  await prisma.invoice.deleteMany()

  // ── Seed Orders ────────────────────────────────────────

  await prisma.order.createMany({
    data: [
      {
        id: 'ORD-1001',
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        status: 'shipped',
        tracking: 'TRK-ABC123',
        items: JSON.stringify([
          { name: 'Wireless Headphones', quantity: 1, price: 79.99 },
          { name: 'USB-C Cable', quantity: 2, price: 9.99 },
        ]),
        total: 99.97,
        createdAt: new Date('2026-01-15'),
        deliveryDate: new Date('2026-02-14'),
      },
      {
        id: 'ORD-1002',
        customerName: 'Bob Smith',
        customerEmail: 'bob@example.com',
        status: 'processing',
        tracking: '',
        items: JSON.stringify([
          { name: 'Mechanical Keyboard', quantity: 1, price: 149.99 },
        ]),
        total: 149.99,
        createdAt: new Date('2026-02-08'),
        deliveryDate: null,
      },
      {
        id: 'ORD-1003',
        customerName: 'Carol Davis',
        customerEmail: 'carol@example.com',
        status: 'delivered',
        tracking: 'TRK-XYZ789',
        items: JSON.stringify([
          { name: 'Monitor Stand', quantity: 1, price: 45.00 },
          { name: 'Desk Lamp', quantity: 1, price: 32.50 },
        ]),
        total: 77.50,
        createdAt: new Date('2026-01-20'),
        deliveryDate: new Date('2026-01-28'),
      },
      {
        id: 'ORD-1004',
        customerName: 'David Lee',
        customerEmail: 'david@example.com',
        status: 'shipped',
        tracking: 'TRK-DEF456',
        items: JSON.stringify([
          { name: 'Laptop Backpack', quantity: 1, price: 59.99 },
          { name: 'Mouse Pad XL', quantity: 1, price: 19.99 },
          { name: 'Webcam HD', quantity: 1, price: 44.99 },
        ]),
        total: 124.97,
        createdAt: new Date('2026-02-01'),
        deliveryDate: new Date('2026-02-12'),
      },
      {
        id: 'ORD-1005',
        customerName: 'Eva Martinez',
        customerEmail: 'eva@example.com',
        status: 'cancelled',
        tracking: '',
        items: JSON.stringify([
          { name: 'Smart Watch', quantity: 1, price: 299.99 },
        ]),
        total: 299.99,
        createdAt: new Date('2026-02-05'),
        deliveryDate: null,
      },
      {
        id: 'ORD-1006',
        customerName: 'Frank Wilson',
        customerEmail: 'frank@example.com',
        status: 'processing',
        tracking: '',
        items: JSON.stringify([
          { name: 'Noise Cancelling Earbuds', quantity: 2, price: 129.99 },
        ]),
        total: 259.98,
        createdAt: new Date('2026-02-10'),
        deliveryDate: null,
      },
      {
        id: 'ORD-1007',
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        status: 'delivered',
        tracking: 'TRK-GHI012',
        items: JSON.stringify([
          { name: 'Phone Case', quantity: 1, price: 24.99 },
          { name: 'Screen Protector', quantity: 2, price: 12.99 },
        ]),
        total: 50.97,
        createdAt: new Date('2025-12-20'),
        deliveryDate: new Date('2025-12-27'),
      },
    ],
  })

  // ── Seed Invoices ──────────────────────────────────────

  await prisma.invoice.createMany({
    data: [
      {
        id: 'INV-2001',
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        amount: 99.97,
        status: 'paid',
        description: 'Payment for order ORD-1001 — Wireless Headphones + USB-C Cables',
        createdAt: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
      },
      {
        id: 'INV-2002',
        customerName: 'Bob Smith',
        customerEmail: 'bob@example.com',
        amount: 149.99,
        status: 'pending',
        description: 'Payment for order ORD-1002 — Mechanical Keyboard',
        createdAt: new Date('2026-02-08'),
        dueDate: new Date('2026-03-08'),
      },
      {
        id: 'INV-2003',
        customerName: 'Carol Davis',
        customerEmail: 'carol@example.com',
        amount: 77.50,
        status: 'paid',
        description: 'Payment for order ORD-1003 — Monitor Stand + Desk Lamp',
        createdAt: new Date('2026-01-20'),
        dueDate: new Date('2026-02-20'),
      },
      {
        id: 'INV-2004',
        customerName: 'David Lee',
        customerEmail: 'david@example.com',
        amount: 124.97,
        status: 'pending',
        description: 'Payment for order ORD-1004 — Laptop Backpack + Mouse Pad + Webcam',
        createdAt: new Date('2026-02-01'),
        dueDate: new Date('2026-03-01'),
      },
      {
        id: 'INV-2005',
        customerName: 'Eva Martinez',
        customerEmail: 'eva@example.com',
        amount: 299.99,
        status: 'refunded',
        description: 'Refund for cancelled order ORD-1005 — Smart Watch',
        createdAt: new Date('2026-02-05'),
        dueDate: new Date('2026-03-05'),
      },
      {
        id: 'INV-2006',
        customerName: 'Frank Wilson',
        customerEmail: 'frank@example.com',
        amount: 259.98,
        status: 'pending',
        description: 'Payment for order ORD-1006 — Noise Cancelling Earbuds x2',
        createdAt: new Date('2026-02-10'),
        dueDate: new Date('2026-03-10'),
      },
      {
        id: 'INV-2007',
        customerName: 'Alice Johnson',
        customerEmail: 'alice@example.com',
        amount: 50.97,
        status: 'overdue',
        description: 'Payment for order ORD-1007 — Phone Case + Screen Protectors',
        createdAt: new Date('2025-12-20'),
        dueDate: new Date('2026-01-20'),
      },
    ],
  })

  // ── Seed Conversations ─────────────────────────────────

  const conv1 = await prisma.conversation.create({
    data: {
      title: 'Order ORD-1001 status inquiry',
      messages: {
        create: [
          { role: 'user', content: 'Hi, I need help with my order ORD-1001.' },
          { role: 'assistant', content: 'I found your order ORD-1001. It is currently shipped with tracking number TRK-ABC123. The estimated delivery date is February 14, 2026. Your order contains Wireless Headphones (x1) and USB-C Cables (x2) with a total of $99.97.', agentType: 'order' },
          { role: 'user', content: 'When will it arrive?' },
          { role: 'assistant', content: 'Based on the tracking information, your order ORD-1001 is expected to be delivered by February 14, 2026. The tracking number is TRK-ABC123 — you can use this to track your package in real time.', agentType: 'order' },
        ],
      },
    },
  })

  const conv2 = await prisma.conversation.create({
    data: {
      title: 'Invoice INV-2002 payment question',
      messages: {
        create: [
          { role: 'user', content: 'Can you show me the details for invoice INV-2002?' },
          { role: 'assistant', content: 'Invoice INV-2002 is for $149.99 and is currently pending. It covers your Mechanical Keyboard purchase (order ORD-1002). The due date is March 8, 2026.', agentType: 'billing' },
        ],
      },
    },
  })

  const conv3 = await prisma.conversation.create({
    data: {
      title: 'Password reset help',
      messages: {
        create: [
          { role: 'user', content: 'How do I reset my password?' },
          { role: 'assistant', content: 'To reset your password, go to Settings > Account > Change Password. You can also click "Forgot Password" on the login page to receive a reset link via email. If you continue to have trouble, feel free to reach out and I can help further!', agentType: 'support' },
        ],
      },
    },
  })

  console.log(`✅ Seeded conversations: ${conv1.id}, ${conv2.id}, ${conv3.id}`)
  console.log('✅ Seeded 7 orders, 7 invoices, 3 conversations')
  console.log('🌱 Seeding complete!')

  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
