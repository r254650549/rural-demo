<template>
    <a-card class="ground-history panel">
        <template #title>
            <div class="card-title">
                <icon-history :style="{ color: 'rgb(var(--arcoblue-6))' }" />
                <span>{{ $t('groundImagery.history.title') }}</span>
            </div>
        </template>

        <div v-if="loading" class="loading-container">
            <a-spin />
        </div>

        <div v-else-if="!historyItems || historyItems.length === 0" class="empty-history">
            <a-empty :description="$t('groundImagery.history.noHistory')" />
        </div>

        <div v-else class="list-wrapper">
            <a-list class="history-list">
                <a-list-item v-for="item in historyItems" :key="item.id" class="history-item">
                    <div class="history-item-content">
                        <div 
                            class="history-thumbnail" 
                            :class="{ 'video-thumbnail': isVideoFile(item.imageUrl) }"
                            v-if="item.imageUrl" 
                            @click="openMediaViewer(item)"
                        >
                            <!-- Show video thumbnail with play button overlay -->
                            <video 
                                v-if="isVideoFile(item.imageUrl)" 
                                :src="item.imageUrl" 
                                preload="metadata" 
                                class="thumbnail-media"
                            ></video>
                            <icon-play-circle-fill 
                                v-if="isVideoFile(item.imageUrl)" 
                                class="play-icon" 
                            />
                            
                            <!-- Show image thumbnail -->
                            <img 
                                v-else
                                :src="item.imageUrl" 
                                alt="Result thumbnail" 
                                class="thumbnail-media"
                            />
                        </div>
                        <div class="history-thumbnail placeholder" v-else>
                            <icon-file-image />
                        </div>
                        <div class="history-details">
                            <div class="history-type">
                                <a-tag color="arcoblue" v-if="item.type === 'image'">
                                    {{ $t('groundImagery.history.extract') }}
                                </a-tag>
                                <a-tag color="green" v-else-if="item.type === 'extract'">
                                    {{ $t('groundImagery.history.extract') }}
                                </a-tag>
                                <a-tag color="orange" v-else-if="item.type === 'upload'">
                                    {{ $t('groundImagery.history.upload') }}
                                </a-tag>
                                <a-tag color="purple" v-else>{{ item.type }}</a-tag>
                            </div>
                            <div class="history-time">{{ formatTime(item.timestamp) }}</div>
                            <div v-if="item.name" class="history-name">{{ item.name }}</div>
                            <div v-if="item.targetCount" class="history-count">
                                {{ $t('groundImagery.history.targetsFound', { count: item.targetCount }) }}
                            </div>
                            <div v-if="item.imageCount" class="history-count">
                                {{ $t('groundImagery.history.imagesUploaded', { count: item.imageCount }) }}
                            </div>
                            <div v-if="item.details" class="history-details-text">
                                {{ truncateDetails(item.details) }}
                            </div>
                        </div>
                    </div>
                    <div class="history-actions">
                        <a-button 
                            type="text" 
                            @click="openMediaViewer(item)" 
                        >
                            <template #icon>
                                <icon-video-camera v-if="isVideoFile(item.imageUrl)" />
                                <icon-eye v-else />
                            </template>
                            {{ isVideoFile(item.imageUrl) ? $t('groundImagery.history.play') : $t('groundImagery.history.view') }}
                        </a-button>
                    </div>
                </a-list-item>
            </a-list>
        </div>

        <!-- Image Viewer Component -->
        <image-viewer
            ref="imageViewer"
            :title="selectedItem?.name || $t('groundImagery.history.imagePreview')"
            :default-file-name="getFileName(selectedItem)"
        />

        <!-- Video Modal for playing videos -->
        <a-modal
            v-model:visible="videoModalVisible"
            :title="selectedItem?.name || $t('groundImagery.history.videoPreview')"
            :footer="false"
            :mask-closable="true"
            unmount-on-close
            :width="800"
            class="video-modal"
        >
            <div class="video-player-container">
                <video 
                    v-if="selectedVideoUrl" 
                    controls 
                    autoplay 
                    class="video-player"
                    ref="videoPlayerRef"
                    :src="selectedVideoUrl"
                ></video>
            </div>
            <template #footer>
                <a-button @click="closeVideoModal">{{ $t('groundImagery.history.close') }}</a-button>
                <a-button type="primary" @click="downloadVideo">
                    <template #icon><icon-download /></template>
                    {{ $t('groundImagery.history.download') }}
                </a-button>
            </template>
        </a-modal>
    </a-card>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { Message } from '@arco-design/web-vue';
import { useUserStore } from '@/store';
import { getBaseURL } from '@/utils/env'; // Import the getBaseURL function
import ImageViewer from '@/components/image-viewer/index.vue';
import { useI18n } from 'vue-i18n';

const {t:$t} = useI18n();
const baseURL = getBaseURL(); // Get the base API URL from environment configuration

interface ApiTask {
    id: number;
    stitcher_task: any;
    task_data_input: string;
    task_data_result: string;
    task_end_time: string;
    task_name: string;
    task_start_time: string;
    task_status: string;
    task_type: string;
    upload_task: any;
}

export interface HistoryItem {
    id: number;
    type: string;
    timestamp: Date;
    imageUrl?: string;
    targetCount?: number;
    imageCount?: number;
    details?: string;
    name?: string; 
    rawData?: ApiTask;
}

interface TaskImage {
    filename: string;
    path: string;
    url: string;
}

const loading = ref(true);
const historyItems = ref<HistoryItem[]>([]);
const userStore = useUserStore();
// Define the correct type for the imageViewer ref
const imageViewer = ref<InstanceType<typeof ImageViewer> | null>(null);
const selectedItem = ref<HistoryItem | null>(null);
const videoModalVisible = ref(false);
const selectedVideoUrl = ref<string | null>(null);
const videoPlayerRef = ref<HTMLVideoElement | null>(null);

// Helper to check if URL is a video file
const isVideoFile = (url?: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
};

// Transform API response to component format
const transformApiResponse = (apiTasks: ApiTask[]): HistoryItem[] => {
    return apiTasks.map(task => {
        let type = 'upload';
        if (task.task_type.toLowerCase().includes('upload')) {
            type = 'upload';
        } else if (task.task_type.toLowerCase().includes('image')) {
            type = 'image';
        } else if (task.task_type.toLowerCase().includes('video')) {
            type = 'extract';
        }
        
        // Parse the task_data_result string to get the first image URL
        let imageUrl = '';
        let targetCount = 0;
        let imageCount = 0;
        let details = '';

        try {
            // First try to parse as a standard result array
            let resultData;
            
            // Clean the JSON string to handle potential invalid characters
            const cleanedResult = task.task_data_result 
            
            try {
                resultData = JSON.parse(cleanedResult) as TaskImage[];
                // Check if it's an array directly
                if (Array.isArray(resultData) && resultData.length > 0) {
                    imageUrl = resultData[0].url? resultData[0].url : resultData[0].result_url;
                    targetCount = resultData.length;
                }
                // Check if it's a complex object with a 'results' array (new API response structure)
                else if (resultData && resultData.results && Array.isArray(resultData.results) && resultData.results.length > 0) {
                    imageUrl = resultData.results[0].result_url || resultData.results[0].url;
                    targetCount = resultData.results.length;
                }
                // For upload tasks, count the number of images
                if (type === 'upload') {
                    if (Array.isArray(resultData)) {
                        imageCount = resultData.length;
                    } else if (resultData && resultData.results && Array.isArray(resultData.results)) {
                        imageCount = resultData.results.length;
                    }
                    details = task.task_data_input;
                }
            } catch (parseError) {
                console.error('Error parsing task_data_result JSON:', parseError);
                
                // If it's not valid JSON, try to see if it's a URL directly
                if (task.task_data_result && 
                    (task.task_data_result.startsWith('http://') || task.task_data_result.startsWith('https://'))) {
                    imageUrl = task.task_data_result;
                }
            }
        } catch (e) {
            console.error('Error processing task_data_result:', e);
        }
        
        return {
            id: task.id,
            type,
            timestamp: new Date(task.task_end_time || task.task_start_time),
            imageUrl,
            targetCount,
            imageCount,
            details,
            name: task.task_name,
            rawData: task
        };
    });
};

// Fetch ground imagery history from backend API
const fetchGroundImageryHistory = async () => {
    try {
        loading.value = true;
        const { token } = userStore;
        
        const response = await axios.get(`${baseURL}/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: {
                include_types: 'Video_Upload_Task,Video_Processor,Ground_Image_Processor,Ground_Upload_Task',
            }
        });
        
        if (response.data) {
            historyItems.value = transformApiResponse(response.data);
        }
    } catch (error) {
        console.error('Error fetching ground imagery history:', error);
        Message.error('Failed to load history');
    } finally {
        loading.value = false;
    }
};

const formatTime = (date: Date) => {
    // Format timestamp as "Today, 14:32" or "May 15, 14:32"
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
        return `Today, ${timeStr}`;
    }
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
};

// Helper function to truncate long details text
const truncateDetails = (details: string, maxLength = 50) => {
    if (!details || details.length <= maxLength) return details;
    return `${details.substring(0, maxLength)}...`;
};

const emit = defineEmits<{
    (e: 'viewResult', item: HistoryItem): void;
}>();

// Get filename for download based on item type and name
const getFileName = (item: HistoryItem | null) => {
    if (!item) return 'image';
    let prefix = '';
    switch (item.type) {
        case 'image':
            prefix = 'image';
            break;
        case 'extract':
            prefix = 'target';
            break;
        case 'upload':
            prefix = 'image';
            break;
        default:
            prefix = 'result';
    }
    
    const safeName = item.name ? 
        item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 
        `${prefix}_${item.id}`;
        
    return safeName;
};

// Open media viewer based on file type
const openMediaViewer = (item: HistoryItem) => {
    selectedItem.value = item;
    
    if (!item.imageUrl) {
        emit('viewResult', item);
        return;
    }
    
    // If it's a video file, open the video modal
    if (isVideoFile(item.imageUrl)) {
        selectedVideoUrl.value = item.imageUrl;
        videoModalVisible.value = true;
    } 
    // Otherwise, open the image viewer
    else if (imageViewer.value) {
        imageViewer.value.open(item.imageUrl);
    } else {
        emit('viewResult', item);
    }
};

// Close video modal
const closeVideoModal = () => {
    videoModalVisible.value = false;
    if (videoPlayerRef.value) {
        videoPlayerRef.value.pause();
    }
};

// Download the video
const downloadVideo = () => {
    if (!selectedVideoUrl.value) return;
    console.log('Downloading video from URL:', selectedVideoUrl.value);
    const a = document.createElement('a');
    a.href = selectedVideoUrl.value;
    a.download = `${getFileName(selectedItem.value)}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    Message.success($t('groundImagery.history.downloadStarted'));
};

// Fetch task history when component is mounted
onMounted(() => {
    fetchGroundImageryHistory();
});

// Expose methods and properties to parent components
defineExpose({
    fetchGroundImageryHistory,
    historyItems
});
</script>

<style lang="less" scoped>
.ground-history {
    height: 60vh;
    display: flex;
    flex-direction: column;

    :deep(.arco-card-body) {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px 10px 16px 16px;
        overflow: hidden;
    }
}

.card-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.empty-history {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px 0;
}

.list-wrapper {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 3px; /* Space for scrollbar */
    
    // Hide scrollbar by default
    &::-webkit-scrollbar {
        width: 4px;
        background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
        background-color: transparent;
        border-radius: 4px;
        transition: background-color 0.3s ease;
    }
    
    // Show scrollbar on hover
    &:hover {
        &::-webkit-scrollbar-thumb {
            background-color: rgba(var(--gray-5), 0.3);
        }
        
        &::-webkit-scrollbar-thumb:hover {
            background-color: rgba(var(--gray-6), 0.5);
        }
    }
    
    // Show scrollbar when active
    &:active {
        &::-webkit-scrollbar-thumb {
            background-color: rgba(var(--gray-6), 0.5);
        }
    }
}

.history-list {
    width: 100%;
    
    :deep(.arco-list-content) {
        width: 100%;
    }
}

.history-item {
    border-bottom: 1px solid rgb(var(--gray-3));
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    width: 100%;
}

.history-item-content {
    display: flex;
    align-items: center;
    width: 100%;
}

.history-thumbnail {
    width: 60px;
    height: 60px;
    min-width: 60px; /* Prevent shrinking */
    border-radius: 4px;
    overflow: hidden;
    margin-right: 12px;
    border: 1px solid rgb(var(--gray-3));
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative; /* For positioning play icon */
    
    .thumbnail-media {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    &.video-thumbnail {
        background-color: #000;
        
        &:hover .play-icon {
            opacity: 0.9;
            transform: scale(1.1);
        }
    }
    
    .play-icon {
        position: absolute;
        font-size: 28px;
        color: #fff;
        opacity: 0.7;
        transition: all 0.2s ease-in-out;
        filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
    }
    
    &.placeholder {
        background-color: rgb(var(--gray-2));
        color: rgb(var(--gray-6));
        font-size: 24px;
    }
}

.history-details {
    flex: 1;
    min-width: 0; /* Allow text truncation */
    overflow: hidden;
}

.history-type {
    margin-bottom: 4px;
}

.history-time {
    color: rgb(var(--gray-6));
    font-size: 12px;
    margin-bottom: 4px;
}

.history-name {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-count {
    font-size: 12px;
    color: rgb(var(--gray-8));
}

.history-details-text {
    font-size: 12px;
    color: rgb(var(--gray-7));
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px 0;
}

.video-modal {
    :deep(.arco-modal-content) {
        padding: 0;
    }
    
    :deep(.arco-modal-footer) {
        border-top: 1px solid rgb(var(--gray-3));
        padding: 12px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
    }
}

.video-player-container {
    width: 100%;
    background: #000;
}

.video-player {
    width: 100%;
    max-height: 70vh;
    display: block;
}
</style>