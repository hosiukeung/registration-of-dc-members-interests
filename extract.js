const fs = require('fs')
const _ = require('lodash')
const DiffMatchPatch = require('diff-match-patch')
const { Parser } = require('json2csv')
const stringSimilarity = require('string-similarity')


// --------------------------------------------------

const getInputCsvFilePath = fileName => `data/input/csv/${fileName}`

const getIntermediateCsvFilePath =
  fileName => `data/intermediate/csv/${fileName}`

const getOutputCsvFilePath = fileName => `data/output/csv/${fileName}`

// TODO Add yes/no checkbox extraction
const labels = [
  // Question Group #1
  '你有否擔任公共或私營公司的受薪東主、合夥人或董事職位，包括所有獲得薪金、酬金、津貼或其他實惠的東主、合夥人或董事職位?',
  '如你在本屆任期內終止擔任任何已登記公司的受薪東主、合夥人或董事職位，請在下表列出詳細資料。',

  // Question Group #2
  '你有否從事受薪的工作，包括所有獲得薪金、酬金、津貼或其他實惠的工作、職位、行業或專業(區會議員一職除外)?',
  '如你在本屆任期內終止從事任何已登記的受薪工作、職位、行業或專業，請在下表列出詳細資料。',

  // Question Group #3
  '你(本人或連同配偶或未成年子女，或本人代表其配偶或未成年子女)有否持有任何在香港註冊登記的公司或其他團體的股份的實益權益，而該等股份的數目超過該公司或團體已發行股份總數的百分之一?',
  '如你在本屆任期內終止擁有或持有任何已登記公司或團體的股份，請在下表列出詳細資料。',

  // Question Group #4
  '作為議員/委員會成員時，你或你的配偶有否由於你是議員/委員會成員的關係，曾收受來自任何人士或組織的財政贊助(須說明該項贊助是否包括以直接或間接方式付予該議員/委員會成員或其配偶的款項，或給予該議員/委員會成員或其配偶的實惠或實利)',

  // Question Group #5
  '作為議員/委員會成員時，你或你的配偶有否由於你是議員/委員會成員身分有關或由該身分，到香港以外訪問或旅遊，而該次訪問或旅遊的費用並非全數由該議員/委員會成員或公費支付(須說明該項/委員會成員或其配偶的款項，或給予該議員/委員會成員或其配偶的實惠或實利)?',

  // Question Group #6
  '你在香港是否直接或間接地擁有土地或物業?',

  // Question Group #7
  '你有否以議員/委員會成員身分或以任何方式與該身分有關而向客戶提供個人服務，並因此收受該客戶付予的薪金、酬金、津貼或其他實惠?',
  '如你在本屆任期內終止了任何在此類別下的已登記的工作，請在下表列出詳細資料。',

  // Question Group #8
  '根據登記個人利益須知所述的目的及兩層申報利益制度指引(附錄V)所述的原則，如你認為仍有一些個人利益應予公開，但這些利益並不在上述七類利益之內，請在下面提供有關詳情。',
]

const minSimilarityPercent = 0.8

// --------------------------------------------------

// Generate diff
// const baseCsv = fs.readFileSync(getInputCsvFilePath('base.pdf.csv'), 'utf8')
const baseCsv = fs.readFileSync(getInputCsvFilePath('base_lattice_mode.pdf.csv'), 'utf8')

// Filter out files which are not based on the same form
const isComparable = (fileName) => {
  const targetCsv = fs.readFileSync(getIntermediateCsvFilePath(`${fileName}`),
    'utf8')

  const stat = fs.statSync(getIntermediateCsvFilePath(`${fileName}`))

  if (stat.size === 0) {
    console.log(`[Skip] ${fileName} is not comparable since it is empty`)
    return false
  }

  const dmp = new DiffMatchPatch()
  const rawDiffs = dmp.diff_main(baseCsv, targetCsv)
  const similarity = dmp.diff_levenshtein(rawDiffs)
  const totalLength = rawDiffs.reduce((length, diff) => {
    return length + diff[1].length
  }, 0)

  // console.log(`similarity ${similarity} length ${totalLength}`)

  const similarityPercent = (totalLength - similarity) / totalLength;

  const isComparable =  similarityPercent > minSimilarityPercent

  if (isComparable) {
    console.log(`[OK] ${fileName} is comparable with similarity ${similarityPercent}`)
  } else {
    console.log(`[Skip] ${fileName} is not comparable with similarity ${similarityPercent}`)
  }

  return isComparable
}

// Extract data from csv
const extractCsv = (labels, fileName) => {
  // const newlineRegex = /[\n\r]+/g
  const redundantCharactersRegex = /[\n\r\s",，、(NIL)()]+/g

  const targetCsv = fs.readFileSync(getIntermediateCsvFilePath(`${fileName}`),
    'utf8')

  const dmp = new DiffMatchPatch()
  const rawDiffs = dmp.diff_main(baseCsv, targetCsv)
  // dmp.diff_cleanupSemantic(rawDiffs)

  const cleanedDiffs = rawDiffs.map(diff => {
    // Only clean up value if it is an addition in diff
    return diff[0] <= 0 ? [diff[0], diff[1].replace(redundantCharactersRegex, '')] : diff
  })

  const additionsWithPositions = rawDiffs.map((diff, i) => {
    // Only keep non-empty additions
    if (diff[0] > 0 && diff[1].replace(redundantCharactersRegex, '') !== '') {
      return {
        position: i,
        value: diff[1],
      }
    } else {
      return null
    }
  }).filter(diff => diff !== null)

  const additionsWithMatchedLabels = additionsWithPositions.map(addition => {
    // For every addition, only search from the beginning until the position of additions
    const slicedDiff = cleanedDiffs.slice(0, addition.position)

    // Search based on every label (question)
    const labelIndex = _.findLastIndex(labels, label => {
      // Try to match each addition with the closet label (question)
      return _.findLast(slicedDiff, diff => {
        // Check to see if there is a similarity
        // TODO Use something other than includes() for better matching
        // return diff[1].includes(label.replace(redundantCharactersRegex, ''))
        return stringSimilarity.compareTwoStrings(diff[1], label.replace(redundantCharactersRegex, '')) > 0.7
      }) !== undefined
    })

    return {
      labelIndex: labelIndex ? labelIndex : null,
      label: labelIndex ? labels[labelIndex] : null,
      ...addition,
    }
  })

  // Group multiple answers to one question
  // TODO Will attempt to match each answer to sub-questions later
  const groupedAdditions = _.groupBy(additionsWithMatchedLabels,
    r => r.labelIndex)

  // Merge multiple answers under the same question
  // TODO Will attempt to match each answer to sub-questions later
  const results = _.map(groupedAdditions, (value, key) => {
    return _.reduce(value, (reducedValue, d) => {
      return reducedValue ? {
        ...reducedValue,
        value: reducedValue.value + '\n' + d.value,
      } : d
    }, null)
  })

  // console.log(results)

  return results
}

const run = (labels, fileNames, outputFilePath) => {
  const csvHeader = ['File'].concat(labels)

  const comparableFileNames = fileNames.filter(f => isComparable(f))

  console.log(
    `${comparableFileNames.length} out of ${fileNames.length} are comparable, with similarity > ${minSimilarityPercent}`)

  const csvLines = comparableFileNames.map(fileName => {
    const extractedCsv = extractCsv(labels, fileName)

    const results = extractedCsv.filter(r => r.labelIndex !== null)
    const csvLine = _.reduce(results, (result, value) => {
      return {
        'File': fileName,
        ...result,
        [labels[value.labelIndex]]: value.value,
      }
    }, {})
    return csvLine
  })

  const json2csvParser = new Parser({ fields: csvHeader })
  const csv = json2csvParser.parse(csvLines)

  fs.writeFileSync(outputFilePath, csv)
}

// --------------------------------------------------

// const fileNames = fs.readFileSync('data/intermediate/specific-pdf.txt', 'utf8').
//   toString().
//   trim().
//   split('\n')

// const fileNames = [
//   'lee_wai_keung_20160229_text.pdf.csv'
// ];

const fileNames = fs.readdirSync('data/intermediate/csv').filter(fileName => fileName.endsWith('.csv'))

// --------------------------------------------------

run(labels, fileNames, getOutputCsvFilePath('results.csv'))
