import { LightningElement, api } from 'lwc';
import { 
    prepareProperty, 
    preparePropertyUnit,
    prepareOnSiteContacts,
    prepareOrders
} from './helper';

export default class OnboardingOverviewContent extends LightningElement {
    @api overviewData;

    get preparedOverviewData() {
        return [
            {
                title: 'Property',
                iClass: 'fas fa-building',
                class: 'card property',
                icon: {
                    iconName: 'custom:custom24',
                    size: 'small',
                    class: 'white-icon',
                },
                list: prepareProperty(this.overviewData.property)
            },
            {
                title: 'Property Unit',
                iClass: 'fas fa-home',
                class: 'card unit',
                icon: {
                    iconName: 'custom:custom107',
                    size: 'small',
                    class: 'white-icon',
                },
                list: preparePropertyUnit(this.overviewData.propertyUnit)
            },
            {
                title: 'On Site Contacts',
                iClass: 'fas fa-users',
                class: 'card contacts',
                icon: {
                    iconName: 'standard:groups',
                    size: 'small',
                    class: 'group-icon',
                },
                list: prepareOnSiteContacts(this.overviewData.onSiteContacts)
            },
            {
                title: 'Order',
                iClass: 'fas fa-clipboard-list',
                class: 'card order',
                icon: {
                    iconName: 'action:record',
                    size: 'x-small',
                    class: 'order-icon',
                },
                list: prepareOrders(this.overviewData.order)
            }
        ];
    }
}