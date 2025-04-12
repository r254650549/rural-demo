<template>
    <a-card class="user-guide panel">
        <template #title>
            <div class="card-title">
                <icon-book :style="{ color: 'rgb(var(--arcoblue-6))' }" />
                <span>{{ $t('workplace.userGuide.title') }}</span>
            </div>
        </template>

        <div class="guide-content">
            <div class="custom-steps">
                <div class="custom-step">
                    <div class="step-icon">
                        <icon-upload />
                    </div>
                    <div class="step-content">
                        <div class="step-title">{{ $t('workplace.userGuide.step1.title') }}</div>
                        <div class="step-description">{{ $t('workplace.userGuide.step1.description') }}</div>
                    </div>
                </div>
                
                <div class="custom-step">
                    <div class="step-icon">
                        <icon-apps />
                    </div>
                    <div class="step-content">
                        <div class="step-title">{{ $t('workplace.userGuide.step2.title') }}</div>
                        <div class="step-description">{{ $t('workplace.userGuide.step2.description') }}</div>
                    </div>
                </div>
                
                <div class="custom-step">
                    <div class="step-icon">
                        <icon-select-all />
                    </div>
                    <div class="step-content">
                        <div class="step-title">{{ $t('workplace.userGuide.step3.title') }}</div>
                        <div class="step-description">{{ $t('workplace.userGuide.step3.description') }}</div>
                    </div>
                </div>
            </div>

            <a-divider style="margin: 12px 0" />

            <div class="guide-tips">
                <div class="tips-title">{{ $t('workplace.userGuide.tipsTitle') }}</div>
                <div class="tips-content">
                    <div class="tip-item">
                        <icon-info-circle class="tip-icon" />
                        <span class="tip-text">{{ $t('workplace.userGuide.tip1') }}</span>
                    </div>
                    <div class="tip-item">
                        <icon-info-circle class="tip-icon" />
                        <span class="tip-text">{{ $t('workplace.userGuide.tip2') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </a-card>
</template>

<script lang="ts" setup>
// Nothing special needed for the UserGuide component
</script>

<style lang="less" scoped>
.user-guide {
    margin-bottom: 16px;
    overflow: visible;
    
    :deep(.arco-card-body) {
        padding: 16px !important;
    }
}

.card-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.guide-content {
    overflow: visible;
    width: 100%;
}

.custom-steps {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    margin-bottom: 16px;
}

.custom-step {
    display: flex;
    align-items: flex-start;
    width: 100%;
}

.step-icon {
    width: 24px;
    height: 24px;
    background-color: rgb(var(--arcoblue-1));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(var(--arcoblue-6));
    margin-right: 12px;
    flex-shrink: 0;
}

.step-content {
    flex: 1;
    min-width: 0; /* Important for text containment */
}

.step-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    color: rgb(var(--gray-10));
}

.step-description {
    font-size: 12px;
    color: rgb(var(--gray-7));
    line-height: 1.4;
    white-space: normal;
    word-break: break-word;
    width: 100%;
}

.guide-tips {
    margin-top: 6px;
}

.tips-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
}

.tips-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tip-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.tip-icon {
    color: rgb(var(--arcoblue-6));
    margin-top: 3px;
    flex-shrink: 0;
}

.tip-text {
    flex: 1;
    word-break: break-word;
    line-height: 1.4;
    font-size: 12px;
    color: rgb(var(--gray-7));
    min-width: 0; /* Important for text containment */
}
</style>
