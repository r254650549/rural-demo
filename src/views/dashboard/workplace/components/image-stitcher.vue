<template>
    <div class="image-stitcher">
        <a-card :title="$t('workplace.imageStitcher.title')">
            <a-alert v-if="!images.length && !stitchedImageUrl" type="info" :content="$t('workplace.imageStitcher.noImagesAlert')" >
                {{$t('workplace.imageStitcher.noImagesAlert')}}
            </a-alert>

            <div v-if="images.length > 0 || stitchedImageUrl" class="images-preview">
                <a-spin :loading="isProcessing">
                    <a-space direction="vertical" fill>
                        <div v-if="images.length > 0" class="selected-images">
                            <div class="selected-text">
                                <a-badge :count="images.length" :dot="false" class="count-badge">
                                    <span class="count-text">{{ $t('workplace.imageStitcher.selectedImages', { count: images.length }) }}</span>
                                </a-badge>
                            </div>
                        </div>

                        <div v-if="images.length > 0 && !stitchedImageUrl" class="action-button-container">
                            <a-button 
                                type="primary" 
                                status="success" 
                                size="large"
                                @click="startStitching" 
                                :disabled="isProcessing || !uploadTaskName"
                                :loading="isProcessing"
                                long
                            >
                                <template #icon>
                                    <icon-apps />
                                </template>
                                {{ $t('workplace.imageStitcher.startStitching') }}
                            </a-button>
                        </div>

                        <div v-if="stitchedImageUrl" class="result-container">
                            <div class="result-title">
                                <icon-check-circle-fill style="color: rgb(var(--green-6)); margin-right: 8px;" />
                                {{ $t('workplace.imageStitcher.stitchedResult') }}
                            </div>
                            <div class="result-image-container">
                                <img 
                                    :src="displayImageUrl" 
                                    class="result-image" 
                                    alt="Stitched Result"
                                    @click="openEnlargedView" 
                                />
                            </div>

                            <div class="image-actions">
                                <a-space>
                                    <a-button type="primary" @click="openEnlargedView">
                                        <template #icon><icon-fullscreen /></template>
                                        {{ $t('workplace.imageStitcher.enlarge') }}
                                    </a-button>
                                    <a-button 
                                        type="outline" 
                                        status="warning"
                                        :disabled="!stitchedImageUrl || isCropping" 
                                        @click="startCropping"
                                    >
                                        <template #icon><icon-scissor /></template>
                                        {{ $t('workplace.imageStitcher.crop') }}
                                    </a-button>
                                    <a-button 
                                        v-if="isCropped" 
                                        @click="restoreOriginal"
                                    >
                                        <template #icon><icon-refresh /></template>
                                        {{ $t('workplace.imageStitcher.restore') }}
                                    </a-button>
                                </a-space>
                            </div>
                        </div>
                    </a-space>
                </a-spin>
            </div>
        </a-card>

        <!-- Enlarged image modal -->
        <a-modal
            v-model:visible="enlargedViewVisible"
            :title="$t('workplace.imageStitcher.enlargedView')"
            :footer="false"
            :mask-closable="true"
            :unmount-on-close="true"
            :width="1000"
            :top="50"
        >
            <div class="enlarged-image-container">
                <img 
                    ref="enlargedImageRef"
                    :src="displayImageUrl" 
                    class="enlarged-image" 
                    alt="Enlarged Stitched Result"
                />
            </div>
        </a-modal>

        <!-- Cropping modal -->
        <a-modal
            v-model:visible="cropModalVisible"
            :title="$t('workplace.imageStitcher.cropImage')"
            :mask-closable="false"
            :unmount-on-close="false"
            :width="1400"
            :top="20"
            :footer="false"
            class="crop-modal"
        >
            <div class="crop-container">
                <div 
                    class="crop-workspace" 
                    ref="cropWorkspace"
                >
                    <div class="crop-instructions" v-if="!cropSelectionActive">
                        <p>{{ $t('workplace.imageStitcher.cropInstructions') }}</p>
                    </div>
                    <div class="crop-canvas-container">
                        <canvas ref="cropCanvas" class="crop-canvas"></canvas>
                        <div 
                            v-if="cropSelectionActive" 
                            class="crop-selection"
                            :style="cropSelectionStyle"
                        ></div>
                    </div>
                </div>
                
                <div class="crop-actions">
                    <a-space>
                        <a-button v-if="cropSelectionActive" type="primary" @click="applyCrop">
                            {{ $t('workplace.imageStitcher.applyCrop') }}
                        </a-button>
                        <a-button @click="cancelCrop">
                            {{ $t('workplace.imageStitcher.cancelCrop') }}
                        </a-button>
                        <a-button v-if="hasUnappliedCrop" @click="resetCropSelection">
                            {{ $t('workplace.imageStitcher.resetSelection') }}
                        </a-button>
                    </a-space>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, defineEmits, watch, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { Message } from '@arco-design/web-vue';
import axios from 'axios';
import { useI18n } from 'vue-i18n'; // Import the useI18n composable
import { getBaseURL } from '@/utils/env'; // Import the getBaseURL function

const {t:$t} = useI18n(); // Use the i18n instance
const baseURL = getBaseURL(); // Get the base API URL from environment configuration

const props = defineProps<{
    images: File[];
    uploadResults?: any[];
}>();

const emit = defineEmits<{
    (e: 'stitchCompleted', resultImageUrl: string, metadata?: {
        resultPath?: string;
        stitcherTaskName?: string;
        uploadTaskName?: string;
        isCropped?: boolean;
    }): void;
    (e: 'originalImagesLoaded', originalImages: any[]): void;
}>();

const isProcessing = ref(false);
const stitchedImageUrl = ref('');
const uploadTaskName = ref('');
const stitchingTaskId = ref('');
const stitcherTaskName = ref('');
const pollingInterval = ref<number | null>(null);
const imagePaths = ref<string[]>([]);

// Added for image enlargement, cropping, and restore features
const enlargedViewVisible = ref(false);
const cropModalVisible = ref(false);
const isCropping = ref(false);
const isCropped = ref(false);
const cropCanvas = ref<HTMLCanvasElement | null>(null);
const cropWorkspace = ref<HTMLDivElement | null>(null);
const enlargedImageRef = ref<HTMLImageElement | null>(null);
const croppedImageUrl = ref('');
const originalImageUrl = ref(''); // Store original image URL before cropping
const originalCropImage = new Image();
const cropStartPos = ref({ x: 0, y: 0 });
const cropEndPos = ref({ x: 0, y: 0 });
const cropSelectionActive = ref(false);
const hasUnappliedCrop = ref(false);
const cropCanvasContext = ref<CanvasRenderingContext2D | null>(null);
const originalImageDimensions = ref({ width: 0, height: 0 }); // Additional state for tracking original image dimensions

const cropSelectionStyle = computed(() => {
    if (!cropCanvas.value) return {};
    
    const canvas = cropCanvas.value;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Convert canvas coordinates to screen coordinates for the selection box
    const left = Math.min(cropStartPos.value.x, cropEndPos.value.x) * scaleX;
    const top = Math.min(cropStartPos.value.y, cropEndPos.value.y) * scaleY;
    const width = Math.abs(cropEndPos.value.x - cropStartPos.value.x) * scaleX;
    const height = Math.abs(cropEndPos.value.y - cropStartPos.value.y) * scaleY;
    
    return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
    };
});

// Computed property to determine which image URL to display
const displayImageUrl = computed(() => {
    return croppedImageUrl.value || stitchedImageUrl.value;
});

// Watch when crop modal visibility changes
watch(() => cropModalVisible.value, (isVisible) => {
    // When the modal is closed (becomes invisible), ensure isCropping is reset
    if (!isVisible) {
        isCropping.value = false;
    }
});

// Extract task information from upload results
watch(() => props.uploadResults, (newResults) => {
    if (newResults && newResults.length > 0) {
        const result = newResults[0];        
        // Extract task name and image paths from the response
        console.log(result, newResults);
        if (result) {
            // Extract task name
            if (result.task_name) {
                uploadTaskName.value = result.task_name;
            }
            
            // Extract image paths
            if (result.data) {
                // If data is an array of image objects
                if (Array.isArray(result.data)) {
                    imagePaths.value = result.data.map((img: any) => img.path || '').filter(Boolean);
                } 
                // If data is a single image object
                else if (typeof result.data === 'object' && result.data.path) {
                    imagePaths.value = [result.data.path];
                }
                // If data contains an image_paths array
                else if (result.data.image_paths && Array.isArray(result.data.image_paths)) {
                    imagePaths.value = result.data.image_paths;
                }
            }
            
            console.log('Extracted task name:', uploadTaskName.value);
        }
    }
}, { immediate: true, deep: true });

// Watch for changes in images prop
watch(() => props.images, (newImages) => {
    if (newImages.length === 0) {
        stitchedImageUrl.value = '';
        croppedImageUrl.value = '';
        originalImageUrl.value = '';
        isCropped.value = false;
    }
}, { deep: true });

// Function to get task status by task name
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
            if (!stitcherTaskName.value) {
                clearInterval(pollingInterval.value as number);
                return;
            }
            
            const taskResponse = await getTaskByName(stitcherTaskName.value);
            if (taskResponse) {
                    // Check if task has completed
                    if (taskResponse.task_status === 'Completed') {
                        // Get the result image URL from the task data
                        try {
                            const resultData = taskResponse.task_data_result 
                                ? JSON.parse(taskResponse.task_data_result)[0] 
                                : null;
                            if (resultData && resultData.url) {
                                stitchedImageUrl.value = resultData.url;
                                
                                // Emit with additional metadata
                                emit('stitchCompleted', resultData.url, {
                                    resultPath: resultData.path || '',
                                    stitcherTaskName: stitcherTaskName.value,
                                    uploadTaskName: uploadTaskName.value,
                                    isCropped: false
                                });
                                
                                Message.success($t('message.imageStitcher.stitchSuccess'));
                                clearInterval(pollingInterval.value as number);
                                isProcessing.value = false;
                            }
                        } catch (e) {
                            console.error('Error parsing task result:', e);
                        }
                    } else if (taskResponse.task_status === 'failed') {
                        Message.error($t('message.imageStitcher.stitchFailed'));
                        clearInterval(pollingInterval.value as number);
                        isProcessing.value = false;
                    }
                
            }
        } catch (error) {
            console.error('Error polling task status:', error);
        }
    }, 2000); // Poll every 2 seconds
};

const startStitching = async () => {
    if (props.images.length === 0) {
        Message.warning($t('message.imageStitcher.noImages'));
        return;
    }

    if (!uploadTaskName.value) {
        Message.warning($t('message.imageStitcher.noTaskInfo'));
        return;
    }
    
    if (imagePaths.value.length === 0) {
        Message.warning($t('message.imageStitcher.noImagePaths'));
        return;
    }

    isProcessing.value = true;

    try {
        // Call the API to start stitching process with both task_name and image_paths
        const token = localStorage.getItem('token');
        const response = await axios.post(`${baseURL}/image-stitcher`, 
            { 
                task_name: uploadTaskName.value,
                image_paths: imagePaths.value,
                // upload_event_name: uploadTaskName.value  // Using the same name for simplicity
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Stitching response:', response.data);
        if (response.data && response.status === 200) {
            // Get the stitcher task ID if available
            if (response.data && response.data.task_id) {
                stitchingTaskId.value = response.data.task_id;
                stitcherTaskName.value = response.data.task_name || uploadTaskName.value;
            }
            
            Message.success($t('message.imageStitcher.processStarted'));
            startPollingTaskStatus();
        } else {
            throw new Error(response.data?.msg || $t('message.imageStitcher.stitchFailed'));
        }
    } catch (error: any) {
        Message.error(error.message || $t('message.imageStitcher.stitchFailed'));
        console.error('Stitching error:', error);
        isProcessing.value = false;
    }
};

const loadStitchedImage = (imageUrl: string, taskInfo: { stitcherTaskName?: string, uploadTaskName?: string, resultPath?: string, originalImages?: any[], skipEmit?: boolean }) => {
    // Set the stitched result image
    stitchedImageUrl.value = imageUrl;
    originalImageUrl.value = imageUrl; // Store as original image in case of cropping later

    // Store task names if provided
    if (taskInfo.stitcherTaskName) {
        stitcherTaskName.value = taskInfo.stitcherTaskName;
    }
    
    if (taskInfo.uploadTaskName) {
        uploadTaskName.value = taskInfo.uploadTaskName;
    }

    // Store paths if needed
    if (taskInfo.resultPath) {
        // Extract task information from the path if needed
        const pathParts = taskInfo.resultPath.split('/');
        if (pathParts.length > 0 && !stitcherTaskName.value) {
            stitcherTaskName.value = pathParts[0] || '';
        }
    }

    // Handle original images if available
    if (taskInfo.originalImages && taskInfo.originalImages.length > 0) {
        // Set image paths from original images
        imagePaths.value = taskInfo.originalImages.map((img: any) => img.path || '').filter(Boolean);
        
        // Emit event to notify parent that we have original images that should be loaded in the uploader
        emit('originalImagesLoaded', taskInfo.originalImages);
    }

    // Reset cropping state
    isCropped.value = false;
    croppedImageUrl.value = '';

    // 只在 skipEmit 不为 true 时触发事件和显示成功消息
    if (!taskInfo.skipEmit) {
        // Emit the completed event with metadata
        emit('stitchCompleted', imageUrl, {
            resultPath: taskInfo.resultPath || '',
            stitcherTaskName: stitcherTaskName.value,
            uploadTaskName: uploadTaskName.value,
            isCropped: false
        });
        
        // 只在非静默模式下显示成功消息
        Message.success($t('message.imageStitcher.imageLoaded'));
    }
};

// Set up event listeners for cropping
const setupCropEvents = () => {
    if (!cropCanvas.value) return;
    
    const canvas = cropCanvas.value;
    let isSelecting = false;
    
    const getCanvasCoordinates = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        // Calculate scale without adjusting for any zoom level (removed)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Calculate raw coordinates in canvas space
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;
        
        // Ensure coordinates are within canvas boundaries
        const x = Math.max(0, Math.min(rawX, canvas.width));
        const y = Math.max(0, Math.min(rawY, canvas.height));
        
        return { x, y };
    };
    
    const onMouseDown = (e: MouseEvent) => {
        // Only handle left-click
        if (e.button !== 0) return;
        
        const coords = getCanvasCoordinates(e);
        cropStartPos.value = coords;
        cropEndPos.value = coords;
        isSelecting = true;
        cropSelectionActive.value = true;
        hasUnappliedCrop.value = true;
        console.log('Selection started at:', coords);
    };
    
    const onMouseMove = (e: MouseEvent) => {
        if (!isSelecting) return;
        
        const coords = getCanvasCoordinates(e);
        cropEndPos.value = coords;
    };
    
    const onMouseUp = () => {
        if (isSelecting) {
            console.log('Selection completed:', {
                start: cropStartPos.value,
                end: cropEndPos.value,
                width: Math.abs(cropEndPos.value.x - cropStartPos.value.x),
                height: Math.abs(cropEndPos.value.y - cropStartPos.value.y)
            });
        }
        isSelecting = false;
    };
    
    // Add event listeners
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Clean up function to remove event listeners when component unmounts
    onUnmounted(() => {
        canvas.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    });
};

// Initialize the canvas for cropping
const initCropCanvas = () => {
    if (!cropCanvas.value || !cropWorkspace.value) return;
    
    const canvas = cropCanvas.value;
    const workspace = cropWorkspace.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    cropCanvasContext.value = ctx;
    
    // Load the image to be cropped
    originalCropImage.onload = () => {
        // Store original image dimensions for later use in cropping
        originalImageDimensions.value = {
            width: originalCropImage.width,
            height: originalCropImage.height
        };
        
        console.log('Original image dimensions:', originalImageDimensions.value);
        
        // Set canvas size based on the image and workspace
        const maxWidth = workspace.clientWidth * 0.95; // Use 95% of available width
        const maxHeight = 700; // Increased maximum height for the canvas
        
        let canvasWidth = originalCropImage.width;
        let canvasHeight = originalCropImage.height;
        
        // Calculate the display scale (how much we're scaling down for display purposes only)
        let displayScale = 1;
        
        // Scale down if necessary to fit the workspace
        if (canvasWidth > maxWidth) {
            displayScale = maxWidth / canvasWidth;
            canvasWidth = maxWidth;
            canvasHeight = originalCropImage.height * displayScale;
        }
        
        if (canvasHeight > maxHeight) {
            const heightScale = maxHeight / canvasHeight;
            displayScale *= heightScale;
            canvasHeight = maxHeight;
            canvasWidth *= heightScale;
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Draw the image on the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalCropImage, 0, 0, canvas.width, canvas.height);
        
        // Store the display scale for coordinate conversion
        canvas.dataset.displayScale = displayScale.toString();
        
        // Setup event listeners for crop selection
        setupCropEvents();
    };
    
    originalCropImage.crossOrigin = "anonymous"; // Add crossOrigin attribute to prevent tainted canvas
    // Set the source of the image
    originalCropImage.src = displayImageUrl.value;
};

// Function to open enlarged view modal
const openEnlargedView = () => {
    enlargedViewVisible.value = true;
};

// Function to start cropping process
const startCropping = async () => {
    isCropping.value = true;
    cropModalVisible.value = true;
    cropSelectionActive.value = false;
    hasUnappliedCrop.value = false;
    
    // Store the original image URL
    originalImageUrl.value = stitchedImageUrl.value;
    
    // Initialize the crop canvas on next tick
    await nextTick();
    initCropCanvas();
};

// Cancel cropping
const cancelCrop = () => {
    cropModalVisible.value = false;
    isCropping.value = false;
    cropSelectionActive.value = false;
    hasUnappliedCrop.value = false;
};

// Reset the crop selection
const resetCropSelection = () => {
    cropSelectionActive.value = false;
    hasUnappliedCrop.value = false;
    
    // Redraw the canvas to clear the selection
    if (cropCanvas.value && cropCanvasContext.value) {
        const canvas = cropCanvas.value;
        const ctx = cropCanvasContext.value;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalCropImage, 0, 0, canvas.width, canvas.height);
    }
};

// Upload the cropped image to get a proper URL
const uploadCroppedImage = async (dataUrl: string) => {
    try {
        isProcessing.value = true;
        
        // Convert data URL to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        
        // Create a file from the blob
        const fileName = `cropped-image-${Date.now()}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // Use the same task name as the original upload if available
        if (uploadTaskName.value) {
            formData.append('task_name', uploadTaskName.value);
        }
        
        // Upload the image
        const token = localStorage.getItem('token');
        const response = await axios.post(`${baseURL}/upload/images`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data && response.status === 200) {
            // Get the result data
            const resultData = response.data.data;
            
            if (resultData && resultData.url) {
                // Update with the server URL instead of data URL
                croppedImageUrl.value = resultData.url;
                
                // Store the image path for later use
                if (resultData.path) {
                    // Keep the original image paths and add the cropped one
                    // This ensures we can still use extraction features
                    const croppedImagePath = resultData.path;
                    
                    // Emit the update with the cropped image and metadata
                    emit('stitchCompleted', resultData.url, {
                        resultPath: croppedImagePath,
                        stitcherTaskName: stitcherTaskName.value,
                        uploadTaskName: uploadTaskName.value,
                        isCropped: true
                    });
                    
                    Message.success($t('message.imageStitcher.cropSuccess'));
                }
            }
        } else {
            throw new Error(response.data?.msg || 'Upload failed');
        }
    } catch (error: any) {
        console.error('Error uploading cropped image:', error);
        Message.error(error.message || $t('message.imageStitcher.uploadFailed'));
        
        // Still emit the update with the data URL as fallback
        emit('stitchCompleted', croppedImageUrl.value, {
            resultPath: '',
            stitcherTaskName: stitcherTaskName.value,
            uploadTaskName: uploadTaskName.value,
            isCropped: true
        });
    } finally {
        isProcessing.value = false;
    }
};


// Apply the crop
const applyCrop = () => {
    if (!cropCanvas.value || !cropCanvasContext.value || !cropSelectionActive.value) return;
    
    const canvas = cropCanvas.value;
    
    try {
        // Get crop dimensions in the display canvas coordinates
        const x = Math.min(cropStartPos.value.x, cropEndPos.value.x);
        const y = Math.min(cropStartPos.value.y, cropEndPos.value.y);
        const width = Math.abs(cropEndPos.value.x - cropStartPos.value.x);
        const height = Math.abs(cropEndPos.value.y - cropStartPos.value.y);
        
        // Validate crop area with more detailed feedback
        if (width < 10 || height < 10) {
            console.error('Selected area too small:', { width, height });
            Message.warning($t('message.imageStitcher.smallSelection'));
            return;
        }
        
        // Get the display scale from canvas dataset
        const displayScale = parseFloat(canvas.dataset.displayScale || "1");
        
        // Calculate the corresponding coordinates in the original image
        const originalX = x / displayScale;
        const originalY = y / displayScale;
        const originalWidth = width / displayScale;
        const originalHeight = height / displayScale;
        
        console.log("Applying crop with original dimensions:", { 
            originalX, 
            originalY, 
            originalWidth, 
            originalHeight,
            displayScale
        });
        
        // Create a high-resolution temporary canvas for the cropped image
        // Use the dimensions from the original image, not the scaled display canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
            console.error('Failed to get temporary canvas context');
            return;
        }
        
        // Draw directly from the original image to the temp canvas
        // This preserves the original resolution instead of using the scaled display canvas
        tempCtx.drawImage(
            originalCropImage, 
            originalX, originalY, originalWidth, originalHeight,  // Source coordinates from original image
            0, 0, originalWidth, originalHeight                  // Destination coordinates at full resolution
        );
        
        // Convert the canvas to a data URL with maximum quality (1.0)
        const croppedDataUrl = tempCanvas.toDataURL('image/png', 1.0);
        
        // Set the cropped image URL
        croppedImageUrl.value = croppedDataUrl;
        isCropped.value = true;
        hasUnappliedCrop.value = false;
        
        // Close the cropping modal
        cropModalVisible.value = false;
        isCropping.value = false;
        cropSelectionActive.value = false;
        
        // Upload the cropped image to server to get a proper URL instead of data URL
        uploadCroppedImage(croppedDataUrl);
    } catch (error) {
        console.error('Error applying crop:', error);
        Message.error($t('message.imageStitcher.cropFailed'));
    }
};

// Restore original image (after cropping)
const restoreOriginal = () => {
    if (originalImageUrl.value) {
        croppedImageUrl.value = '';
        isCropped.value = false;
        
        // Get the task information from the original image metadata
        const taskResponse = getTaskByName(stitcherTaskName.value).then(response => {
            if (response && response.task_data_result) {
                try {
                    const resultData = JSON.parse(response.task_data_result)[0];
                    
                    // Emit the update with the original image and metadata
                    // Including the proper resultPath which is needed for extraction
                    emit('stitchCompleted', originalImageUrl.value, {
                        resultPath: resultData.path || '',
                        stitcherTaskName: stitcherTaskName.value,
                        uploadTaskName: uploadTaskName.value,
                        isCropped: false
                    });
                    
                    Message.success($t('message.imageStitcher.restoreSuccess'));
                } catch (e) {
                    console.error('Error parsing task data during restore:', e);
                    // Fallback with minimal information
                    emit('stitchCompleted', originalImageUrl.value, {
                        resultPath: '',
                        stitcherTaskName: stitcherTaskName.value,
                        uploadTaskName: uploadTaskName.value,
                        isCropped: false
                    });
                }
            } else {
                // Fallback if task data isn't available
                emit('stitchCompleted', originalImageUrl.value, {
                    resultPath: '',
                    stitcherTaskName: stitcherTaskName.value,
                    uploadTaskName: uploadTaskName.value,
                    isCropped: false
                });
            }
        }).catch(error => {
            console.error('Error getting task data during restore:', error);
            // Fallback if there's an error fetching task data
            emit('stitchCompleted', originalImageUrl.value, {
                resultPath: '',
                stitcherTaskName: stitcherTaskName.value,
                uploadTaskName: uploadTaskName.value,
                isCropped: false
            });
        });
    }
};

defineExpose({
    loadStitchedImage,
    cancelCrop,
    applyCrop,
    resetCropSelection,
    startCropping,
    openEnlargedView,
    restoreOriginal
});

</script>

<style lang="less" scoped>
.image-stitcher {
    margin-bottom: 20px;
}

.images-preview {
    margin-top: 16px;
}

.selected-images {
    padding: 12px 16px;
    background-color: var(--color-fill-2);
    border-radius: 4px;
}

.selected-text {
    font-weight: 500;
    display: flex;
    align-items: center;
}

.count-badge {
    :deep(.arco-badge-number) {
        margin-left: 8px;
        position: relative;
        transform: none;
    }
}

.count-text {
    margin-right: 4px;
}

.action-button-container {
    padding: 24px 0;
    display: flex;
    justify-content: flex-end;
}

.result-container {
    margin-top: 16px;
    border: 1px solid rgb(var(--gray-3));
    border-radius: 4px;
    padding: 16px;
}

.result-title {
    font-weight: 500;
    margin-bottom: 16px;
    font-size: 16px;
    display: flex;
    align-items: center;
}

.result-image-container {
    display: flex;
    justify-content: center;
    background-color: var(--color-fill-1);
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    cursor: pointer;
}

.result-image {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
}

.image-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
}

.enlarged-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-height: 80vh;
    overflow: auto;
    position: relative;
}

.enlarged-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.crop-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    position: relative;
}

.crop-workspace {
    position: relative;
    width: 100%;
    background-color: var(--color-fill-1);
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 700px;
    overflow: hidden;
    user-select: none;
}

.crop-canvas-container {
    position: relative;
}

.crop-canvas {
    display: block;
    max-width: 100%;
    height: auto;
    cursor: crosshair;
    border: 1px solid rgb(var(--gray-3));
}

.crop-selection {
    position: absolute;
    border: 3px dashed rgb(var(--blue-6));
    background-color: rgba(var(--blue-1), 0.2);
    pointer-events: none;
}

.crop-instructions {
    position: absolute;
    text-align: center;
    color: rgb(var(--gray-7));
    padding: 10px;
    z-index: 2;
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 4px;
}

.crop-actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
}

.crop-modal {
    :deep(.arco-modal-body) {
        padding: 20px;
    }
}
</style>
