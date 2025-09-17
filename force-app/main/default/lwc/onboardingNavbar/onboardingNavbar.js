import { LightningElement, api, track } from 'lwc';

export default class OnboardingNavbar extends LightningElement {
    @api isAnyChanged = false;
    @api userData = {};
    @api contractName;
    @track isProfileMenuOpen = false;



    get isPublishButtonDisabled() {
        return !this.isAnyChanged;
    }

    get hasUserData() {
        return this.userData && this.userData.userName && this.userData.companyName;
    }

    get userInitials() {
        if (this.userData.userName) {
            return this.userData.userName.split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase();
        }
        return '';
    }

    handlePublish() {
        this.dispatchEvent(new CustomEvent('publish'));
    }






    handleProfileClick(event) {
        event.stopPropagation();
        this.isProfileMenuOpen = !this.isProfileMenuOpen;
        
        if (this.isProfileMenuOpen) {
            window.addEventListener('click', this.handleClickOutside.bind(this));
        } else {
            window.removeEventListener('click', this.handleClickOutside.bind(this));
        }
    }

    handleClickOutside(event) {
        const profileMenu = this.template.querySelector('.user-info');
        const dropdown = this.template.querySelector('.profile-dropdown');
        
        if (profileMenu && dropdown && 
            !profileMenu.contains(event.target) && 
            !dropdown.contains(event.target)) {
            this.isProfileMenuOpen = false;
            window.removeEventListener('click', this.handleClickOutside.bind(this));
        }
    }

    handleSignIn() {
        this.dispatchEvent(new CustomEvent('signin'));
    }

    handleSignOut() {
        this.dispatchEvent(new CustomEvent('signout'));
    }

    disconnectedCallback() {
        window.removeEventListener('click', this.handleClickOutside.bind(this));
    }
}