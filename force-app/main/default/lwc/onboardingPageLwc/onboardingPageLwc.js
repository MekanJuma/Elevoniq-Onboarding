import { LightningElement, api, track } from 'lwc';
import getOnboardingData from '@salesforce/apex/OnboardingController.getOnboardingData';

export default class OnboardingPageLwc extends LightningElement {
    @api userId;
    @api contractId;
    
    @track userData = {};
    @track isLoading = true;
    @track error;
    @track errorDetails;

    parameters = {};

    // Lifecycle hook when component is inserted into the DOM
    connectedCallback() {
        this.parameters = this.getQueryParameters();
        console.log('parameters', this.parameters);
        this.userId = this.parameters.userId;
        this.contractId = this.parameters.contractId;

        if (!this.userId || !this.contractId) {
            this.error = 'Missing required URL parameters';
            this.isLoading = false;
            return;
        }

        this.loadOnboardingData();
    }

    getQueryParameters() {

        var params = {};
        var search = location.search.substring(1);

        if (search) {
            params = JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g, '":"') + '"}', (key, value) => {
                return key === "" ? value : decodeURIComponent(value)
            });
        }

        return params;
    }

    // Load data from Apex
    async loadOnboardingData() {
        try {
            this.isLoading = true;
            const result = await getOnboardingData({ 
                userId: this.userId, 
                contractId: this.contractId 
            });
            this.userData = result.user;
            this.error = undefined;
            this.errorDetails = undefined;
        } catch (error) {
            this.error = error.body?.message || 'Error loading onboarding data';
            this.errorDetails = JSON.stringify(error, null, 2);
        } finally {
            this.isLoading = false;
        }
    }

    // Handle sign out from navbar
    handleSignOut() {
        window.location.href = '/secur/logout.jsp';
    }

    // Handle error close
    handleErrorClose() {
        this.error = undefined;
        this.errorDetails = undefined;
    }

    // Computed property to check if we have error details
    get hasErrorDetails() {
        return !!this.errorDetails;
    }
}