// Синхронизация с облаком (Supabase): вход, отправка изменений, загрузка, статус для шапки.
// Один экземпляр на всё приложение. React читает состояние через useSyncState().
//
// Когда синхронизируемся:
//   - при открытии сайта и при входе;
//   - через 2 с после изменения (несколько изменений подряд — одна отправка);
//   - при возврате на вкладку браузера и при появлении сети.
// Офлайн изменения просто лежат на устройстве: при следующей синхронизации отпечаток
// раздела не совпадёт с облачным — и раздел уйдёт в облако.
import { useSyncExternalStore } from 'react'
import type { Session } from '@supabase/supabase-js'
import { onWrite } from '../storage/localStore'
import { SECTION_IDS, loadSyncMeta, saveSyncMeta } from '../storage/syncStorage'
import type { SectionId, SyncMeta } from '../storage/syncStorage'
import { supabase, TABLE } from './supabaseClient'
import {
  KEY_SECTIONS,
  applyRemoteSections,
  describe,
  hasData,
  hashOf,
  parseRemoteSections,
  readLocalSections,
} from './sections'
import type { Sections } from './sections'
import { decide, isRemoteEmpty, localAt, noteLocalChanges, pushAt, remoteAt } from './syncLogic'
import type { RemoteRow } from './syncLogic'

// off       — синхронизация не настроена (нет ключей Supabase)
// signedOut — «не вошёл»
// offline   — «офлайн»
// syncing   — «синхронизация…» (идёт обмен или скоро отправим изменения)
// synced    — «синхронизировано»
// error     — облако ответило ошибкой (повторим через 30 с)
// choice    — первый вход: и в облаке, и здесь есть данные — ждём ответа, какие оставить
export type SyncStatus = 'off' | 'signedOut' | 'offline' | 'syncing' | 'synced' | 'error' | 'choice'

export interface SyncState {
  status: SyncStatus
  email: string | null
  lastSyncedAt: string | null
  error: string | null
  choice: { local: string; remote: string } | null // описания данных для вопроса
}

const DEBOUNCE_MS = 2000
const RETRY_MS = 30000

let state: SyncState = {
  status: supabase ? 'signedOut' : 'off',
  email: null,
  lastSyncedAt: null,
  error: null,
  choice: null,
}
const subscribers = new Set<() => void>()
const replacedListeners = new Set<() => void>()

let session: Session | null = null
let started = false
let running = false // идёт синхронизация
let again = false // во время синхронизации что-то поменялось — пройти ещё раз
let applying = false // сейчас записываем данные из облака — это не «изменения на устройстве»
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
// Когда раздел последний раз сохраняли (в памяти; точное время изменения для touched).
const writeAt: Partial<Record<SectionId, string>> = {}
// Первый вход: строка из облака ждёт ответа «какие данные оставить».
let pendingChoice: { userId: string; row: RemoteRow | null } | null = null

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  subscribers.forEach((notify) => notify())
}

// ---------- Для React ----------

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (notify) => {
      subscribers.add(notify)
      return () => subscribers.delete(notify)
    },
    () => state,
  )
}

// Данные на устройстве заменены облачными — вкладкам пора перечитать хранилище.
export function onDataReplaced(listener: () => void): () => void {
  replacedListeners.add(listener)
  return () => replacedListeners.delete(listener)
}

// ---------- Запуск ----------

export function startSync(): void {
  if (!supabase || started) return
  started = true

  // Сессия запоминается самим Supabase (в localStorage) — после перезагрузки вход сохраняется.
  supabase.auth.getSession().then(({ data }) => setSession(data.session))
  supabase.auth.onAuthStateChange((_event, next) => {
    // Внутри этого обработчика нельзя ждать запросы Supabase — выходим из него через setTimeout.
    setTimeout(() => setSession(next), 0)
  })

  onWrite((key) => {
    const ids = KEY_SECTIONS[key]
    if (!ids || applying) return
    const now = new Date().toISOString()
    ids.forEach((id) => (writeAt[id] = now))
    scheduleSync()
  })

  window.addEventListener('online', () => void syncNow())
  window.addEventListener('offline', () => session && setState({ status: 'offline' }))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow()
  })
}

function setSession(next: Session | null) {
  const userChanged = next?.user.id !== session?.user.id
  session = next
  if (!next) {
    pendingChoice = null
    setState({ status: 'signedOut', email: null, error: null, choice: null })
    return
  }
  setState({ email: next.user.email ?? null })
  if (userChanged) void syncNow()
}

// Изменение на устройстве: отправим через 2 с (новое изменение откладывает отправку).
function scheduleSync() {
  if (!session) return
  clearTimeout(debounceTimer)
  if (navigator.onLine && state.status !== 'choice') setState({ status: 'syncing' })
  debounceTimer = setTimeout(() => void syncNow(), DEBOUNCE_MS)
}

// ---------- Вход и выход ----------

function authErrorText(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Неверный email или пароль'
  if (/email not confirmed/i.test(message)) return 'Email не подтверждён — открой письмо и перейди по ссылке'
  if (/already registered/i.test(message)) return 'Такой email уже зарегистрирован — просто войди'
  if (/password should be at least/i.test(message)) return 'Пароль слишком короткий (нужно от 6 символов)'
  if (/signups not allowed/i.test(message)) return 'Регистрация закрыта'
  if (/fetch|network/i.test(message)) return 'Нет связи с сервером'
  return message
}

// Возвращает текст ошибки или null, если всё хорошо.
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Синхронизация не настроена'
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? authErrorText(error.message) : null
}

// Регистрация. Если в Supabase включено подтверждение почты — сначала придёт письмо.
export async function signUp(email: string, password: string): Promise<{ error: string | null; confirm: boolean }> {
  if (!supabase) return { error: 'Синхронизация не настроена', confirm: false }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  })
  if (error) return { error: authErrorText(error.message), confirm: false }
  return { error: null, confirm: !data.session }
}

// Выход только на этом устройстве. Данные остаются здесь и работают локально.
export async function signOut(): Promise<void> {
  await supabase?.auth.signOut({ scope: 'local' })
}

// ---------- Синхронизация ----------

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return String(error)
}

export async function syncNow(): Promise<void> {
  if (!supabase || !session) return
  if (running) {
    again = true
    return
  }
  clearTimeout(debounceTimer)
  clearTimeout(retryTimer)
  if (!navigator.onLine) {
    setState({ status: 'offline' })
    return
  }
  // Ждём ответа на вопрос «какие данные оставить» — до него ничего не отправляем.
  if (pendingChoice) return

  running = true
  setState({ status: 'syncing' })
  const userId = session.user.id
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    const row = (data as RemoteRow | null) ?? null
    const meta = loadSyncMeta()
    const local = readLocalSections()
    const now = new Date().toISOString()
    const hashes = hashAll(local)
    noteLocalChanges(meta, hashes, writeAt, now)
    saveSyncMeta(meta)

    if (meta.userId !== userId) {
      const asked = await firstSync(userId, row, local, meta)
      if (asked) return
    } else {
      const { apply, push } = decide(meta, hashes, row, now)
      if (apply.length > 0) applyFromCloud(apply, row, meta)
      if (push.length > 0) await pushToCloud(push, local, row, meta, userId)
    }
    setState({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
  } catch (error) {
    if (!navigator.onLine) setState({ status: 'offline' })
    else {
      setState({ status: 'error', error: errorText(error) })
      retryTimer = setTimeout(() => void syncNow(), RETRY_MS)
    }
  } finally {
    running = false
    if (again) {
      again = false
      void syncNow()
    }
  }
}

function hashAll(local: Sections): Record<SectionId, string> {
  return Object.fromEntries(SECTION_IDS.map((id) => [id, hashOf(local[id])])) as Record<SectionId, string>
}

// Берёт разделы из облака и записывает на устройство.
function applyFromCloud(ids: SectionId[], row: RemoteRow | null, meta: SyncMeta) {
  const remote = parseRemoteSections(Object.fromEntries(ids.map((id) => [id, row?.[id]])))
  applying = true
  let after: Sections
  try {
    after = applyRemoteSections(remote)
  } finally {
    applying = false
  }
  for (const id of ids) {
    meta.synced[id] = { hash: hashOf(after[id]), updatedAt: remoteAt(row, id) ?? new Date().toISOString() }
    delete meta.touched[id]
  }
  saveSyncMeta(meta)
  replacedListeners.forEach((listener) => listener())
}

// Отправляет разделы в облако. Обновляются только переданные столбцы строки.
async function pushToCloud(
  ids: SectionId[],
  local: Sections,
  row: RemoteRow | null,
  meta: SyncMeta,
  userId: string,
) {
  if (!supabase) return
  const now = new Date().toISOString()
  const payload: Record<string, unknown> = { user_id: userId }
  const stamps: Partial<Record<SectionId, string>> = {}
  for (const id of ids) {
    const hash = hashOf(local[id])
    stamps[id] = pushAt(localAt(meta, id, hash, now), remoteAt(row, id))
    payload[id] = local[id]
    payload[`${id}_updated_at`] = stamps[id]
  }
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'user_id' })
  if (error) throw error
  for (const id of ids) {
    const hash = hashOf(local[id])
    meta.synced[id] = { hash, updatedAt: stamps[id]! }
    if (meta.touched[id]?.hash === hash) delete meta.touched[id]
  }
  saveSyncMeta(meta)
}

// Первый вход с этого устройства в этот аккаунт:
//   в облаке пусто               → загрузить туда данные с устройства;
//   на устройстве пусто          → взять данные из облака;
//   данные одинаковые            → просто запомнить, что всё синхронизировано;
//   данные есть и там, и там     → спросить, какие оставить (true — спросили, ждём ответа).
async function firstSync(userId: string, row: RemoteRow | null, local: Sections, meta: SyncMeta): Promise<boolean> {
  if (isRemoteEmpty(row)) {
    await adopt('local', userId, row, local, meta)
    return false
  }
  const present = SECTION_IDS.filter((id) => remoteAt(row, id) !== null)
  const remote = parseRemoteSections(Object.fromEntries(present.map((id) => [id, row?.[id]])))
  const same = present.every((id) => hashOf(remote[id]) === hashOf(local[id]))
  if (!hasData(local) || same) {
    await adopt('cloud', userId, row, local, meta)
    return false
  }
  pendingChoice = { userId, row }
  setState({ status: 'choice', choice: { local: describe(local), remote: describe(remote) } })
  return true
}

// Оставить данные из облака ('cloud') или с этого устройства ('local').
async function adopt(keep: 'cloud' | 'local', userId: string, row: RemoteRow | null, local: Sections, meta: SyncMeta) {
  meta.synced = {}
  meta.touched = {}
  const inCloud = SECTION_IDS.filter((id) => remoteAt(row, id) !== null)
  if (keep === 'cloud' && inCloud.length > 0) {
    applyFromCloud(inCloud, row, meta)
    local = readLocalSections()
  }
  // Устройство побеждает — отправляем всё; облако побеждает — только то, чего в облаке нет.
  const push = keep === 'local' ? [...SECTION_IDS] : SECTION_IDS.filter((id) => !inCloud.includes(id))
  if (push.length > 0) await pushToCloud(push, local, row, meta, userId)
  meta.userId = userId
  saveSyncMeta(meta)
}

// Ответ на вопрос «какие данные оставить».
export async function resolveChoice(keep: 'cloud' | 'local'): Promise<void> {
  const pending = pendingChoice
  if (!pending || !session || session.user.id !== pending.userId) return
  running = true
  setState({ status: 'syncing', choice: null })
  try {
    await adopt(keep, pending.userId, pending.row, readLocalSections(), loadSyncMeta())
    pendingChoice = null
    setState({ status: 'synced', lastSyncedAt: new Date().toISOString(), error: null })
  } catch (error) {
    setState({ status: 'error', error: errorText(error) })
    pendingChoice = null // спросим заново при следующей синхронизации
  } finally {
    running = false
  }
  // Пока ждали ответа, могли что-то поменять — догоняем.
  void syncNow()
}
