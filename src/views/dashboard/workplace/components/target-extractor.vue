<template>
    <div class="target-extractor">
        <a-card :title="$t('workplace.targetExtractor.title')">
            <a-alert v-if="!stitchedImage" type="info"
                :content="$t('workplace.targetExtractor.noStitchedImageAlert')" />

            <div v-if="stitchedImage" class="extraction-container">
                <a-spin :loading="isProcessing">
                    <a-space direction="vertical" fill>
                        <div class="image-ready-container">
                            <div class="image-preview">
                                <img :src="stitchedImage" class="thumbnail" alt="Image ready for extraction" />
                            </div>
                            <div class="status-message">
                                <a-tag color="green">
                                    <template #icon><icon-check-circle-fill /></template>
                                    {{ $t('workplace.targetExtractor.readyForExtraction') }}
                                </a-tag>
                            </div>
                        </div>

                        <!-- Processing options panel -->
                        <div class="processing-options-panel">
                            <a-form :model="processingOptions" layout="vertical" size="small">
                                <a-row :gutter="16">
                                    <a-col :span="12">
                                        <a-form-item :label="$t('workplace.targetExtractor.imageType')" field="imageType">
                                            <a-select v-model="processingOptions.imageType">
                                                <a-option value="ground">{{ $t('workplace.targetExtractor.ground') }}</a-option>
                                                <a-option value="drone">{{ $t('workplace.targetExtractor.drone') }}</a-option>
                                            </a-select>
                                        </a-form-item>
                                    </a-col>
                                    <a-col :span="12">
                                        <a-form-item :label="$t('workplace.targetExtractor.extractionType')" field="extractionType">
                                            <a-select v-model="processingOptions.extractionType">
                                                <a-option value="objects">{{ $t('workplace.targetExtractor.objects') }}</a-option>
                                                <a-option value="features">{{ $t('workplace.targetExtractor.features') }}</a-option>
                                            </a-select>
                                        </a-form-item>
                                    </a-col>
                                </a-row>
                            </a-form>
                        </div>

                        <div class="action-button-container">
                            <a-button 
                                type="primary" 
                                status="success" 
                                size="large"
                                @click="startExtraction" 
                                :disabled="isProcessing"
                                :loading="isProcessing"
                                long
                            >
                                <template #icon>
                                    <icon-select-all />
                                </template>
                                {{ $t('workplace.targetExtractor.startExtraction') }}
                            </a-button>
                        </div>

                        <div v-if="extractedTargets.length > 0" class="results-container">
                            <div class="results-title">
                                <icon-check-circle-fill style="color: rgb(var(--green-6)); margin-right: 8px;" />
                                {{ $t('workplace.targetExtractor.extractedTargets') }}
                            </div>

                            <a-grid :cols="3" :col-gap="16" :row-gap="16">
                                <a-grid-item v-for="(target, index) in extractedTargets" :key="index"
                                    class="target-item">
                                    <a-card hoverable class="target-card">
                                        <img :src="target" class="target-image" :alt="`Target ${index + 1}`" @click="openEnlargedView(target)" />
                                        <div class="target-info">
                                            <a-space>
                                                <a-tag size="small">
                                                    {{ $t('workplace.targetExtractor.target') }} {{ index + 1 }}
                                                </a-tag>
                                                <a-button size="mini" @click="openEnlargedView(target)">
                                                    <template #icon><icon-fullscreen /></template>
                                                </a-button>
                                                <a-button size="mini" @click="downloadImage(target, `target-${index + 1}`)">
                                                    <template #icon><icon-download /></template>
                                                </a-button>
                                            </a-space>
                                        </div>
                                    </a-card>
                                </a-grid-item>
                            </a-grid>
                        </div>
                    </a-space>
                </a-spin>
            </div>
        </a-card>
        
        <!-- Enlarged image modal -->
        <a-modal
            v-model:visible="enlargedViewVisible"
            :title="$t('workplace.targetExtractor.enlargedView')"
            :footer="false"
            :mask-closable="true"
            :unmount-on-close="true"
            :width="1000"
            :top="50"
        >
            <div class="enlarged-image-container">
                <img 
                    :src="selectedImageForEnlarged" 
                    class="enlarged-image" 
                    alt="Enlarged Target"
                />
            </div>
            <div class="modal-footer">
                <a-button type="primary" @click="downloadImage(selectedImageForEnlarged, 'target-image')">
                    <template #icon><icon-download /></template>
                    {{ $t('workplace.targetExtractor.download') }}
                </a-button>
            </div>
        </a-modal>
    </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, defineEmits, watch, reactive } from 'vue';
import { Message } from '@arco-design/web-vue';
import axios from 'axios';
import { useI18n } from 'vue-i18n';
import { getBaseURL } from '@/utils/env'; // Import the getBaseURL function

const { t: $t } = useI18n();
const baseURL = getBaseURL(); // Get the base API URL from environment configuration

const props = defineProps<{
    stitchedImage: string;
    resultPath?: string;
    stitcherTaskName?: string;
    uploadTaskName?: string;
    isCropped?: boolean;
}>();

const emit = defineEmits<{
    (e: 'extractionCompleted', targets: string[]): void;
}>();

// Processing options
const processingOptions = reactive({
    imageType: 'ground', // Default to ground (handheld) images
    extractionType: 'objects' // Default extraction type
});

const isProcessing = ref(false);
const extractedTargets = ref<string[]>([]);
const pollingInterval = ref<number | null>(null);
const extractionTaskName = ref('');

// For image enlargement and download
const enlargedViewVisible = ref(false);
const selectedImageForEnlarged = ref('');

// Watch for changes in stitchedImage prop
watch(() => props.stitchedImage, (newStitchedImage) => {
    if (!newStitchedImage) {
        extractedTargets.value = [];
    }
});

// Function to get task status by name
const getTaskByName = async (taskName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${baseURL}/task/by-name/${taskName}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data[0];
    } catch (error) {
        console.error('Error getting task by name:', error);
        throw error;
    }
};

// Start polling for task status updates
const startPollingTaskStatus = async () => {
    if (pollingInterval.value) clearInterval(pollingInterval.value);
    
    pollingInterval.value = window.setInterval(async () => {
        try {
            if (!extractionTaskName.value) {
                clearInterval(pollingInterval.value as number);
                return;
            }
            
            const taskResponse = await getTaskByName(extractionTaskName.value);
            if (taskResponse) {
                // Check if task has completed
                if (taskResponse.task_status === 'Completed') {
                    // Get the result image URL from the task data
                    try {
                        const resultData = taskResponse.task_data_result 
                            ? JSON.parse(taskResponse.task_data_result)[0]
                            : null;
                        
                        console.log('Extracted target result:', resultData);
                        
                        // Handle the single result URL
                        if (resultData && resultData.result_url) {
                            // Store the URL in an array to maintain compatibility with the rest of the code
                            extractedTargets.value = [resultData.result_url];
                            emit('extractionCompleted', extractedTargets.value);
                            Message.success($t('workplace.targetExtractor.extractionSuccess'));
                            clearInterval(pollingInterval.value as number);
                            isProcessing.value = false;
                        } else {
                            Message.warning($t('workplace.targetExtractor.noTargetsFound'));
                            clearInterval(pollingInterval.value as number);
                            isProcessing.value = false;
                        }
                    } catch (e) {
                        console.error('Error parsing task result:', e);
                        clearInterval(pollingInterval.value as number);
                        isProcessing.value = false;
                    }
                } else if (taskResponse.task_status === 'failed') {
                    Message.error($t('workplace.targetExtractor.extractionFailed'));
                    clearInterval(pollingInterval.value as number);
                    isProcessing.value = false;
                }
            }
        } catch (error) {
            console.error('Error polling task status:', error);
            clearInterval(pollingInterval.value as number);
            isProcessing.value = false;
        }
    }, 2000); // Poll every 2 seconds
};

// Upload a cropped image if needed
const uploadCroppedImage = async () => {
    try {
        const token = localStorage.getItem('token');
        
        // Create formData for image upload
        const formData = new FormData();
        
        // Convert base64/URL image to blob
        const response = await fetch(props.stitchedImage);
        const blob = await response.blob();
        const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
        
        formData.append('file', file);
        
        // Upload the cropped image
        const uploadResponse = await axios.post(`${baseURL}/upload/image`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (uploadResponse.data && uploadResponse.data[0].path) {
            return uploadResponse.data[0].path;
        } 
        throw new Error($t('workplace.targetExtractor.failedToGetPath'));
        
    } catch (error) {
        console.error('Error uploading cropped image:', error);
        throw error;
    }
};

const startExtraction = async () => {
    if (!props.stitchedImage) {
        Message.warning($t('workplace.targetExtractor.noStitchedImageAvailable'));
        return;
    }

    isProcessing.value = true;

    try {
        // Determine if we need to upload a cropped image first
        let imagePath =  props.resultPath;
        
        if (props.isCropped) {
            imagePath = await uploadCroppedImage();
            imagePath = `uploads/${imagePath}`; // Adjust the path as needed   
        }
        
        if (!imagePath) {
            throw new Error($t('workplace.targetExtractor.noImagePathAvailable'));
        }
        
        // Call the API to extract targets
        const token = localStorage.getItem('token');
        const response = await axios.post(`${baseURL}/image-target-extractor`, 
            {
                image_paths: [imagePath],
                task_name: props.stitcherTaskName ? `extract-${props.stitcherTaskName}` : undefined,
                stitcher_event_name: props.stitcherTaskName,
                upload_event_name: props.uploadTaskName,
                algorithm_type: processingOptions.imageType,
                extraction_type: processingOptions.extractionType
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Extraction response:', response.data);
        
        if (response.data && response.status === 200) {
            // Get the extraction task name if available
            if (response.data && response.data.task_name) {
                extractionTaskName.value = response.data.task_name;
                
                Message.success($t('workplace.targetExtractor.extractionStarted'));
                startPollingTaskStatus();
            } else {
                throw new Error($t('workplace.targetExtractor.noTaskNameInResponse'));
            }
        } else {
            throw new Error(response.data?.msg || $t('workplace.targetExtractor.failedToStartExtraction'));
        }
    } catch (error: any) {
        Message.error(error.message || $t('workplace.targetExtractor.failedToExtractTargets'));
        console.error('Extraction error:', error);
        isProcessing.value = false;
    }
};

// Function to open the enlarged view of an image
const openEnlargedView = (imageUrl: string) => {
    selectedImageForEnlarged.value = imageUrl;
    enlargedViewVisible.value = true;
};

// Function to download an image
const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
        // Fetch the image as a blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Create a download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.jpg`;
        
        // Append to the body, click it, and remove it
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Message.success($t('workplace.targetExtractor.imageDownloadStarted'));
    } catch (error) {
        console.error('Error downloading image:', error);
        Message.error($t('workplace.targetExtractor.failedToDownloadImage'));
    }
};

// Add this method to handle loading stitched images directly
const loadStitchedImage = (imageUrl: string, imagePath?: string) => {
    // Clear any previous extraction results
    extractedTargets.value = [];
    
    // If we already have image extraction results, don't show them anymore as we're starting fresh
    extractionTaskName.value = '';
    
    // Check if the polling interval is active and clear it
    if (pollingInterval.value) {
        clearInterval(pollingInterval.value);
        pollingInterval.value = null;
    }
    
    Message.success($t('workplace.targetExtractor.stitchedImageLoaded'));
};

// Expose methods to parent component
defineExpose({
    loadStitchedImage
});
</script>

<style lang="less" scoped>
.target-extractor {
    margin-bottom: 20px;
}

.extraction-container {
    margin-top: 16px;
}

.image-ready-container {
    display: flex;
    align-items: center;
    background-color: var(--color-fill-2);
    border-radius: 4px;
    padding: 12px;
}

.image-preview {
    width: 80px;
    height: 60px;
    margin-right: 16px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgb(var(--gray-3));
    background-color: white;
}

.thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.status-message {
    flex: 1;
}

.processing-options-panel {
    padding: 16px;
    background-color: var(--color-fill-2);
    border-radius: 4px;
    margin: 8px 0;
}

.action-button-container {
    padding: 24px 0;
    display: flex;
    justify-content: center;
}

.results-container {
    margin-top: 16px;
    border: 1px solid rgb(var(--gray-3));
    border-radius: 4px;
    padding: 16px;
}

.results-title {
    font-weight: 500;
    margin-bottom: 16px;
    font-size: 16px;
    display: flex;
    align-items: center;
}

.target-item {
    height: 100%;
}

.target-card {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.target-image {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.2s ease;
}

.target-image:hover {
    opacity: 0.8;
}

.target-info {
    margin-top: 12px;
    display: flex;
    justify-content: center;
}

.enlarged-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-height: 70vh;
    overflow: auto;
    position: relative;
}

.enlarged-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.modal-footer {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
}
</style>
