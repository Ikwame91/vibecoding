import { api } from './client.js'

export function listTransactions(filters = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.type) params.set('type', filters.type)
  const qs = params.toString()
  return api(`/transactions${qs ? '?' + qs : ''}`)
}

export function createTransaction(data) {
  return api('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getTransaction(id) {
  return api(`/transactions/${id}`)
}

export function updateTransaction(id, data) {
  return api(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteTransaction(id) {
  return api(`/transactions/${id}`, { method: 'DELETE' })
}

export function getBalance() {
  return api('/transactions/balance')
}

export function getReportByCategory() {
  return api('/transactions/reports/by-category')
}

export function getTotalIncome() {
  return api('/transactions/reports/income')
}

export function getTotalExpenses() {
  return api('/transactions/reports/expenses')
}

export function getCountPerCategory() {
  return api('/transactions/reports/counts')
}
