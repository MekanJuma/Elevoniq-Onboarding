import { LightningElement, api, track } from 'lwc';

export default class OnboardingStep extends LightningElement {
    @api title;
    @api icon;
    @api tasks;
    @api step;

    handleTaskComplete(event) {
        const taskId = event.target.dataset.taskId;
        const taskName = event.target.closest('.task-item').querySelector('.task-name').textContent;

        const taskCompleteEvent = new CustomEvent('taskcomplete', {
            detail: {
                taskId: taskId,
                taskName: taskName,
                step: this.step
            }
        });
        this.dispatchEvent(taskCompleteEvent);
    }

    

    
}