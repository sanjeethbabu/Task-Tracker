const ExcelJS = require('exceljs);
const path = require('path');
const fs = require('fs');

const EXCEL_FILE = path.join(__dirname, '..', 'tasks.xlsx');

async function checkExcel() {
    console.log('Excel file exists:', fs.existsSync(EXCEL_FILE));
    if (!fs.existsSync(EXCEL_FILE)) return;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);

    console.log('Sheets in workbook:', workbook.worksheets.map(s => s.name));

    const tasksSheet = workbook.getWorksheet('Tasks');
    if (tasksSheet) {
        console.log('\n--- Tasks Sheet Rows ---');
        console.log('Row count:', tasksSheet.rowCount);
        tasksSheet.eachRow((row, rowNumber) => {
            console.log(`Row ${rowNumber}:`, {
                col1: row.getCell(1).value,
                col2: row.getCell(2).value,
                col3: row.getCell(3).value,
                col4: row.getCell(4).value
            });
        });
    }

    const historySheet = workbook.getWorksheet('TaskHistory');
    if (historySheet) {
        console.log('\n--- TaskHistory Sheet Rows ---');
        console.log('Row count:', historySheet.rowCount);
        historySheet.eachRow((row, rowNumber) => {
            console.log(`Row ${rowNumber}:`, {
                col1: row.getCell(1).value,
                col2: row.getCell(2).value,
                col3: row.getCell(3).value,
                col4: row.getCell(4).value,
                col5: row.getCell(5).value
            });
        });
    }
}

checkExcel().catch(console.error);
