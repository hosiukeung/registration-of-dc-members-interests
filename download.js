const fs = require('fs')
const url = require('url')
const path = require('path')

const parse = require('csv-parse/lib/sync')
const pThrottle = require('p-throttle')

const stream = require('stream')
const { promisify } = require('util')
const got = require('got')

const pipeline = promisify(stream.pipeline)

const download = async (fileUrl) => {
  const parsed = url.parse(fileUrl)
  const fileName = path.basename(parsed.pathname)

  console.log(`Saving output data/intermediate/pdf/${fileName}`)

  console.log(`Download from ${fileUrl}`)
  const file = `data/intermediate/pdf/${fileName}`

  return pipeline(
    got.stream(fileUrl),
    fs.createWriteStream(file),
  ).catch((err) => {
    console.log(`ERROR: Cleaning empty file ${file}`)
    fs.unlinkSync(file)
  })
}

const throttledDownload = pThrottle(url => {
  return download(url)
}, 5, 1000)

const run = (filePath) => {
  const input = fs.readFileSync(filePath, 'utf8').toString()

  const lines = parse(input, {
    columns: true,
    skip_empty_lines: true,
  })

  const urls = lines
    .filter(line => line.ver === '文字版本')
    .map(line => line.link.trim())

  urls.forEach(url => throttledDownload(url))
}

run(`data/input/csv/urls.csv`)
