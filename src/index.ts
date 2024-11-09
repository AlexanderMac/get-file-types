import * as fileType from 'file-type'
import * as fs from 'fs'
import { glob } from 'glob'

const CHUNK_SIZE = 100

type FileProp = {
  mime: string
  path: string
}
;(async function main(): Promise<void> {
  try {
    const dir = _argv('dir') as string
    if (!dir) {
      throw new Error('dir arg must be provided')
    }

    const filePaths = await _getFilePaths(dir)
    const fileProps = await _getFileProps(dir, filePaths)
    await _generateReport(dir, fileProps)
    console.log('Done!')
  } catch (err) {
    console.log(err)
  }
})()

async function _getFilePaths(dir: string): Promise<string[]> {
  const filePaths = await _scanDir('**/*', dir)
  const filePathChunks = _arrayToChunks(filePaths, CHUNK_SIZE)
  const result: string[] = []

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < filePathChunks.length; i++) {
    const ops = filePathChunks[i].map(async filePath => {
      const fileStat = await fs.promises.stat(filePath)
      if (fileStat.isFile()) {
        result.push(filePath)
      }
    })
    await Promise.all(ops)
  }

  return result
}

async function _getFileProps(dir: string, filePaths: string[]): Promise<FileProp[]> {
  const filePathChunks = _arrayToChunks(filePaths, CHUNK_SIZE)
  const result: FileProp[] = []

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < filePathChunks.length; i++) {
    const ops = filePathChunks[i].map(async filePath => {
      const fileProp = {
        mime: (await fileType.fromFile(filePath))?.mime ?? 'unknown',
        path: filePath,
      }
      result.push(fileProp)
    })
    await Promise.all(ops)
  }

  return result
}

async function _generateReport(dir: string, fileProps: FileProp[]): Promise<void> {
  let currentMime = ''
  const buffer: string[] = [`dir=${dir}`]
  fileProps
    .sort((a, b) => (a.mime > b.mime ? 1 : -1))
    .forEach(fileProp => {
      if (fileProp.mime !== currentMime) {
        currentMime = fileProp.mime
        buffer.push(`\n${currentMime}`)
      }
      buffer.push(`- ${fileProp.path}`)
    })

  await fs.promises.writeFile('report.txt', buffer.join('\n'))
}

function _argv(key: string): unknown {
  if (process.argv.includes(`--${key}`)) {
    return true
  }

  const value = process.argv.find(element => element.startsWith(`--${key}=`))
  return value ? value.replace(`--${key}=`, '') : null
}

function _scanDir(pattern: string, dir: string): Promise<string[]> {
  return glob(pattern, {
    cwd: dir,
    absolute: true,
    dot: true,
    ignore: 'node_modules/**',
  })
}

function _arrayToChunks<T>(arr: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    result.push(chunk)
  }
  return result
}
