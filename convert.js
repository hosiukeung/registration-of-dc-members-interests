const fs = require('fs')
const { execSync } = require('child_process')

const fileNames = fs.readdirSync('data/intermediate/pdf').filter(fileName => fileName.endsWith('.pdf'))

// const fileNames = [
//   'lee_wai_keung_20160229_text.pdf'
// ];

// execute synchronously
fileNames.forEach(f => {
  try {
    // https://github.com/tabulapdf/tabula-java#usage-examples
    // const command = `java -jar bin/tabula-1.0.3-jar-with-dependencies.jar -d -g -p=all -o ./data/intermediate/csv/${f}.csv ./data/intermediate/pdf/${f}`
    const command = `java -jar bin/tabula-1.0.3-jar-with-dependencies.jar -d -g -l -p=all -o ./data/intermediate/csv/${f}.csv ./data/intermediate/pdf/${f}`

    console.log(command)
    const stdout = execSync(command)
  } catch (err) {
    console.error(`Error: ${err}`)
  }
})
