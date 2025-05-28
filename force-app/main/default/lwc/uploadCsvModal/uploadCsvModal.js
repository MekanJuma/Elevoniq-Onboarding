import { LightningElement } from 'lwc';
// import sampleCsv from '@salesforce/resourceUrl/sample_csv';

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
            this.dispatchEvent(new CustomEvent('upload', {
                detail: {
                    fileName: file.name,
                    fileContent: content
                },
                bubbles: true,
                composed: true
            }));
        };
        reader.readAsText(file);
    }
    


    handleDownloadSample() {
        // const link = document.createElement('a');
        // link.href = sampleCsv;
        // link.download = 'SampleUpload.csv';
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
    }
    

}