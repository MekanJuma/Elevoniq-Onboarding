import { LightningElement, api, track } from 'lwc';

export default class CustomModal extends LightningElement {
    @api title;
    @api iconName;
    @track searchValue = '';

    @api items = [];

    get filteredItems() {
        if (!this.searchValue) return this.items;
        const keyword = this.searchValue.toLowerCase();
        return this.items.filter(
            item =>
                item.title.toLowerCase().includes(keyword) ||
                item.description.toLowerCase().includes(keyword)
        );
    }

    get selectDisabled() {
        return !this.items.some(item => item.isSelected);
    }

    handleSearchChange(event) {
        this.searchValue = event.target.value;
    }

    handleCardClick(event) {
        this.dispatchEvent(new CustomEvent('select', { detail: { id: event.currentTarget.dataset.id } }));
    }


    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleNew() {
        this.dispatchEvent(new CustomEvent('create'));
    }

    handleSelect() {
        this.dispatchEvent(new CustomEvent('selectconfirm'));
    }

}