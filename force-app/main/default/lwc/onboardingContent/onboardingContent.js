import { LightningElement, api, track } from 'lwc';

export default class OnboardingContent extends LightningElement {
    @api userData = {};
    @track currentStepIndex = 0;
    @track steps = [
        {
            id: 'property',
            number: 1,
            label: 'Property Info',
            description: 'Get started with the property details',
            isCompleted: false
        },
        {
            id: 'units',
            number: 2,
            label: 'Property Units',
            description: 'Fill in the property units',
            isCompleted: false
        },
        {
            id: 'elevators',
            number: 3,
            label: 'Elevators',
            description: 'Let’s register the elevators',
            isCompleted: false
        },
        {
            id: 'orders',
            number: 4,
            label: 'Orders & Invoicing',
            description: 'Let’s connect elevators to orders',
            isCompleted: false
        }
    ];

    connectedCallback() {
        this.updateStepClasses();
    }

    updateStepClasses() {
        this.steps = this.steps.map((step, index) => {
            const isActive = index === this.currentStepIndex;
            const isPast = index < this.currentStepIndex;
            
            return {
                ...step,
                isCompleted: isPast,
                containerClass: `step-container ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`,
                circleClass: `step-circle ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`,
                lineClass: `step-line ${isPast ? 'completed' : ''}`,
                isLast: index === this.steps.length - 1
            };
        });
    }

    get isWelcomeStep() {
        return this.currentStepIndex === 0;
    }

    get currentStep() {
        return this.steps[this.currentStepIndex];
    }

    get showBackButton() {
        return this.currentStepIndex > 0;
    }

    get nextButtonLabel() {
        return this.currentStepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
    }

    handleGetStarted() {
        this.navigateToStep(1);
    }

    handleNext() {
        if (this.validateCurrentStep()) {
            if (this.currentStepIndex < this.steps.length - 1) {
                this.navigateToStep(this.currentStepIndex + 1);
            } else {
                this.handleFinish();
            }
        }
    }

    handleBack() {
        if (this.currentStepIndex > 0) {
            this.navigateToStep(this.currentStepIndex - 1);
        }
    }

    navigateToStep(index) {
        this.currentStepIndex = index;
        this.updateStepClasses();
        this.dispatchEvent(new CustomEvent('stepchange', {
            detail: {
                stepId: this.currentStep.id,
                stepIndex: this.currentStepIndex
            }
        }));
    }

    validateCurrentStep() {
        // This will be implemented for each step's specific validation
        return true;
    }

    handleFinish() {
        // Dispatch event to parent component to handle completion
        this.dispatchEvent(new CustomEvent('complete', {
            detail: {
                steps: this.steps
            }
        }));
    }
} 