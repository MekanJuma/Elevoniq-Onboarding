import { LightningElement, api, track } from 'lwc';
import ElevoniqLogo from '@salesforce/resourceUrl/ElevoniqLogo2';

export default class OnboardingNavbar extends LightningElement {
    @api userData = {};
    @track isProfileMenuOpen = false;

    logoUrl = ElevoniqLogo;

    get hasUserData() {
        return this.userData && this.userData.name && this.userData.companyName;
    }

    get userInitials() {
        if (this.userData.name) {
            return this.userData.name.split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase();
        }
        return '';
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