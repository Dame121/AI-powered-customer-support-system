import prisma from '../db/index.js'

// Look up an order by ID
export const getOrderDetails = async (orderId: string) => {
  return prisma.order.findUnique({ where: { id: orderId } })
}

// Get order status
export const checkDeliveryStatus = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  return order?.status ?? null
}

// Get tracking info
export const getTrackingInfo = async (orderId: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  return order?.tracking ?? null
}

