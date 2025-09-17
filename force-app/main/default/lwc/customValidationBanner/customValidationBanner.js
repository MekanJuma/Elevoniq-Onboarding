import { LightningElement, api } from 'lwc';
import ILLUSTRATORS from '@salesforce/resourceUrl/illustrators';

/**
 * validationBanner component displays a styled validation message with an icon, title, message, and optional action button.
 * @module validationBanner
 */
export default class ValidationMessage extends LightningElement {
    /**
     * Illustrator name (e.g. 'noAccess', 'desert')
     * @type {string}
     */
    @api illustrator;

    /**
     * The title of the validation message.
     * @type {string}
     */
    @api title;

    /**
     * The main message body.
     * @type {string}
     */
    @api message;

    /**
     * Optional action object: { name: string, url: string }
     * @type {{ name: string, url: string }}
     */
    @api action;

    renderedCallback() {
        const container = this.template.querySelector('.svg-container');
        if (container && !container.hasChildNodes()) {
            const svgUrl = `${ILLUSTRATORS}/illustrators/${this.illustrator}.svg`;
            fetch(svgUrl)
                .then(res => res.text())
                .then(svgText => {
                    container.innerHTML = svgText;
                });
        }
    }

    /**
     * Handles the action button click, opening the URL in a new tab if provided.
     */
    handleActionClick() {
        if (this.action && this.action.url) {
            window.open(this.action.url, '_blank');
        }
    }
}