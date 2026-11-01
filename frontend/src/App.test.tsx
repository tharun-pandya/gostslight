import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Welcome } from './pages/Welcome'
import { Ask } from './pages/Ask'
import { Record } from './pages/Record'
import { MemoryCard } from './components/MemoryCard'
import { ToastProvider } from './hooks/useToast'
import { api, enableSample } from './services/api'
import demo from './services/demo.json'

const status = { exists: false, unlocked: false, demo_mode: false, idle_lock_seconds: 600 }

test('vault setup requires matching long passphrase and acknowledgement of unrecoverability', async () => {
  const u = userEvent.setup()
  render(<Welcome status={status} onReady={() => {}} />)
  expect(screen.getByText(/Some voices deserve to stay/)).toBeInTheDocument()
  await u.click(screen.getByRole('button', { name: /Create a private memory vault/ }))
  expect(screen.getByText(/cannot be recovered/)).toBeInTheDocument()
  const create = screen.getByRole('button', { name: 'Create vault' })
  expect(create).toBeDisabled()
  await u.type(screen.getByLabelText(/^Passphrase/), 'a long enough passphrase')
  await u.type(screen.getByLabelText('Repeat passphrase'), 'a long enough passphrase')
  expect(create).toBeDisabled()
  await u.click(screen.getByRole('checkbox'))
  expect(create).toBeEnabled()
})

test('memory card shows quote, source, timestamp and a source-playback action', async () => {
  const open = vi.fn(); const m: any = { ...demo.memories[0] }
  render(<MemoryCard m={m} onOpen={open} />)
  expect(screen.getByText(/Every Sankranti, we used to prepare ariselu together/)).toBeInTheDocument()
  expect(screen.getByText(/00:12–00:18/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Open source recording/ }))
  expect(open).toHaveBeenCalledWith('demo_s1', 12.4)
})

describe('demo mode', () => {
  beforeAll(() => enableSample())
  test('ask shows cited answer with timestamps and an honest abstention', async () => {
    const open = vi.fn(); const u = userEvent.setup()
    render(<Ask open={open} />)
    expect(screen.getByText(/fictional sample memories/)).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'What did grandmother say about Sankranti?' }))
    await waitFor(() => expect(screen.getByText(/Source: Sankranti in the Old Kitchen/)).toBeInTheDocument())
    await u.click(screen.getByRole('button', { name: /Listen to original recording/ }))
    expect(open).toHaveBeenCalledWith('demo_s1', 12.4)
    await u.click(screen.getByRole('button', { name: 'What did grandfather say about cricket?' }))
    await waitFor(() => expect(screen.getByText(/couldn't find this memory/)).toBeInTheDocument())
    expect(screen.queryByText(/Source:/)).toBeNull()
  })
  test('recording and private writes are disabled', async () => {
    render(<ToastProvider><Record onCreated={() => {}} /></ToastProvider>)
    expect(screen.getByText(/disabled in the demo/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Record$/ })).toBeNull()
    await expect(api.create('x', 'long enough passphrase')).rejects.toThrow(/Disabled in demo/)
    await expect(async () => api.transcribe('s')).rejects.toThrow(/Disabled in demo/)
  })
})
