# Registration of DC Member's Interests

## Data source

https://www.districtcouncils.gov.hk/central/english/members/reg_member_interest/reg_interests.php

## Extraction of documents

Extraction done by other projects and put in `data/input/`

## Downloading documents

Run `node download.js` to download from `data/input/csv/` and save PDF files in `data/intermediate/pdf/`

## Convert PDF to csv

Run `node convert.js` to parse PDF files from `data/intermediate/pdf/` and save in `data/intermediate/csv/`

## Extract data from csv

Run `node extract.js` to extract data from CSV files from `data/intermediate/csv/` and save in `data/output/csv/`
