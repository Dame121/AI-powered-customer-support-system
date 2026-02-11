import prisma from '../db/index.js'

// Look up an invoice by ID
export const getInvoiceDetails = async (invoiceId: string) => {
  return prisma.invoice.findUnique({ where: { id: invoiceId } })
}

// Check payment status
export const checkPaymentStatus = async (invoiceId: string) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return null
  return {
    status: invoice.status,
    amount: invoice.amount,
    dueDate: invoice.dueDate,
    description: invoice.description,
  }
}

// Check refund status
export const checkRefundStatus = async (invoiceId: string) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!invoice) return null
  return {
    invoiceId: invoice.id,
    status: invoice.status,
    isRefunded: invoice.status === 'refunded',
    amount: invoice.amount,
  }
}

// List all invoices
export const listInvoices = async () => {
  return prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } })
}

