<template>
    <a-card class="process-history panel">
        <template #title>
            <div class="card-title">
                <icon-history :style="{ color: 'rgb(var(--arcoblue-6))' }" />
                <span>{{ $t('workplace.processHistory.title') }}</span>
            </div>
        </template>

        <div v-if="loading" class="loading-container">
            <a-spin />
        </div>

        <div v-else-if="!mergedHistoryItems || mergedHistoryItems.length === 0" class="empty-history">
            <a-empty :description="$t('workplace.processHistory.noHistory')" />
        </div>

        <div v-else class="list-wrapper">
            <a-list class="history-list">
                <a-list-item v-for="item in mergedHistoryItems" :key="item.id" class="history-item">
                    <div class="history-item-content">
                        <div class="history-thumbnail" v-if="item.imageUrl">
                            <img :src="item.imageUrl" alt="Result thumbnail" @click="openImageViewer(item)" />
                        </div>
                        <div class="history-thumbnail placeholder" v-else>
                            <icon-file-image />
                        </div>
                        <div class="history-details">
                            <div class="history-type">
                                <a-tag color="arcoblue" v-if="item.type === 'stitch'">
                                    {{ $t('workplace.processHistory.stitch') }}
                                </a-tag>
                                <a-tag color="green" v-else-if="item.type === 'extract'">
                                    {{ $t('workplace.processHistory.extract') }}
                                </a-tag>
                                <a-tag color="orange" v-else-if="item.type === 'upload'">
                                    {{ $t('workplace.processHistory.upload') }}
                                </a-tag>
                                <a-tag color="purple" v-else>{{ item.type }}</a-tag>
                            </div>
                            <div class="history-time">{{ formatTime(item.timestamp) }}</div>
                            <div v-if="item.name" class="history-name">{{ item.name }}</div>
                            <div v-if="item.targetCount" class="history-count">
                                {{ $t('workplace.processHistory.targetsFound', { count: item.targetCount }) }}
                            </div>
                            <div v-if="item.imageCount" class="history-count">
                                {{ $t('workplace.processHistory.imagesUploaded', { count: item.imageCount }) }}
                            </div>
                            <div v-if="item.details" class="history-details-text">
                                {{ truncateDetails(item.details) }}
                            </div>
                        </div>
                    </div>
                    <div class="history-actions">
                        <a-button 
                            type="text" 
                            @click="openImageViewer(item)" 
                        >
                            <template #icon><icon-eye /></template>
                            {{ $t('workplace.processHistory.view') }}
                        </a-button>
                        
                        <!-- Show continue workflow button only for stitch and upload items -->
                        <a-button 
                            v-if="item.type === 'stitch' || item.type === 'upload'"
                            type="text" 
                            @click="onContinueWorkflow(item)"
                            status="success"
                        >
                            <template #icon><icon-arrow-right /></template>
                            {{ $t('workplace.processHistory.continue') }}
                        </a-button>
                    </div>
                </a-list-item>
            </a-list>
        </div>

        <!-- Image Viewer Component -->
        <image-viewer
            ref="imageViewer"
            :title="selectedItem?.name || $t('workplace.processHistory.imagePreview')"
            :default-file-name="getFileName(selectedItem)"
        />
    </a-card>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { Message } from '@arco-design/web-vue';
import { useUserStore } from '@/store';
import { getBaseURL } from '@/utils/env'; // Import the getBaseURL function
import ImageViewer from '@/components/image-viewer/index.vue';

// Get the base API URL from environment configuration
const baseURL = getBaseURL();

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

interface TaskImage {
    filename: string;
    path: string;
    url: string;
}

export interface HistoryItem {
    id: number;
    type: string;
    timestamp: Date;
    imageUrl?: string; // Optional because upload items don't have an image URL
    targetCount?: number;
    imageCount?: number; // Added for upload type
    details?: string; // For upload details or additional info
    name?: string; 
    rawData?: ApiTask; 
    relativeUploadTask?: string; // IDs of related tasks (e.g., upload_task_id for a stitch task)
    relativeStitchTask?: string; // IDs of related tasks (e.g., stitcher_task_id for an upload task)
}

const props = defineProps<{
    historyItems?: HistoryItem[];
}>();

const loading = ref(true);
const apiHistoryItems = ref<HistoryItem[]>([]);
const userStore = useUserStore();
// Define the correct type for the imageViewer ref
const imageViewer = ref<InstanceType<typeof ImageViewer> | null>(null);
const selectedItem = ref<HistoryItem | null>(null);

// Merge API history items with prop history items
const mergedHistoryItems = computed(() => {
    return (props.historyItems || []).concat(apiHistoryItems.value);
});


// Transform API response to component format
const transformApiResponse = (apiTasks: ApiTask[]): HistoryItem[] => {
    return apiTasks.map(task => {
        let type = 'upload';
        if (task.task_type.toLowerCase().includes('stitch')) {
            type = 'stitch';
        } else if (task.task_type.toLowerCase().includes('extract')) {
            type = 'extract';
        }
        
        // Parse the task_data_result string to get the first image URL
        let imageUrl = '';
        let targetCount = 0;
        let imageCount = 0;
        let details = '';
        let relativeUploadTask = '';
        let relativeStitchTask = '';

        // Store related task IDs
        if(task.upload_task){
            relativeUploadTask = task.upload_task;
        }
        if(task.stitcher_task){
            relativeStitchTask = task.stitcher_task;
        }


        try {
            const resultData = JSON.parse(task.task_data_result) as TaskImage[];
            if (resultData && resultData.length > 0) {
                imageUrl = resultData[0].url;
                // For extract tasks, we can assume the number of results might indicate target count
                if (type === 'extract') {
                    targetCount = resultData.length;
                }
                // For upload tasks, count the number of images
                if (type === 'upload') {
                    imageCount = resultData.length;
                    details = task.task_data_input;
                }
            }
        } catch (e) {
            console.error('Error parsing task_data_result:', e);
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
            rawData: task,
            relativeUploadTask,
            relativeStitchTask
        };
    });
};

// Fetch task history from backend API
const fetchTaskHistory = async () => {
    try {
        loading.value = true;
        const { token } = userStore;
        
        const response = await axios.get(`${baseURL}/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`
            },
            params: {
                include_types: 'Upload_Task,Image_Stitcher,Target_Extractor',
            }
        });
        
        if (response.data) {
            apiHistoryItems.value = transformApiResponse(response.data);
        }
    } catch (error) {
        console.error('Error fetching task history:', error);
        Message.error('Failed to load task history');
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
    if (details.length <= maxLength) return details;
    return `${details.substring(0, maxLength)}...`;
};

const emit = defineEmits<{
    (e: 'viewResult', item: HistoryItem): void;
    (e: 'continueWorkflow', item: HistoryItem): void;
}>();

// Get filename for download based on item type and name
const getFileName = (item: HistoryItem | null) => {
    if (!item) return 'image';
    
    let prefix = '';
    switch (item.type) {
        case 'stitch':
            prefix = 'stitched';
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

// Open image viewer with current item
const openImageViewer = (item: HistoryItem) => {
    selectedItem.value = item;
    
    if (imageViewer.value && item.imageUrl) {
        // Now TypeScript will recognize the open method
        imageViewer.value.open(item.imageUrl);
    } else {
        emit('viewResult', item);
    }
};

const onContinueWorkflow = (item: HistoryItem) => {
    emit('continueWorkflow', item);
};

// Fetch task history when component is mounted
onMounted(() => {
    fetchTaskHistory();
});

// Expose methods to parent components
defineExpose({
    fetchTaskHistory
});
</script>

<style lang="less" scoped>
.process-history {
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
    padding-right: 3px; /* 为滚动条预留一点空间 */
    
    // 默认状态下滚动条隐藏
    &::-webkit-scrollbar {
        width: 4px; /* 减小滚动条宽度 */
        background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
        background-color: transparent;
        border-radius: 4px;
        transition: background-color 0.3s ease;
    }
    
    // 鼠标悬停时显示滚动条
    &:hover {
        &::-webkit-scrollbar-thumb {
            background-color: rgba(var(--gray-5), 0.3);
        }
        
        &::-webkit-scrollbar-thumb:hover {
            background-color: rgba(var(--gray-6), 0.5);
        }
    }
    
    // 滚动时强制显示滚动条
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

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
</style>
