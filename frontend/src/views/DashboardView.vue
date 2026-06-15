<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../stores/auth.js'
import * as tx from '../api/transactions.js'
import * as authApi from '../api/auth.js'

const router = useRouter()

const transactions = ref([])
const balance = ref(0)
const totalIncome = ref(0)
const totalExpenses = ref(0)
const reportByCategory = ref({})
const countPerCategory = ref({})
const error = ref('')
const loading = ref(false)

const description = ref('')
const amount = ref(null)
const type = ref('expense')
const category = ref('')

const filterType = ref('')
const filterCategory = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [txns, bal, income, expenses, report, counts] = await Promise.all([
      tx.listTransactions(),
      tx.getBalance(),
      tx.getTotalIncome(),
      tx.getTotalExpenses(),
      tx.getReportByCategory(),
      tx.getCountPerCategory(),
    ])
    transactions.value = txns
    balance.value = bal.balance
    totalIncome.value = income.totalIncome
    totalExpenses.value = expenses.totalExpenses
    reportByCategory.value = report
    countPerCategory.value = counts
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function addTransaction() {
  error.value = ''
  try {
    await tx.createTransaction({
      description: description.value,
      amount: Number(amount.value),
      type: type.value,
      category: category.value,
    })
    description.value = ''
    amount.value = null
    category.value = ''
    await loadData()
  } catch (err) {
    error.value = err.message
  }
}

async function removeTransaction(id) {
  try {
    await tx.deleteTransaction(id)
    await loadData()
  } catch (err) {
    error.value = err.message
  }
}

async function applyFilter() {
  loading.value = true
  error.value = ''
  try {
    const filters = {}
    if (filterType.value) filters.type = filterType.value
    if (filterCategory.value) filters.category = filterCategory.value
    transactions.value = await tx.listTransactions(filters)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  try {
    await authApi.logout(auth.refreshToken)
  } catch { /* ignore */ }
  auth.logout()
  router.push('/login')
}

const categoryKeys = computed(() => Object.keys(reportByCategory.value))

onMounted(loadData)
</script>

<template>
  <div class="dashboard">
    <header class="header">
      <h1>testxpense</h1>
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <section class="cards">
      <div class="card"><strong>Balance</strong><span class="balance" :class="balance < 0 ? 'negative' : ''">{{ balance.toFixed(2) }}</span></div>
      <div class="card"><strong>Income</strong><span class="income">{{ totalIncome.toFixed(2) }}</span></div>
      <div class="card"><strong>Expenses</strong><span class="expense">{{ totalExpenses.toFixed(2) }}</span></div>
    </section>

    <section class="add-form">
      <h2>Add Transaction</h2>
      <form @submit.prevent="addTransaction">
        <input v-model="description" placeholder="Description" required />
        <input v-model.number="amount" type="number" step="0.01" placeholder="Amount" required />
        <select v-model="type">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input v-model="category" placeholder="Category" required />
        <button type="submit">Add</button>
      </form>
    </section>

    <section class="filters">
      <h2>Filters</h2>
      <div class="filter-row">
        <select v-model="filterType">
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input v-model="filterCategory" placeholder="Category" />
        <button @click="applyFilter">Filter</button>
      </div>
    </section>

    <section class="transactions">
      <h2>Transactions</h2>
      <p v-if="loading">Loading...</p>
      <table v-else-if="transactions.length">
        <thead>
          <tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="t in transactions" :key="t.id">
            <td>{{ new Date(t.date).toLocaleDateString() }}</td>
            <td>{{ t.description }}</td>
            <td>{{ t.category }}</td>
            <td>{{ t.type }}</td>
            <td :class="t.type === 'income' ? 'income' : 'expense'">{{ t.type === 'income' ? '+' : '-' }}{{ t.amount.toFixed(2) }}</td>
            <td><button class="delete-btn" @click="removeTransaction(t.id)">Delete</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else>No transactions yet.</p>
    </section>

    <section class="reports">
      <h2>Category Report</h2>
      <table v-if="categoryKeys.length">
        <thead><tr><th>Category</th><th>Net</th><th>Count</th></tr></thead>
        <tbody>
          <tr v-for="cat in categoryKeys" :key="cat">
            <td>{{ cat }}</td>
            <td :class="reportByCategory[cat] < 0 ? 'expense' : 'income'">{{ reportByCategory[cat].toFixed(2) }}</td>
            <td>{{ countPerCategory[cat] }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else>No data.</p>
    </section>
  </div>
</template>

<style scoped>
.dashboard { max-width: 800px; margin: 0 auto; padding: 1rem; }
.header { display: flex; justify-content: space-between; align-items: center; }
.logout-btn { background: none; border: 1px solid #ccc; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; }
.cards { display: flex; gap: 1rem; margin: 1rem 0; }
.card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.balance { font-size: 1.5rem; font-weight: bold; }
.negative { color: #dc2626; }
.income { color: #16a34a; }
.expense { color: #dc2626; }
.add-form, .filters, .transactions, .reports { margin: 1.5rem 0; }
.add-form form, .filter-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.add-form input, .add-form select, .filter-row input, .filter-row select { padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.875rem; }
.add-form button, .filter-row button { padding: 0.4rem 0.8rem; background: #4f46e5; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.delete-btn { background: none; border: 1px solid #dc2626; color: #dc2626; padding: 0.2rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.875rem; }
th { font-weight: 600; }
.error { color: #dc2626; }
</style>
