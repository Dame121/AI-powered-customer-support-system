import prisma from '../db/index.js'

// Look up an order by ID
export const getOrderDetails = async (orderId: string) => {
  return prisma.order.findUnique({ where: { id: orderId } })
}

// Get order status
export const checkDeliveryStatus = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return null
  return {
    status: order.status,
    deliveryDate: order.deliveryDate,
    tracking: order.tracking,
  }
}

// Get tracking info
export const getTrackingInfo = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || !order.tracking) return null
  return {
    tracking: order.tracking,
    status: order.status,
    deliveryDate: order.deliveryDate,
  }
}

// List all orders (for general queries)
export const listOrders = async () => {
  return prisma.order.findMany({ orderBy: { createdAt: 'desc' } })
}

