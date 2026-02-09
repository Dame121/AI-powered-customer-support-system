import prisma from '../db/index.js'

// Look up an invoice by ID
export const getInvoiceDetails = async (invoiceId: string) => {
  return prisma.invoice.findUnique({ where: { id: invoiceId } })
}

// Check payment status
export const checkPaymentStatus = async (invoiceId: string) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  return invoice?.status ?? null
}

// List all invoices
export const listInvoices = async () => {
  return prisma.invoice.findMany()
}

