import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import { hash, verify } from '@node-rs/argon2'

const ARGON2_OPTIONS = { memoryCost: 65536, timeCost: 3, parallelism: 1 }
const FAST_OPTIONS   = { memoryCost: 19456, timeCost: 2, parallelism: 1 }

// Worker side — runs in the spawned thread
if (!isMainThread && parentPort) {
  parentPort.once('message', async (msg: { op: string; input: string; hash?: string }) => {
    try {
      let result: string | boolean
      if (msg.op === 'hash')          result = await hash(msg.input, ARGON2_OPTIONS)
      else if (msg.op === 'hashCode') result = await hash(msg.input, FAST_OPTIONS)
      else if (msg.op === 'verify')   result = await verify(msg.hash!, msg.input)
      else if (msg.op === 'verifyCode') result = await verify(msg.hash!, msg.input)
      else result = false
      parentPort!.postMessage({ ok: true, result })
    } catch (err) {
      parentPort!.postMessage({ ok: false, error: String(err) })
    }
  })
}

// Main thread — spawns a worker for each call
function runInWorker(msg: Record<string, unknown>): Promise<string | boolean> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: null })
    worker.once('message', (res: { ok: boolean; result?: string | boolean; error?: string }) => {
      if (res.ok) resolve(res.result!)
      else reject(new Error(res.error))
      worker.terminate()
    })
    worker.once('error', (e) => { reject(e); worker.terminate() })
    worker.postMessage(msg)
  })
}

export async function hashPassword(password: string): Promise<string> {
  return runInWorker({ op: 'hash', input: password }) as Promise<string>
}
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  return runInWorker({ op: 'verify', input: password, hash: stored }) as Promise<boolean>
}
export async function hashCode(code: string): Promise<string> {
  return runInWorker({ op: 'hashCode', input: code }) as Promise<string>
}
export async function verifyCode(stored: string, code: string): Promise<boolean> {
  return runInWorker({ op: 'verifyCode', input: code, hash: stored }) as Promise<boolean>
}
