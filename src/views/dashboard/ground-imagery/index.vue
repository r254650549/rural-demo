<template>
    <div class="container">
        <a-row :gutter="20">
            <!-- Processing section - Left side column -->
            <a-col :span="19">
                <a-card class="general-card" :title="$t('groundImagery.title')">
                    <a-tabs default-active-key="images">
                        <a-tab-pane key="images" :title="$t('groundImagery.tabs.images')">
                            <ImageUploader @images-uploaded="handleImagesUploaded" :is-ground-imagery="true" />

                            <div v-if="selectedImages.length > 0" class="processing-section">
                                <a-divider />
                                <a-row>
                                    <a-col :span="24">
                                        <a-card :title="$t('groundImagery.processingOptions')">
                                            <a-form :model="processingOptions" layout="vertical">
                                                <a-form-item :label="$t('groundImagery.options.extractionType')">
                                                    <a-select v-model="processingOptions.extractionType">
                                                        <!-- <a-option value="features">{{
                                                            $t('groundImagery.options.features') }}</a-option> -->
                                                        <a-option value="objects">{{ $t('groundImagery.options.objects')
                                                            }}</a-option>
                                                        <!-- <a-option value="segmentation">{{
                                                            $t('groundImagery.options.segmentation') }}</a-option> -->
                                                    </a-select>
                                                </a-form-item>

                                                <a-form-item :label="$t('groundImagery.options.imageType')">
                                                    <a-select v-model="processingOptions.algorithm_type">
                                                        <a-option value="ground">{{ $t('groundImagery.options.ground') }}</a-option>
                                                        <a-option value="drone">{{ $t('groundImagery.options.drone') }}</a-option>
                                                    </a-select>
                                                </a-form-item>

                                                <!-- <a-form-item :label="$t('groundImagery.options.processingQuality')">
                                                    <a-slider v-model="processingOptions.quality" :min="1" :max="10"
                                                        :step="1" />
                                                </a-form-item> -->

                                                <a-form-item>
                                                    <a-button type="primary" long @click="processImages" :loading="processingLoading" :disabled="processingLoading">
                                                        {{ $t('groundImagery.processBtn') }}
                                                    </a-button>
                                                </a-form-item>
                                            </a-form>
                                        </a-card>
                                    </a-col>
                                </a-row>
                                
                                <!-- Add processed images preview section -->
                                <div v-if="processedImages.length > 0" class="processed-images-section">
                                    <a-divider>
                                        <div class="divider-title">
                                            <icon-check-circle-fill :style="{ color: 'rgb(var(--success-6))' }" />
                                            <span>{{ $t('groundImagery.processedResults') }}</span>
                                        </div>
                                    </a-divider>
                                    
                                    <div class="processed-images-grid">
                                        <div 
                                            v-for="(image, index) in processedImages" 
                                            :key="index" 
                                            class="processed-image-item"
                                            @click="viewProcessedImage(image)"
                                        >
                                            <div class="image-container">
                                                <img :src="image.url" :alt="image.filename" />
                                                <div class="image-overlay">
                                                    <icon-eye />
                                                </div>
                                            </div>
                                            <div class="image-info">
                                                <div class="image-name" :title="image.filename">
                                                    {{ shortenFilename(image.filename) }}
                                                </div>
                                                <a-button 
                                                    type="text" 
                                                    size="small" 
                                                    @click.stop="downloadProcessedImage(image)"
                                                >
                                                    <template #icon><icon-download /></template>
                                                </a-button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </a-tab-pane>

                        <a-tab-pane key="videos" :title="$t('groundImagery.tabs.videos')">
                            <div class="video-upload-section">
                                <a-upload :file-list="videoList" :custom-request="customRequest" accept="video/*"
                                    @change="handleVideoChange">
                                    <a-button type="primary">
                                        <template #icon>
                                            <icon-upload />
                                        </template>
                                        {{ $t('groundImagery.uploadVideo') }}
                                    </a-button>
                                </a-upload>

                                <div v-if="videoList.length > 0" class="video-preview">
                                    <div class="video-controls" v-if="videoUrl">
                                        <a-button 
                                            :type="isAnnotationMode ? 'primary' : 'outline'" 
                                            @click="toggleAnnotationMode">
                                            <template #icon>
                                                <icon-edit />
                                            </template>
                                            {{ isAnnotationMode ? $t('groundImagery.finishAnnotation') : $t('groundImagery.startAnnotation') }}
                                        </a-button>
                                        <a-button 
                                            v-if="lineCoordinates.length >= 2" 
                                            type="outline" 
                                            status="danger" 
                                            @click="clearAnnotation">
                                            {{ $t('groundImagery.clearAnnotation') }}
                                        </a-button>
                                        
                                        <a-checkbox 
                                            v-model="autoExtendLine"
                                            class="extend-checkbox"
                                            @change="handleAutoExtendChange">
                                            {{ $t('groundImagery.autoExtend') }}
                                        </a-checkbox>
                                    </div>
                                    
                                    <div class="video-container" ref="videoContainerRef">
                                        <video v-if="videoUrl" ref="videoRef" controls class="preview-video" :src="videoUrl" 
                                            @loadedmetadata="handleVideoLoaded"></video>
                                        <canvas v-if="videoUrl" 
                                            ref="canvasRef" 
                                            class="annotation-canvas" 
                                            :class="{ 'annotation-mode': isAnnotationMode }"
                                            @mousedown="startDrawing" 
                                            @mousemove="draw" 
                                            @mouseup="stopDrawing"
                                            @mouseleave="stopDrawing"></canvas>
                                            
                                        <!-- Add loading overlay during video upload -->
                                        <div class="video-loading-overlay" v-if="videoUploadingLoading">
                                            <a-spin />
                                            <div class="loading-text">{{ $t('groundImagery.uploadingVideo') }}</div>
                                        </div>
                                    </div>
                                    <div v-if="lineCoordinates.length >= 2" class="annotation-info">
                                        <p>{{ $t('groundImagery.annotationLine') }}</p>
                                        <div class="coordinate-inputs">
                                            <div class="coordinate-group">
                                                <span class="coord-label">{{ $t('groundImagery.start') }}</span>
                                                <div class="input-pair">
                                                    <a-input-number 
                                                        v-model="editableStartX" 
                                                        :min="0" 
                                                        :max="videoMetadata.width"
                                                        :precision="2"
                                                        @change="updateLineFromCoordinates" 
                                                        size="small" 
                                                        class="coord-input" />
                                                    <span>,</span>
                                                    <a-input-number 
                                                        v-model="editableStartY" 
                                                        :min="0" 
                                                        :max="videoMetadata.height"
                                                        :precision="2"
                                                        @change="updateLineFromCoordinates" 
                                                        size="small" 
                                                        class="coord-input" />
                                                </div>
                                            </div>
                                            <div class="coordinate-group">
                                                <span class="coord-label">{{ $t('groundImagery.end') }}</span>
                                                <div class="input-pair">
                                                    <a-input-number 
                                                        v-model="editableEndX" 
                                                        :min="0" 
                                                        :max="videoMetadata.width"
                                                        :precision="2"
                                                        @change="updateLineFromCoordinates" 
                                                        size="small" 
                                                        class="coord-input" />
                                                    <span>,</span>
                                                    <a-input-number 
                                                        v-model="editableEndY" 
                                                        :min="0" 
                                                        :max="videoMetadata.height"
                                                        :precision="2"
                                                        @change="updateLineFromCoordinates" 
                                                        size="small" 
                                                        class="coord-input" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <a-card :title="$t('groundImagery.videoProcessing')">
                                        <a-form :model="videoOptions" layout="vertical">
                                            <a-form-item :label="$t('groundImagery.options.frameRate')">
                                                <a-input-number v-model="videoOptions.frameRate" :min="1" :max="60" disabled />
                                            </a-form-item>

                                            <a-form-item :label="$t('groundImagery.options.extractionType')">
                                                <a-select v-model="videoOptions.extractionType">
                                                    <!-- <a-option value="frames">{{ $t('groundImagery.options.frames') }}</a-option> -->
                                                    <a-option value="objects">{{ $t('groundImagery.options.objects') }}</a-option>
                                                    <!-- <a-option value="tracking">{{ $t('groundImagery.options.tracking') }}</a-option> -->
                                                </a-select>
                                            </a-form-item>

                                            <a-form-item>
                                                <a-alert 
                                                    v-if="lineCoordinates.length === 0" 
                                                    type="warning" 
                                                    :content="$t('groundImagery.annotationRequired')" 
                                                    style="text-align: center;">
                                                    {{ $t('groundImagery.annotationRequired') }}
                                                </a-alert>
                                                <a-button type="primary" long @click="processVideo" :disabled="lineCoordinates.length === 0" :loading="videoProcessingLoading">
                                                    {{ $t('groundImagery.processVideoBtn') }}
                                                </a-button>
                                            </a-form-item>
                                        </a-form>
                                    </a-card>
                                </div>

                                <!-- Processed Video Results Section -->
                                <div v-if="processedVideo" class="processed-video-section">
                                    <a-divider>
                                        <div class="divider-title">
                                            <icon-check-circle-fill :style="{ color: 'rgb(var(--success-6))' }" />
                                            <span>{{ $t('groundImagery.processedVideoResults') }}</span>
                                        </div>
                                    </a-divider>
                                    
                                    <div class="processed-video-container">
                                        <video 
                                            ref="processedVideoRef"
                                            controls
                                            class="processed-video-player"
                                            :src="processedVideo.url"
                                        ></video>
                                        
                                        <div class="processed-video-info">
                                            <div class="video-title">{{ processedVideo.name || $t('groundImagery.processedVideo') }}</div>
                                            <div class="video-controls">
                                                <a-button 
                                                    type="primary" 
                                                    @click="downloadProcessedVideo"
                                                    class="video-download-btn"
                                                >
                                                    <template #icon><icon-download /></template>
                                                    {{ $t('groundImagery.downloadProcessedVideo') }}
                                                </a-button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </a-tab-pane>
                    </a-tabs>
                </a-card>
            </a-col>

            <!-- History section - Right side column -->
            <a-col :span="5">
                <GroundHistory ref="groundHistoryRef" @view-result="handleViewResult" />
            </a-col>
        </a-row>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import { useI18n } from 'vue-i18n';
import { uploadVideos, processGroundImages, processGroundVideo } from '@/api/upload';
import ImageUploader from '../workplace/components/image-uploader.vue';
import GroundHistory from './components/ground-history.vue';
import type { HistoryItem } from './components/ground-history.vue';

const { t: $t } = useI18n();
// Ground history reference
const groundHistoryRef = ref<InstanceType<typeof GroundHistory> | null>(null);
// Images processing
const selectedImages = ref<File[]>([]);
const imageUploadResults = ref<any[]>([]);
const processingOptions = reactive({
    extractionType: 'objects',
    quality: 7,
    algorithm_type: 'ground'
});
const processedImages = ref<any[]>([]);
const processingLoading = ref(false);
const imagesUploadingLoading = ref(false); // New: loading state for image uploads

const handleImagesUploaded = (images: File[], uploadResults?: any[]) => {
    // Prevent duplicate uploads if already processing
    if (imagesUploadingLoading.value) {
        return;
    }
    
    imagesUploadingLoading.value = true;
    
    try {
        selectedImages.value = images;
        console.log('Images uploaded in Ground Imagery component:', images.length);
        if (uploadResults && uploadResults.length > 0) {
            console.log('Upload results:', uploadResults[0]);
            // Store the upload results for later use
            imageUploadResults.value = uploadResults;
        }
    } finally {
        imagesUploadingLoading.value = false;
    }
};

// Handle viewing result from history
const handleViewResult = (item: HistoryItem) => {
    // Implement any additional logic needed when viewing a result from history
    Message.info(`Viewing result: ${item.name || 'Unnamed'}`);
};

const processImages = async () => {
    try {
        if (!selectedImages.value.length) {
            Message.warning($t('groundImagery.noImagesSelected'));
            return;
        }
        
        processingLoading.value = true;
        
        // Show processing message
        Message.loading($t('groundImagery.processing'));
        
        // Extract image paths from the stored upload results
        const imagePaths: string[] = [];
        
        if (imageUploadResults.value && imageUploadResults.value.length > 0) {
            const result = imageUploadResults.value[0];
            
            // Check for data structure containing image paths
            if (result && result.data) {
                const resultData = result.data;
                
                // Check if it's an array of image data
                if (Array.isArray(resultData)) {
                    resultData.forEach(item => {
                        if (item.path) imagePaths.push(item.path);
                    });
                }
                // Check if it has a data property that's an array
                else if (resultData.data && Array.isArray(resultData.data)) {
                    resultData.data.forEach(item => {
                        if (item.path) imagePaths.push(item.path);
                    });
                }
                // Check if it has a path directly
                else if (resultData.path) {
                    imagePaths.push(resultData.path);
                }
            }
        }
        
        if (imagePaths.length === 0) {
            Message.error($t('groundImagery.noPaths'));
            return;
        }
        
        console.log('Image paths to process:', imagePaths);
        
        // Call the ground image processor API
        const response = await processGroundImages(
            imagePaths,
            'Ground Image Processing', // Task name
            processingOptions.algorithm_type, // Algorithm type
        );
        
        // Handle the response
        if (response && response.status === 200) {
            Message.success($t('groundImagery.processSuccess'));
            console.log('Processing response:', response.data);
            
            // Update processed images
            processedImages.value = response.data.results.map((result: any) => ({
                url: result.result_url,
                filename: result.filename
            }));
            
            // After processing is complete, refresh the history component
            if (groundHistoryRef.value) {
                await groundHistoryRef.value.fetchGroundImageryHistory();
                
                // Get the latest processed item and view it automatically
                if (response.data && response.data.task_id) {
                    // Give a slight delay to ensure history is updated
                    setTimeout(() => {
                        // Find the item by task_id
                        const processedItem = groundHistoryRef.value?.historyItems.find(
                            item => item.id === response.data.task_id
                        );
                        
                        if (processedItem) {
                            // Call view result to display the processed images
                            handleViewResult(processedItem);
                        } else if (response.data.results && response.data.results.length > 0) {
                            // If we can't find the item in history, but we have results in the response,
                            // create a temporary item to view
                            const tempItem: HistoryItem = {
                                id: response.data.task_id,
                                type: 'image',
                                timestamp: new Date(),
                                imageUrl: response.data.results[0].result_url, // Use the first result URL
                                name: response.data.task_name || 'Ground Image Processing',
                                targetCount: response.data.results.length
                            };
                            handleViewResult(tempItem);
                            
                            // If we have an image viewer available, directly show the first processed image
                            const imageViewer = document.querySelector('image-viewer');
                            if (imageViewer && typeof (imageViewer as any).open === 'function') {
                                (imageViewer as any).open(response.data.results[0].result_url);
                            }
                        }
                    }, 500);
                }
            }
        } else {
            throw new Error(response?.data?.message || $t('groundImagery.processFailed'));
        }
    } catch (error: any) {
        console.error('Error processing ground images:', error);
        Message.error(error.message || $t('groundImagery.processFailed'));
    } finally {
        processingLoading.value = false;
    }
};

const shortenFilename = (filename: string): string => {
    if (filename.length > 20) {
        return `${filename.slice(0, 10)}...${filename.slice(-10)}`;
    }
    return filename;
};

const viewProcessedImage = (image: any) => {
    console.log('Viewing processed image:', image);
    // Use the image viewer component to display the processed image
    const imageViewer = document.querySelector('image-viewer');
    if (imageViewer && typeof (imageViewer as any).open === 'function') {
        (imageViewer as any).open(image.url);
    } else {
        // Fallback: open in new tab
        window.open(image.url, '_blank');
    }
};

const downloadProcessedImage = async (image: any) => {
    console.log('Downloading processed image:', image);

    try {
        // Fetch the file as a Blob
        const response = await fetch(image.url);
        if (!response.ok) {
            throw new Error('Failed to fetch the file');
        }
        const blob = await response.blob();

        // Create a temporary anchor element to download the file
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = image.filename || 'processed-image.png';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl); // Release the object URL
        }, 100);

        Message.success($t('groundImagery.downloadStarted'));
    } catch (error : any) {
        console.error('Error downloading the file:', error);
        Message.error(error.message || $t('groundImagery.downloadFailed'));
    }
};

// Video processing
const videoList = ref<any[]>([]);
const videoUrl = ref('');
const videoOptions = reactive({
    frameRate: 60,
    extractionType: 'objects'
});
const uploadLoading = ref(false);
const uploadResults = ref<any>(null);
const processedVideo = ref<any>(null);
const processedVideoBlobUrl = ref<string | null>(null); // New: Blob URL for processed video
const videoProcessingLoading = ref(false);
const videoUploadingLoading = ref(false); // New: loading state for video uploads

// Canvas and annotation variables
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const videoContainerRef = ref<HTMLDivElement | null>(null);
const processedVideoRef = ref<HTMLVideoElement | null>(null);
const isDrawing = ref(false);
const isAnnotationMode = ref(false);
const autoExtendLine = ref(true); // 默认启用自动延长线功能
const lineCoordinates = ref<{x: number, y: number}[]>([]);
const videoMetadata = ref<{width: number, height: number}>({width: 0, height: 0});
const editableStartX = ref(0);
const editableStartY = ref(0);
const editableEndX = ref(0);
const editableEndY = ref(0);

// Watch for changes in lineCoordinates to update editable coordinates
watch(lineCoordinates, (newCoords) => {
    if (newCoords.length >= 2) {
        editableStartX.value = parseFloat(newCoords[0].x.toFixed(2));
        editableStartY.value = parseFloat(newCoords[0].y.toFixed(2));
        editableEndX.value = parseFloat(newCoords[1].x.toFixed(2));
        editableEndY.value = parseFloat(newCoords[1].y.toFixed(2));
    }
}, { deep: true });

const toggleAnnotationMode = () => {
    isAnnotationMode.value = !isAnnotationMode.value;
    // If exiting annotation mode, ensure any ongoing drawing is canceled
    if (!isAnnotationMode.value) {
        isDrawing.value = false;
    }
};

const clearCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const clearAnnotation = () => {
    lineCoordinates.value = [];
    clearCanvas();
};

const customRequest = async (options: any) => {
    console.log('customRequest options:', options);
    
    // The file structure might be different in the ArcoVue component
    let uploadFile;
    
    // Check different possible locations for the file
    if (options.file) {
        uploadFile = options.file;
    } else if (options.fileItem && options.fileItem.file) {
        uploadFile = options.fileItem.file;
    } else if (options.fileItem) {
        uploadFile = options.fileItem;
    }
    
    console.log('Upload file found:', uploadFile);
    
    if (!uploadFile) {
        console.error('No valid file found in options:', options);
        if (options.onError) options.onError(new Error('No valid file found'));
        Message.error('No valid file found for upload');
        return;
    }
    
    try {
        uploadLoading.value = true;
        videoUploadingLoading.value = true;
        
        // Use the uploadVideos function to upload the file
        const result = await uploadVideos([uploadFile]);
        console.log('Upload result:', result);
        
        uploadResults.value = result.data;
        Message.success(result.data.msg || 'Video uploaded successfully');
        if (options.onSuccess) options.onSuccess();
        
        // Reset annotation when a new video is uploaded
        clearAnnotation();

        // Refresh history after upload
        if (groundHistoryRef.value) {
            groundHistoryRef.value.fetchGroundImageryHistory();
        }
    } catch (error: any) {
        console.error('Video upload failed:', error);
        Message.error(error.message || 'Failed to upload video');
        if (options.onError) options.onError(error);
    } finally {
        uploadLoading.value = false;
        videoUploadingLoading.value = false;
    }
};

const handleVideoChange = (fileList: any) => {
    videoList.value = fileList;

    if (fileList.length > 0 && fileList[0].file) {
        videoUrl.value = URL.createObjectURL(fileList[0].file);
        // Reset annotations when video changes
        clearAnnotation();
    } else {
        videoUrl.value = '';
    }
};

const setupCanvas = () => {
    const video = videoRef.value;
    const canvas = canvasRef.value;
    const container = videoContainerRef.value;
    
    if (!video || !canvas || !container) return;
    
    // 根据视频原始比例调整容器大小
    if (videoMetadata.value.width && videoMetadata.value.height) {
        const { width, height } = videoMetadata.value;
        const aspectRatio = width / height;
        const maxWidth = container.clientWidth;
        const maxHeight = 400; // 最大高度限制
        
        let displayWidth = maxWidth;
        let displayHeight = displayWidth / aspectRatio;
        
        // 如果高度超出最大限制，则按高度计算宽度
        if (displayHeight > maxHeight) {
            displayHeight = maxHeight;
            displayWidth = displayHeight * aspectRatio;
        }
        
        // 设置视频大小
        video.style.width = `${displayWidth}px`;
        video.style.height = `${displayHeight}px`;
        
        // 设置canvas大小匹配视频显示大小
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    } else {
        // 如果没有视频元数据，使用视频元素的显示尺寸
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
    }
    
    console.log('Canvas setup:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        displayWidth: video.clientWidth,
        displayHeight: video.clientHeight,
        aspectRatio: video.videoWidth / video.videoHeight
    });
    
    // 清除现有的标注
    clearCanvas();
};

const handleVideoLoaded = () => {
    const video = videoRef.value;
    if (!video) return;
    
    // Store the original video dimensions
    const { videoWidth: width, videoHeight: height } = video;
    videoMetadata.value = { width, height };
    
    nextTick(() => {
        // Setup canvas
        setupCanvas();
    });
};

// 计算线条与视频边缘的交点
const calculateEdgeIntersection = (x1: number, y1: number, x2: number, y2: number) => {
    const { width, height } = videoMetadata.value;
    
    // 计算线的方向向量和斜率
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // 打印调试信息
    console.log('计算边缘交点:', { 
        point1: { x: x1, y: y1 }, 
        point2: { x: x2, y: y2 }, 
        videoSize: { width, height } 
    });
    
    // 无限延长线的两端与四条边的交点
    // 即求解 x = 0, x = width, y = 0, y = height 与原线直线方程的交点
    const intersections: { x: number; y: number }[] = [];
    
    // 如果线是垂直的
    if (Math.abs(dx) < 0.0001) {
        // 与顶部和底部边界的交点
        intersections.push({ x: x1, y: 0 });
        intersections.push({ x: x1, y: height });
    } 
    // 如果线是水平的
    else if (Math.abs(dy) < 0.0001) {
        // 与左侧和右侧边界的交点
        intersections.push({ x: 0, y: y1 });
        intersections.push({ x: width, y: y1 });
    }
    // 一般情况，线有斜率
    else {
        // 计算直线方程 y = k*x + b
        const k = dy / dx;
        const b = y1 - k * x1;
        
        // 与左侧边界 x=0 的交点
        const leftY = b;
        if (leftY >= 0 && leftY <= height) {
            intersections.push({ x: 0, y: leftY });
        }
        
        // 与右侧边界 x=width 的交点
        const rightY = k * width + b;
        if (rightY >= 0 && rightY <= height) {
            intersections.push({ x: width, y: rightY });
        }
        
        // 与顶部边界 y=0 的交点
        const topX = -b / k;
        if (topX >= 0 && topX <= width) {
            intersections.push({ x: topX, y: 0 });
        }
        
        // 与底部边界 y=height 的交点
        const bottomX = (height - b) / k;
        if (bottomX >= 0 && bottomX <= width) {
            intersections.push({ x: bottomX, y: height });
        }
    }
    
    console.log('找到的所有边缘交点:', intersections);
    
    // 我们最多应该有2个交点
    if (intersections.length < 2) {
        console.log('找到的交点不足两个，无法延伸线条');
        return null;
    }
    
    // 返回找到的两个边缘交点
    return [intersections[0], intersections[1]];
};

// 将线条延长到视频边缘
const extendLineToEdges = () => {
    if (lineCoordinates.value.length < 2) {
        console.log('没有足够的点来延伸线条');
        return;
    }
    
    // 如果不启用自动延长，则不执行延长操作
    if (!autoExtendLine.value) {
        console.log('自动延长线功能已关闭');
        return;
    }
    
    const [startPoint, endPoint] = lineCoordinates.value;
    console.log('准备延伸线条:', { startPoint, endPoint });
    
    // 计算与边缘的交点
    const edgePoints = calculateEdgeIntersection(
        startPoint.x, startPoint.y, endPoint.x, endPoint.y
    );
    
    if (edgePoints) {
        const [point1, point2] = edgePoints;
        console.log('找到边缘交点:', { point1, point2 });
        
        // 更新线条坐标为边缘交点
        lineCoordinates.value[0] = { x: point1.x, y: point1.y };
        lineCoordinates.value[1] = { x: point2.x, y: point2.y };
        
        // 更新可编辑坐标
        editableStartX.value = parseFloat(point1.x.toFixed(2));
        editableStartY.value = parseFloat(point1.y.toFixed(2));
        editableEndX.value = parseFloat(point2.x.toFixed(2));
        editableEndY.value = parseFloat(point2.y.toFixed(2));
        
        console.log('线条已延伸到边缘:', lineCoordinates.value);
    } else {
        console.log('无法延伸线条到边缘');
    }
};

const drawSavedLine = () => {
    if (!lineCoordinates.value || lineCoordinates.value.length < 2 || !canvasRef.value) return;
    
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    
    clearCanvas();
    
    const scaleX = videoMetadata.value.width / canvasRef.value.width;
    const scaleY = videoMetadata.value.height / canvasRef.value.height;
    
    console.log('Drawing saved line with scale factors:', { scaleX, scaleY });
    console.log('Line coordinates:', lineCoordinates.value);
    console.log('Canvas dimensions:', { 
        width: canvasRef.value.width, 
        height: canvasRef.value.height 
    });
    console.log('Video metadata:', videoMetadata.value);
    
    // Draw the saved line
    ctx.beginPath();
    // Convert the stored coordinates back to canvas display coordinates
    const [start, end] = lineCoordinates.value;
    const startX = (start?.x || 0) / scaleX;
    const startY = (start?.y || 0) / scaleY;
    const endX = (end?.x || 0) / scaleX;
    const endY = (end?.y || 0) / scaleY;
    
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
};

// 处理自动延长线开关变更
const handleAutoExtendChange = () => {
    if (autoExtendLine.value && lineCoordinates.value.length === 2) {
        // 如果开启了自动延长并且已有线条，则延长现有线条
        extendLineToEdges();
        drawSavedLine();
    }
};

const updateLineFromCoordinates = () => {
    // 使用编辑框中的坐标更新线条
    if (lineCoordinates.value.length >= 2) {
        // 解构赋值获取编辑字段值
        const { value: startX } = editableStartX;
        const { value: startY } = editableStartY;
        const { value: endX } = editableEndX;
        const { value: endY } = editableEndY;
        
        lineCoordinates.value[0].x = startX;
        lineCoordinates.value[0].y = startY;
        lineCoordinates.value[1].x = endX;
        lineCoordinates.value[1].y = endY;
        
        // 延长线条到视频边缘（如果启用了自动延长）
        extendLineToEdges();
        
        // 重新绘制线条
        drawSavedLine();
    }
};

const startDrawing = (event: MouseEvent) => {
    // Only allow drawing in annotation mode
    if (!isAnnotationMode.value || !canvasRef.value) return;
    
    const rect = canvasRef.value.getBoundingClientRect();
    const scaleX = videoMetadata.value.width / canvasRef.value.width;
    const scaleY = videoMetadata.value.height / canvasRef.value.height;
    
    // 使用解构赋值获取事件坐标和矩形位置
    const { clientX, clientY } = event;
    const { left, top } = rect;
    
    // Match the coordinates to the mouse position on canvas
    const canvasX = clientX - left;
    const canvasY = clientY - top;
    
    // Store coordinates in original video resolution 
    const x = canvasX * scaleX;
    const y = canvasY * scaleY;
    
    // For debugging
    console.log('Start point:', { 
        clientX, 
        clientY, 
        rectLeft: left, 
        rectTop: top,
        canvasX,
        canvasY,
        scaledX: x, 
        scaledY: y,
        scaleFactors: { scaleX, scaleY }
    });
    
    lineCoordinates.value = [{x, y}];
    isDrawing.value = true;
};

const draw = (event: MouseEvent) => {
    // Only allow drawing in annotation mode
    if (!isAnnotationMode.value || !isDrawing.value || !canvasRef.value || !lineCoordinates.value || lineCoordinates.value.length !== 1) return;
    
    const rect = canvasRef.value.getBoundingClientRect();
    const scaleX = videoMetadata.value.width / canvasRef.value.width;
    const scaleY = videoMetadata.value.height / canvasRef.value.height;
    
    // Only clear and draw if needed
    clearCanvas();
    
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    
    // Draw temporary line while dragging - use consistent coordinate calculations
    ctx.beginPath();
    
    // 使用解构赋值获取事件坐标和矩形位置
    const { clientX, clientY } = event;
    const { left, top } = rect;
    
    // Convert the stored start point back to canvas coordinates
    const startX = (lineCoordinates.value[0]?.x || 0) / scaleX;
    const startY = (lineCoordinates.value[0]?.y || 0) / scaleY;
    
    // Calculate current position in canvas coordinates, not applying the scale to the current point
    const currentX = clientX - left;
    const currentY = clientY - top;
    
    ctx.moveTo(startX, startY);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
};

const stopDrawing = (event: MouseEvent) => {
    // Only allow drawing in annotation mode
    if (!isAnnotationMode.value || !isDrawing.value || !canvasRef.value || !lineCoordinates.value || lineCoordinates.value.length !== 1) {
        isDrawing.value = false;
        return;
    }
    
    const rect = canvasRef.value.getBoundingClientRect();
    const scaleX = videoMetadata.value.width / canvasRef.value.width;
    const scaleY = videoMetadata.value.height / canvasRef.value.height;
    
    // 使用解构赋值获取事件坐标和矩形位置
    const { clientX, clientY } = event;
    const { left, top } = rect;
    
    // Match the coordinates to the mouse position on canvas
    const canvasX = clientX - left;
    const canvasY = clientY - top;
    
    // Store coordinates in original video resolution
    const x = canvasX * scaleX;
    const y = canvasY * scaleY;
    
    // For debugging
    console.log('End point:', { 
        clientX, 
        clientY, 
        rectLeft: left, 
        rectTop: top,
        canvasX,
        canvasY,
        scaledX: x, 
        scaledY: y,
        scaleFactors: { scaleX, scaleY }
    });
    
    // Add the second point to complete the line
    lineCoordinates.value.push({x, y});
    isDrawing.value = false;
    
    console.log('线条完成，准备延伸', lineCoordinates.value);
    
    // 延长线条到视频边缘并重绘
    nextTick(() => {
        extendLineToEdges();
        drawSavedLine();
    });
};

const formatCoordinate = (value: number | undefined): string => {
    return value !== undefined ? value.toFixed(2) : '0.00';
};

// Handle window resize to adjust canvas
const handleResize = () => {
    if (videoRef.value) {
        setupCanvas();
        if (lineCoordinates.value && lineCoordinates.value.length === 2) {
            drawSavedLine();
        }
    }
};

onMounted(() => {
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

const processVideo = async () => {
    if (videoList.value.length === 0) {
        Message.warning($t('groundImagery.noVideosSelected'));
        return;
    }

    if (!uploadResults.value[0] || !uploadResults.value[0].url) {
        Message.warning($t('groundImagery.waitForUpload'));
        return;
    }
    
    if (!lineCoordinates.value || lineCoordinates.value.length !== 2) {
        Message.warning($t('groundImagery.drawAnnotation'));
        return;
    }

    try {
        videoProcessingLoading.value = true;
        // Show processing message
        Message.loading($t('groundImagery.processing'));
        
        // Extract video path from upload results
        const videoPath = uploadResults.value[0]?.path;
        if (!videoPath) {
            throw new Error($t('groundImagery.noVideoPath'));
        }
        
        // Create annotation line coordinates object
        const annotationLine = {
            startX: Math.round(lineCoordinates.value[0].x),
            startY: Math.round(lineCoordinates.value[0].y),
            endX: Math.round(lineCoordinates.value[1].x),
            endY: Math.round(lineCoordinates.value[1].y)
        };
        
        console.log('Processing video with annotation line:', annotationLine);
        
        // Call the processGroundVideo API function
        const response = await processGroundVideo(
            videoPath,
            annotationLine,
            'Ground Video Processing', // Task name
            videoOptions.extractionType,
            // videoOptions.algorithm_type || 'ground'
        );
        
        // Handle the response
        if (response && response.status === 200) {
            Message.success($t('groundImagery.processSuccess'));
            console.log('Processing response:', response.data);
            
            // Update processed video
            processedVideo.value = {
                url: response.data.results[0].result_url,
                name: response.data.task_name || 'Processed Video'
            };
            
            // After processing is complete, refresh the history component
            if (groundHistoryRef.value) {
                await groundHistoryRef.value.fetchGroundImageryHistory();
                
                // Get the latest processed item and view it automatically
                if (response.data && response.data.task_id) {
                    // Give a slight delay to ensure history is updated
                    setTimeout(() => {
                        // Find the item by task_id
                        const processedItem = groundHistoryRef.value?.historyItems.find(
                            item => item.id === response.data.task_id
                        );
                        
                        if (processedItem) {
                            // Call view result to display the processed video
                            handleViewResult(processedItem);
                        }
                    }, 500);
                }
            }
        } else {
            throw new Error(response?.data?.message || $t('groundImagery.processFailed'));
        }
    } catch (error: any) {
        console.error('Error processing ground video:', error);
        Message.error(error.message || $t('groundImagery.processFailed'));
    } finally {
        videoProcessingLoading.value = false;
    }
};

const downloadProcessedVideo = async () => {
    if (!processedVideo.value || !processedVideo.value.url) {
        Message.warning($t('groundImagery.noProcessedVideo'));
        return;
    }

    try {
        Message.info($t('groundImagery.preparingDownload'));
        
        // 使用已经加载的Blob URL或重新获取视频
        let blob: Blob;
        
        if (processedVideoBlobUrl.value) {
            // 如果已经有Blob URL，从中获取Blob对象
            const response = await fetch(processedVideoBlobUrl.value);
            blob = await response.blob();
        } else {
            // 否则重新获取视频内容
            const response = await fetch(processedVideo.value.url);
            if (!response.ok && response.status !== 206) {
                throw new Error('Failed to fetch video for download');
            }
            blob = await response.blob();
        }

        // 创建下载链接
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = processedVideo.value.name || 'processed-video.mp4';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(objectUrl);
        }, 100);

        Message.success($t('groundImagery.downloadStarted'));
    } catch (error: any) {
        console.error('Error downloading video:', error);
        Message.error(error.message || $t('groundImagery.downloadFailed'));
    }
};
</script>

<style lang="less" scoped>
.container {
    padding: 20px;
}

.general-card {
    margin-bottom: 16px;
}

.processing-section {
    margin-top: 16px;
}

.video-upload-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.video-preview {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.video-controls {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap; /* 允许在小屏幕上换行 */
    align-items: center;
}

.extend-checkbox {
    margin-left: auto; /* 将复选框推到右侧 */
}

.video-container {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0px;
}

.preview-video {
    max-width: 100%;
    max-height: 400px;
    border-radius: 4px;
    background-color: #000;
    object-fit: contain; /* 保持视频的原始宽高比 */
    display: block; /* 消除底部空隙 */
}

.annotation-canvas {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto; /* 居中对齐 */
    pointer-events: none; /* 默认不接收鼠标事件，让视频可以操作 */
    z-index: 1; 
}

.annotation-canvas.annotation-mode {
    cursor: crosshair;
    pointer-events: auto; /* 在标注模式下接收鼠标事件 */
}

.annotation-info {
    margin-bottom: 10px;
    padding: 15px;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    
    p {
        margin: 4px 0;
        font-weight: 500;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        
        &:after {
            content: '(点击坐标可编辑)';
            margin-left: 8px;
            font-size: 12px;
            color: rgba(var(--primary-6), 1);
            font-weight: normal;
            opacity: 0.8;
        }
    }
}

.coordinate-inputs {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.coordinate-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap; /* 在小屏幕上允许换行 */
    
    &:after {
        content: '';
        display: block;
        position: absolute;
        right: -12px;
        width: 16px;
        height: 16px;
        opacity: 0;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23165DFF"><path d="M17.5 12a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm-5 .5c0-.157 0-.313.014-.466A6.9 6.9 0 0 1 11 8.5C11 4.91 13.91 2 17.5 2S24 4.91 24 8.5 21.09 15 17.5 15c-1.086 0-2.1-.262-3-.714V17.5c0 .157 0 .313-.014.466.321-.291.652-.466 1.014-.466h1a1 1 0 0 1 1 1v2h6v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h6v-2a1 1 0 0 1 1-1h1c.366 0 .693.178 1.014.466A4.981 4.981 0 0 0 12.5 12.5zM17.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        transition: all 0.3s ease;
    }
    
    &:hover:after {
        opacity: 0.5;
        right: -16px;
    }
}

.coord-label {
    min-width: 60px;
    font-weight: 500;
    white-space: nowrap;
    position: relative;
    
    &:after {
        content: '';
        display: inline-block;
        width: 14px;
        height: 14px;
        margin-left: 4px;
        vertical-align: middle;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23165DFF"><path d="M15.586 10.586L11.293 6.293a1 1 0 0 0-1.414 1.414l3.293 3.293-3.293 3.293a1 1 0 1 0 1.414 1.414l4.293-4.293a1 1 0 0 0 0-1.414z"/></svg>');
        background-size: contain;
        background-repeat: no-repeat;
        opacity: 0.7;
    }
}

.input-pair {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-grow: 1;
    position: relative;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: rgba(var(--primary-6), 0.05);
    border: 1px dashed rgba(var(--primary-6), 0.3);
    transition: all 0.2s;
    
    &:hover {
        background-color: rgba(var(--primary-6), 0.1);
        border-color: rgba(var(--primary-6), 0.5);
    }
}

.coord-input {
    width: 100px; /* 增加输入框宽度 */
    max-width: calc(50% - 10px); /* 确保两个输入框在一行 */
    font-weight: 500;
    border: 1px solid var(--color-border-2);
    background-color: var(--color-fill-2);
    transition: all 0.2s;
    
    &:hover, &:focus {
        border-color: rgb(var(--primary-6));
        background-color: var(--color-bg-2);
        box-shadow: 0 0 0 2px rgba(var(--primary-6), 0.2);
    }
}

.processed-images-section {
    margin-top: 16px;
}

.divider-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
}

.processed-images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.processed-image-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: transform 0.2s ease;
    
    &:hover {
        transform: scale(1.05);
    }
}

.image-container {
    position: relative;
    width: 100%;
    padding-top: 100%; /* Aspect ratio 1:1 */
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
}

.image-container img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.image-container:hover .image-overlay {
    opacity: 1;
}

.image-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.image-name {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.processed-video-section {
    margin-top: 16px;
}

.processed-video-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
}

.processed-video-player {
    max-width: 100%;
    max-height: 400px;
    border-radius: 4px;
    background-color: #000;
    object-fit: contain;
}

.processed-video-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.video-title {
    font-weight: 500;
    text-align: center;
}

.video-controls {
    display: flex;
    gap: 8px;
}

.video-download-btn {
    margin-top: 8px;
}

.video-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 2;
}

.loading-text {
    margin-top: 8px;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.6);
}
</style>
