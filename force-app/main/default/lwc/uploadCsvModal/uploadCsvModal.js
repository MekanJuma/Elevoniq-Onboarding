import { LightningElement } from 'lwc';
import sampleCsv from '@salesforce/resourceUrl/SampleUpload';

export default class UploadCsvModal extends LightningElement {


    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;
    
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result;
            const separator = this.detectSeparator(content);
            const jsonData = this.parseCsv(content, separator);
    
            this.dispatchEvent(new CustomEvent('upload', {
                detail: {
                    fileName: file.name,
                    fileContent: jsonData
                },
                bubbles: true,
                composed: true
            }));
        };
        reader.readAsText(file);
    }
    

    handleDownloadSample() {
        const link = document.createElement('a');
        link.href = sampleCsv;
        link.download = 'SampleUpload.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    detectSeparator(content) {
        const firstLine = content.split(/\r\n|\n/)[0];
        const candidates = [',', ';', '\t', '|'];
        let maxCount = 0;
        let detected = ',';
    
        candidates.forEach(sep => {
            const count = firstLine.split(sep).length;
            if (count > maxCount) {
                maxCount = count;
                detected = sep;
            }
        });
    
        return detected;
    }

    parseCsv(content, separator) {
        const rows = [];
        const regex = new RegExp(
            `\\s*(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^\"${separator}\\r\\n]*))\\s*(?:${separator}|\\r?\\n|$)`,
            'gy'
        );
    
        const headers = [];
        let match;
        let pos = 0;
    
        // Parse header
        regex.lastIndex = pos;
        while ((match = regex.exec(content))) {
            if (match[1] !== undefined) {
                headers.push(match[1].replace(/""/g, '"'));
            } else {
                headers.push(match[2]);
            }
            if (content[regex.lastIndex - 1] === '\n' || content[regex.lastIndex - 1] === '\r') {
                break;
            }
        }
    
        // Parse rows
        const numColumns = headers.length;
        const row = [];
        while (regex.lastIndex < content.length) {
            for (let col = 0; col < numColumns; col++) {
                match = regex.exec(content);
                if (!match) break;
    
                let value = '';
                if (match[1] !== undefined) {
                    value = match[1].replace(/""/g, '"');
                } else {
                    value = match[2];
                }
                row.push(value);
    
                const nextChar = content[regex.lastIndex - 1];
                if (nextChar === '\n' || nextChar === '\r' || regex.lastIndex >= content.length) {
                    break;
                }
            }
    
            if (row.length === numColumns) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                rows.push(obj);
            }
    
            row.length = 0;
        }
    
        return rows;
    }
    

}